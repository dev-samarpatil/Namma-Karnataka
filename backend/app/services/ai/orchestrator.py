"""AI Provider Orchestrator managing global deadline, sequential failover, and fallback."""

from __future__ import annotations

import asyncio
import time

from app.core.config import settings
from app.core.errors import AppError
from app.core.logging import get_logger, request_id_ctx
from app.repositories.destinations import DestinationRepository, get_destination_repository
from app.schemas.destinations import DestinationFilterParams
from app.schemas.planning import (
    PlanningRecommendationResponse,
    PlanningRequest,
)
from app.services.ai.base import (
    AIProvider,
    AIProviderError,
)
from app.services.ai.fallback import DeterministicFallbackEngine
from app.services.ai.gemini_adapter import GeminiAdapter
from app.services.ai.groq_adapter import GroqAdapter
from app.services.ai.validator import AIValidationError, parse_and_ground_plan
from app.services.budget import BudgetCalculator
from app.services.budget_optimizer import BudgetOptimizer
from app.services.clustering.corridors import get_origin_coordinates, identify_best_corridor
from app.services.destination_discovery import get_destination_discovery_service
from app.services.routing.optimizer import RouteOptimizer
from app.services.scheduler import DeterministicScheduler

logger = get_logger("app.services.ai.orchestrator")


class AIOrchestrator:
    """Manages AI provider selection, global timeout budgeting, and failover."""

    def __init__(
        self,
        repository: DestinationRepository | None = None,
        providers: dict[str, AIProvider] | None = None,
    ) -> None:
        self._repository = repository or get_destination_repository()
        if providers is not None:
            self._providers = providers
        else:
            self._providers = {
                "groq": GroqAdapter(),
                "gemini": GeminiAdapter(),
            }

    async def recommend_itinerary(self, request: PlanningRequest) -> PlanningRecommendationResponse:
        """Orchestrate AI recommendation with bounded timeouts and deterministic fallback."""
        if not settings.AI_PLANNING_ENABLED:
            raise AppError(
                code="AI_PLANNING_DISABLED",
                message="AI trip planning feature is currently disabled.",
                status_code=403,
            )

        # 1. Fetch allowlisted candidate catalog from repository
        filter_params = DestinationFilterParams(limit=100, offset=0)
        candidates, total = self._repository.list_destinations(filter_params, published_only=True)

        # Workstream B: Augment catalogue with multi-provider dynamic discovery records
        discovery_svc = get_destination_discovery_service()
        discovered = discovery_svc.discover_destinations(
            categories=request.categories,
            offbeat_only=getattr(request, "is_offbeat_preferred", False),
            limit=25,
        )
        from app.services.destination_uniqueness import (
            _haversine_distance_m,
            get_canonical_destination_id,
            validate_trip_destination_uniqueness,
        )

        existing_canon_ids = {
            get_canonical_destination_id(
                c.id, name=c.name_en, coordinates=c.coordinates, district_code=c.district_code
            )
            for c in candidates
        }
        existing_coords = [
            (c.coordinates.lat, c.coordinates.lon) for c in candidates if c.coordinates
        ]

        for d in discovered:
            d_canon = get_canonical_destination_id(
                d.id,
                name=d.name_en,
                coordinates=(d.latitude, d.longitude),
                district_code=d.district_code,
            )
            if d_canon in existing_canon_ids:
                continue

            # Geodesic duplicate check against existing candidates (<= 500m)
            too_close = False
            for lat, lon in existing_coords:
                if _haversine_distance_m(d.latitude, d.longitude, lat, lon) <= 500.0:
                    too_close = True
                    break
            if too_close:
                continue

            converted = discovery_svc.to_destination_read(d)
            candidates.append(converted)
            existing_canon_ids.add(d_canon)
            existing_coords.append((d.latitude, d.longitude))

        # Workstream A: Apply budget filtering and ranking to prioritize financially feasible attractions
        if getattr(request, "budget_limit_inr", None) and request.budget_limit_inr > 0:
            candidates = BudgetOptimizer.filter_and_rank_by_budget(
                request=request,
                candidates=candidates,
                target_count=len(candidates),
            )

        if not candidates:
            raise AppError(
                code="INSUFFICIENT_DESTINATION_DATA",
                message="No published destinations found in the catalogue to build an itinerary.",
                status_code=422,
            )

        # 2. Determine primary travel corridor based on origin and preferred districts
        origin_coords = get_origin_coordinates(request.origin_label)
        corridor, omitted_districts = identify_best_corridor(
            origin_coords=origin_coords,
            preferred_districts=request.preferred_districts,
            duration_days=request.duration_days,
        )

        corridor_warnings: list[str] = []
        if omitted_districts:
            omitted_str = ", ".join(omitted_districts)
            if request.language == "kn":
                corridor_warnings.append(
                    f"ಆಯ್ಕೆಮಾಡಿದ ಜಿಲ್ಲೆಗಳು ಪರಸ್ಪರ ಅತಿ ದೂರದಲ್ಲಿವೆ. {request.duration_days} "
                    f"ದಿನಗಳ ಪ್ರವಾಸಕ್ಕಾಗಿ ದಿನಕ್ಕೆ ೪ ಗಂಟೆಗಿಂತ ಹೆಚ್ಚು ಚಾಲನೆ ತಪ್ಪಿಸಲು ಪ್ರವಾಸವನ್ನು "
                    f"'{corridor.name_kn}' ಸರ್ಕ್ಯೂಟ್‌ಗೆ ಸೀಮಿತಗೊಳಿಸಲಾಗಿದೆ. "
                    f"ಉಳಿದ ಜಿಲ್ಲೆಗಳು ({omitted_str}) ಭೇಟಿ ನೀಡಲು ದಿನಗಳನ್ನು ವಿಸ್ತರಿಸಿ."
                )
            else:
                corridor_warnings.append(
                    f"Selected districts span distant regions of Karnataka. For a "
                    f"{request.duration_days}-day trip from {request.origin_label}, the "
                    f"itinerary is focused on the '{corridor.name_en}' to prevent excessive "
                    f"daily driving (>4 hrs). Omitted districts: {omitted_str}."
                )

        # Pre-filter candidates presented to AI: prioritize corridor destinations
        corridor_candidates = [c for c in candidates if c.district_code in corridor.districts]
        prompt_candidates = corridor_candidates if len(corridor_candidates) >= 5 else candidates

        # 3. Determine provider order (Primary Gemini -> Secondary Gemini -> Groq -> Deterministic)
        preferred = settings.AI_PREFERRED_PROVIDER.lower()
        provider_order: list[str] = [preferred]
        for name in ("gemini", "groq"):
            if name not in provider_order:
                provider_order.append(name)

        # 4. Initialize Global Deadline Timer & Observability Audit Log
        start_time = time.monotonic()
        global_deadline = float(settings.AI_GLOBAL_DEADLINE_SECONDS)
        max_call_timeout = float(settings.AI_PROVIDER_TIMEOUT_SECONDS)
        req_id = request_id_ctx.get()
        fallback_audit_log: list[dict[str, str | float]] = []

        for provider_name in provider_order:
            provider = self._providers.get(provider_name)
            if not provider or not provider.is_configured:
                continue

            elapsed = time.monotonic() - start_time
            remaining_deadline = global_deadline - elapsed

            # If remaining time is less than minimum viable threshold (2s), break to fallback
            if remaining_deadline <= 2.0:
                logger.warning(
                    "Global deadline nearly exhausted (%.1fs remaining). Halting provider calls. (req_id=%s)",
                    remaining_deadline,
                    req_id,
                )
                fallback_audit_log.append(
                    {
                        "provider": provider_name,
                        "failure_category": "DEADLINE_EXHAUSTED",
                        "duration_seconds": round(elapsed, 2),
                    }
                )
                break

            call_timeout = min(remaining_deadline, max_call_timeout)
            logger.info(
                "Attempting provider '%s' with timeout %.1fs (req_id=%s)",
                provider_name,
                call_timeout,
                req_id,
            )

            provider_start = time.monotonic()
            try:
                raw_text = await asyncio.wait_for(
                    provider.generate_plan(
                        request=request,
                        candidates=prompt_candidates,
                        timeout_seconds=call_timeout,
                    ),
                    timeout=call_timeout,
                )

                # Validate schema and ground against curated catalog
                raw_grounded_items = parse_and_ground_plan(
                    raw_text=raw_text,
                    candidates=prompt_candidates,
                    language=request.language,
                )

                call_duration = round(time.monotonic() - provider_start, 2)
                model_used = getattr(provider, "last_model_used", None) or "default"
                logger.info(
                    "Provider '%s' (model: '%s') successfully generated and grounded %d stops in %.2fs (req_id=%s)",
                    provider_name,
                    model_used,
                    len(raw_grounded_items),
                    call_duration,
                    req_id,
                )
                fallback_audit_log.append(
                    {
                        "provider": provider_name,
                        "model": model_used,
                        "status": "success",
                        "duration_seconds": call_duration,
                    }
                )

                # Post-AI Geographic Optimization:
                # Ensure Day 1 starts at origin and sequential continuity
                grounded_items = RouteOptimizer.optimize_ai_selection(
                    request=request,
                    ai_items=raw_grounded_items,
                    candidates=candidates,
                    corridor=corridor,
                )

                days, schedule_warnings, assumptions = DeterministicScheduler.build_schedule(
                    request=request, destinations=grounded_items
                )
                budget = BudgetCalculator.calculate_budget(
                    request=request, days=days, destinations=grounded_items
                )

                # Active budget optimization pass
                if not budget.is_budget_feasible and (
                    getattr(request, "strict_budget", False)
                    or (request.budget_limit_inr and request.budget_limit_inr > 0)
                ):
                    opt_days, opt_items, opt_budget, was_optimized = (
                        BudgetOptimizer.optimize_itinerary_for_budget(
                            request=request,
                            destinations=grounded_items,
                            days=days,
                            budget=budget,
                            candidates=candidates,
                        )
                    )
                    if was_optimized:
                        days = opt_days
                        grounded_items = opt_items
                        budget = opt_budget
                        schedule_warnings.append(
                            "Itinerary actively optimized to fit within your specified budget limit."
                        )

                all_warnings = corridor_warnings + schedule_warnings
                provider_display = (
                    f"{provider_name} ({model_used})" if model_used != "default" else provider_name
                )

                fest_seen = set()
                trip_festivals = []
                for d in days:
                    for ev in getattr(d, "recommended_events", []):
                        if ev.event_id not in fest_seen:
                            fest_seen.add(ev.event_id)
                            trip_festivals.append(ev)

                if not trip_festivals:
                    from app.services.karnataka_events import get_karnataka_events_service

                    k_events = get_karnataka_events_service().match_trip_events(
                        start_date=request.start_date,
                        duration_days=request.duration_days,
                        corridor_districts=corridor.districts,
                        destination_coordinates=[
                            (item.coordinates.lat, item.coordinates.lon)
                            for item in grounded_items
                            if getattr(item, "coordinates", None)
                        ],
                    )
                    for kev in k_events:
                        if kev.id not in fest_seen:
                            fest_seen.add(kev.id)
                            trip_festivals.append(kev.to_event_read())

                ai_response = PlanningRecommendationResponse(
                    request_id=req_id,
                    language=request.language,
                    generation_mode="ai",
                    provider_used=provider_display,
                    items=grounded_items,
                    total_destinations=len(grounded_items),
                    duration_days=request.duration_days,
                    days=days,
                    budget_breakdown=budget,
                    origin_label=request.origin_label,
                    corridor_name=corridor.name_en,
                    recommended_festivals=trip_festivals,
                    assumptions=assumptions,
                    data_limitations=[],
                    warnings=all_warnings,
                )
                _, _, validated_response = validate_trip_destination_uniqueness(
                    ai_response, repair=True, request=request
                )
                return validated_response

            except TimeoutError as exc:
                call_duration = round(time.monotonic() - provider_start, 2)
                logger.warning(
                    "Provider '%s' timed out after %.1fs (req_id=%s): %s",
                    provider_name,
                    call_timeout,
                    req_id,
                    exc,
                )
                fallback_audit_log.append(
                    {
                        "provider": provider_name,
                        "failure_category": "TIMEOUT",
                        "duration_seconds": call_duration,
                    }
                )
                continue
            except (AIProviderError, AIValidationError) as exc:
                call_duration = round(time.monotonic() - provider_start, 2)
                error_code = getattr(exc, "code", "AI_EXECUTION_FAILURE")
                logger.warning(
                    "Provider '%s' failed with %s in %.2fs: %s. Proceeding to next provider or fallback.",
                    provider_name,
                    error_code,
                    call_duration,
                    exc,
                )
                fallback_audit_log.append(
                    {
                        "provider": provider_name,
                        "failure_category": error_code,
                        "duration_seconds": call_duration,
                    }
                )
                continue
            except Exception as exc:
                call_duration = round(time.monotonic() - provider_start, 2)
                logger.exception(
                    "Unexpected error executing provider '%s' in %.2fs: %s",
                    provider_name,
                    call_duration,
                    exc,
                )
                fallback_audit_log.append(
                    {
                        "provider": provider_name,
                        "failure_category": "UNEXPECTED_ERROR",
                        "duration_seconds": call_duration,
                    }
                )
                continue

        # 5. Deterministic Offline Fallback
        logger.warning(
            "All AI providers exhausted. Invoking deterministic fallback engine (attempts=%d, audit=%s, req_id=%s)",
            len(fallback_audit_log),
            fallback_audit_log,
            req_id,
        )
        (
            fallback_items,
            fallback_warnings,
            corridor_result,
        ) = DeterministicFallbackEngine.generate_plan_with_metadata(
            request=request, candidates=candidates
        )

        days, schedule_warnings, assumptions = DeterministicScheduler.build_schedule(
            request=request, destinations=fallback_items
        )
        budget = BudgetCalculator.calculate_budget(
            request=request, days=days, destinations=fallback_items
        )

        # Active budget optimization pass
        if not budget.is_budget_feasible and (
            getattr(request, "strict_budget", False)
            or (request.budget_limit_inr and request.budget_limit_inr > 0)
        ):
            opt_days, opt_items, opt_budget, was_optimized = (
                BudgetOptimizer.optimize_itinerary_for_budget(
                    request=request,
                    destinations=fallback_items,
                    days=days,
                    budget=budget,
                    candidates=candidates,
                )
            )
            if was_optimized:
                days = opt_days
                fallback_items = opt_items
                budget = opt_budget
                schedule_warnings.append(
                    "Itinerary actively optimized to fit within your specified budget limit."
                )

        warning_msg = (
            "AI generation was temporarily unavailable. Recommendations curated using "
            "verified regional catalog."
        )
        if request.language == "kn":
            warning_msg = (
                "ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ (AI) ಸೇವೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲದ ಕಾರಣ, ಪರಿಶೀಲಿಸಿದ ಪ್ರಾದೇಶಿಕ "
                "ಕ್ಯಾಟಲಾಗ್‌ನಿಂದ ಪ್ರವಾಸ ಪಟ್ಟಿಯನ್ನು ರೂಪಿಸಲಾಗಿದೆ."
            )

        all_warnings = [warning_msg] + corridor_warnings + fallback_warnings + schedule_warnings

        fest_seen = set()
        fallback_festivals = []
        for d in days:
            for ev in getattr(d, "recommended_events", []):
                if ev.event_id not in fest_seen:
                    fest_seen.add(ev.event_id)
                    fallback_festivals.append(ev)

        if not fallback_festivals:
            from app.services.karnataka_events import get_karnataka_events_service

            k_events = get_karnataka_events_service().match_trip_events(
                start_date=request.start_date,
                duration_days=request.duration_days,
                corridor_districts=corridor_result.districts,
                destination_coordinates=[
                    (item.coordinates.lat, item.coordinates.lon)
                    for item in fallback_items
                    if getattr(item, "coordinates", None)
                ],
            )
            for kev in k_events:
                if kev.id not in fest_seen:
                    fest_seen.add(kev.id)
                    fallback_festivals.append(kev.to_event_read())

        fallback_response = PlanningRecommendationResponse(
            request_id=req_id,
            language=request.language,
            generation_mode="fallback",
            provider_used="deterministic_fallback",
            items=fallback_items,
            total_destinations=len(fallback_items),
            duration_days=request.duration_days,
            days=days,
            budget_breakdown=budget,
            origin_label=request.origin_label,
            corridor_name=corridor_result.name_en,
            recommended_festivals=fallback_festivals,
            assumptions=assumptions,
            data_limitations=[
                (
                    "Travel times are straight-line terrain-adjusted estimates; "
                    "verify local road routes."
                )
            ],
            warnings=all_warnings,
        )
        _, _, validated_fallback = validate_trip_destination_uniqueness(
            fallback_response, repair=True, request=request
        )
        return validated_fallback

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
from app.services.clustering.corridors import get_origin_coordinates, identify_best_corridor
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

        # 3. Determine provider order (Preferred provider first, then alternative)
        preferred = settings.AI_PREFERRED_PROVIDER.lower()
        provider_order: list[str] = [preferred]
        for name in ("groq", "gemini"):
            if name != preferred:
                provider_order.append(name)

        # 4. Initialize Global Deadline Timer
        start_time = time.monotonic()
        global_deadline = float(settings.AI_GLOBAL_DEADLINE_SECONDS)
        max_call_timeout = float(settings.AI_PROVIDER_TIMEOUT_SECONDS)
        req_id = request_id_ctx.get()

        for provider_name in provider_order:
            provider = self._providers.get(provider_name)
            if not provider or not provider.is_configured:
                continue

            elapsed = time.monotonic() - start_time
            remaining_deadline = global_deadline - elapsed

            # If remaining time is less than minimum viable threshold (2s), break to fallback
            if remaining_deadline <= 2.0:
                logger.warning(
                    "Global deadline nearly exhausted (%.1fs remaining). Halting provider calls.",
                    remaining_deadline,
                )
                break

            call_timeout = min(remaining_deadline, max_call_timeout)
            logger.info(
                "Attempting provider '%s' with timeout %.1fs (req_id=%s)",
                provider_name,
                call_timeout,
                req_id,
            )

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

                logger.info(
                    "Provider '%s' successfully generated and grounded %d stops",
                    provider_name,
                    len(raw_grounded_items),
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

                all_warnings = corridor_warnings + schedule_warnings

                return PlanningRecommendationResponse(
                    request_id=req_id,
                    language=request.language,
                    generation_mode="ai",
                    provider_used=provider_name,
                    items=grounded_items,
                    total_destinations=len(grounded_items),
                    duration_days=request.duration_days,
                    days=days,
                    budget_breakdown=budget,
                    origin_label=request.origin_label,
                    corridor_name=corridor.name_en,
                    assumptions=assumptions,
                    data_limitations=[],
                    warnings=all_warnings,
                )

            except TimeoutError as exc:
                logger.warning(
                    "Provider '%s' timed out after %.1fs (req_id=%s): %s",
                    provider_name,
                    call_timeout,
                    req_id,
                    exc,
                )
                continue
            except (AIProviderError, AIValidationError) as exc:
                error_code = getattr(exc, "code", "AI_EXECUTION_FAILURE")
                logger.warning(
                    "Provider '%s' failed with %s: %s. Proceeding to next provider or fallback.",
                    provider_name,
                    error_code,
                    exc,
                )
                continue
            except Exception as exc:
                logger.exception(
                    "Unexpected error executing provider '%s': %s",
                    provider_name,
                    exc,
                )
                continue

        # 5. Deterministic Offline Fallback
        logger.info(
            "Invoking deterministic fallback engine for %d-day request (req_id=%s)",
            request.duration_days,
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

        return PlanningRecommendationResponse(
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
            assumptions=assumptions,
            data_limitations=[
                (
                    "Travel times are straight-line terrain-adjusted estimates; "
                    "verify local road routes."
                )
            ],
            warnings=all_warnings,
        )

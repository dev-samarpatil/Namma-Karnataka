"""Deterministic, catalogue-grounded fallback recommendation engine."""

from __future__ import annotations

from app.core.errors import AppError
from app.schemas.destinations import DestinationRead, LanguageCode
from app.schemas.planning import (
    PlanningRequest,
    RecommendedDestination,
)


class DeterministicFallbackEngine:
    """Offline rule-based recommendation planner.

    Guarantees deterministic, catalogue-grounded recommendations without
    hallucinations when remote AI providers fail or time out.
    """

    @staticmethod
    def generate_plan(
        request: PlanningRequest,
        candidates: list[DestinationRead],
    ) -> list[RecommendedDestination]:
        """Generate structured recommendations deterministically from the curated catalog."""
        if not candidates:
            raise AppError(
                code="INSUFFICIENT_DESTINATION_DATA",
                message=(
                    "No published destinations available in the catalog matching your criteria."
                ),
                status_code=422,
            )

        # 1. Filter candidates by requested preferences
        pool = list(candidates)

        if request.preferred_districts:
            district_matches = [d for d in pool if d.district_code in request.preferred_districts]
            if district_matches:
                pool = district_matches

        if request.categories:
            category_matches = [d for d in pool if d.category in request.categories]
            if category_matches:
                pool = category_matches

        # 2. Check minimum data sufficiency (at least 1 stop per day)
        if len(pool) < request.duration_days:
            # Expand to broader candidates if district/category filters were overly restrictive
            pool = list(candidates)
            if len(pool) < request.duration_days:
                raise AppError(
                    code="INSUFFICIENT_DESTINATION_DATA",
                    message=(
                        f"Insufficient destinations in catalog to satisfy a "
                        f"{request.duration_days}-day itinerary."
                    ),
                    status_code=422,
                )

        # 3. Deterministic Stable Sorting:
        # Prioritize offbeat if requested, budget-affordability if limit is specified,
        # then sort deterministically by category, district, and slug
        budget_limit = getattr(request, "budget_limit_inr", None)

        def sort_key(d: DestinationRead) -> tuple:
            offbeat_score = 0 if (request.is_offbeat_preferred and d.is_offbeat) else 1
            fee = d.entry_fee_min_inr if d.entry_fee_min_inr is not None else 50.0
            fee_tier = (0 if fee == 0.0 else 1) if budget_limit else 0
            return (
                offbeat_score,
                fee_tier,
                fee if budget_limit else 0.0,
                d.category,
                d.district_code,
                d.slug,
            )

        pool.sort(key=sort_key)

        # 4. Pace-based stops allocation
        stops_per_day = 3
        if request.pace == "relaxed":
            stops_per_day = 2
        elif request.pace == "packed":
            stops_per_day = 4

        target_total = request.duration_days * stops_per_day
        selected = pool[:target_total]

        # 5. Hydrate RecommendedDestination items
        items: list[RecommendedDestination] = []
        for idx, dest in enumerate(selected):
            day_num = min((idx // stops_per_day) + 1, request.duration_days)
            order_num = (idx % stops_per_day) + 1

            disp_name = dest.slug
            disp_summary = None
            for t in dest.translations:
                if t.language_code == request.language:
                    disp_name = t.name
                    disp_summary = t.summary
                    break
            else:
                for t in dest.translations:
                    if t.language_code == LanguageCode.EN:
                        disp_name = t.name
                        disp_summary = t.summary
                        break

            district_name = dest.district.name_en if dest.district else dest.district_code
            if dest.district and request.language == LanguageCode.KN:
                district_name = dest.district.name_kn

            if request.language == LanguageCode.KN:
                rationale = f"{district_name} ಜಿಲ್ಲೆಯಲ್ಲಿ ನಿಮ್ಮ ಆದ್ಯತೆಗೆ ಅನುಗುಣವಾಗಿ ಆಯ್ಕೆ ಮಾಡಲಾದ ಪ್ರಮುಖ ತಾಣ."
            else:
                rationale = (
                    f"Curated {dest.category} destination in {district_name} matching "
                    f"your {request.pace} travel pace."
                )

            rec = RecommendedDestination(
                id=dest.id,
                slug=dest.slug,
                name=disp_name,
                summary=disp_summary,
                category=dest.category,
                district_code=dest.district_code,
                district_name=district_name,
                coordinates=dest.coordinates,
                day_number=day_num,
                order=order_num,
                rationale=rationale,
                entry_fee_min_inr=dest.entry_fee_min_inr,
                entry_fee_max_inr=dest.entry_fee_max_inr,
                currency_code=dest.currency_code,
                access_status=dest.access_status,
                is_offbeat=dest.is_offbeat,
                sources=dest.sources,
            )
            items.append(rec)

        items.sort(key=lambda d: (d.day_number, d.order))
        return items

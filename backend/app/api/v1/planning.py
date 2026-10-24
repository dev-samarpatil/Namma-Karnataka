"""API route handlers for travel planning and recommendations."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.planning import (
    DayRegenerateRequest,
    ItineraryRecalculateRequest,
    PlanningRecommendationResponse,
    PlanningRequest,
    StopRegenerateRequest,
    StopRegenerateResponse,
)
from app.services.ai.orchestrator import AIOrchestrator
from app.services.budget import BudgetCalculator
from app.services.scheduler import DeterministicScheduler

router = APIRouter(prefix="/planning", tags=["planning"])


def get_orchestrator() -> AIOrchestrator:
    """Dependency injection factory for AIOrchestrator."""
    return AIOrchestrator()


@router.post("/recommendations", response_model=PlanningRecommendationResponse)
async def generate_recommendations(
    request: PlanningRequest,
    orchestrator: AIOrchestrator = Depends(get_orchestrator),
) -> PlanningRecommendationResponse:
    """Generate structured Karnataka travel recommendations.

    Orchestrates primary and secondary AI providers with a global deadline,
    enforcing destination catalog grounding and falling back deterministically
    when remote providers are unavailable.
    """
    return await orchestrator.recommend_itinerary(request)


@router.post("/recalculate", response_model=PlanningRecommendationResponse)
async def recalculate_itinerary(
    recalc_req: ItineraryRecalculateRequest,
) -> PlanningRecommendationResponse:
    """Deterministically recalculate travel times, stop schedules, and budget breakdown."""
    rescheduled_days, items, warnings = DeterministicScheduler.reschedule_itinerary(
        recalc_req.request, recalc_req.days
    )

    budget = BudgetCalculator.calculate_budget(recalc_req.request, rescheduled_days, items)

    return PlanningRecommendationResponse(
        request_id=None,
        language=recalc_req.request.language,
        generation_mode=recalc_req.generation_mode,
        provider_used=recalc_req.provider_used,
        items=items,
        total_destinations=len(items),
        duration_days=recalc_req.request.duration_days,
        days=rescheduled_days,
        budget_breakdown=budget,
        assumptions=[
            "Schedule and budget recalculated deterministically using verified catalog data."
        ],
        warnings=warnings,
    )


@router.post("/regenerate-stop", response_model=StopRegenerateResponse)
async def regenerate_stop(
    regen_req: StopRegenerateRequest,
) -> StopRegenerateResponse:
    """Propose grounded destination alternatives for an individual itinerary stop."""
    candidates = DeterministicScheduler.get_stop_alternatives(
        request=regen_req.request,
        current_plan=regen_req.current_plan,
        day_number=regen_req.day_number,
        stop_id=regen_req.stop_id,
        preferred_category=regen_req.preferred_category,
    )
    return StopRegenerateResponse(
        original_stop_id=regen_req.stop_id,
        day_number=regen_req.day_number,
        candidates=candidates,
    )


@router.post("/regenerate-day", response_model=PlanningRecommendationResponse)
async def regenerate_day(
    day_regen_req: DayRegenerateRequest,
) -> PlanningRecommendationResponse:
    """Regenerate attractions for a single day while preserving other days and locked stops."""
    new_day = DeterministicScheduler.regenerate_day(
        request=day_regen_req.request,
        current_plan=day_regen_req.current_plan,
        day_number=day_regen_req.day_number,
    )

    updated_days = [
        (new_day if d.day_number == day_regen_req.day_number else d)
        for d in day_regen_req.current_plan.days
    ]

    rescheduled_days, items, warnings = DeterministicScheduler.reschedule_itinerary(
        day_regen_req.request, updated_days
    )

    budget = BudgetCalculator.calculate_budget(day_regen_req.request, rescheduled_days, items)

    return PlanningRecommendationResponse(
        request_id=day_regen_req.current_plan.request_id,
        language=day_regen_req.request.language,
        generation_mode=day_regen_req.current_plan.generation_mode,
        provider_used="deterministic_day_regenerator",
        items=items,
        total_destinations=len(items),
        duration_days=day_regen_req.request.duration_days,
        days=rescheduled_days,
        budget_breakdown=budget,
        assumptions=[f"Day {day_regen_req.day_number} regenerated while preserving locked stops."],
        warnings=warnings,
    )

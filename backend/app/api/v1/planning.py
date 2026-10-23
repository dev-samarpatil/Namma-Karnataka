"""API route handlers for travel planning and recommendations."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.planning import (
    PlanningRecommendationResponse,
    PlanningRequest,
)
from app.services.ai.orchestrator import AIOrchestrator

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

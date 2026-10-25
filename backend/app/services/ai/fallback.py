"""Deterministic, catalogue-grounded fallback recommendation engine."""

from __future__ import annotations

from app.core.errors import AppError
from app.schemas.destinations import DestinationRead
from app.schemas.planning import (
    PlanningRequest,
    RecommendedDestination,
)
from app.services.clustering.corridors import TravelCorridor
from app.services.routing.optimizer import RouteOptimizer


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
        items, _warnings, _corridor = DeterministicFallbackEngine.generate_plan_with_metadata(
            request=request, candidates=candidates
        )
        return items

    @staticmethod
    def generate_plan_with_metadata(
        request: PlanningRequest,
        candidates: list[DestinationRead],
    ) -> tuple[list[RecommendedDestination], list[str], TravelCorridor]:
        """Generate recommendations with corridor warnings and corridor metadata."""
        if not candidates:
            raise AppError(
                code="INSUFFICIENT_DESTINATION_DATA",
                message=(
                    "No published destinations available in the catalog matching your criteria."
                ),
                status_code=422,
            )

        return RouteOptimizer.plan_coherent_itinerary(
            request=request,
            candidates=candidates,
        )

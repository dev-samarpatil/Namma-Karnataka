"""High-level routing service managing travel estimation and feasibility analysis."""

from __future__ import annotations

import logging

from app.services.routing.models import RouteEstimate
from app.services.routing.provider import RoutingProvider
from app.services.routing.terrain_provider import TerrainAdjustedRoutingProvider

logger = logging.getLogger(__name__)


class RoutingService:
    """Service providing route calculations and terrain-aware estimates."""

    def __init__(self, provider: RoutingProvider | None = None) -> None:
        self._provider = provider or TerrainAdjustedRoutingProvider()

    def estimate_travel(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        mode: str = "driving",
    ) -> RouteEstimate:
        """Estimate travel distance, duration, and feasibility between two points."""
        try:
            return self._provider.calculate_route(
                origin_lat=origin_lat,
                origin_lon=origin_lon,
                dest_lat=dest_lat,
                dest_lon=dest_lon,
                mode=mode,
            )
        except Exception as exc:
            logger.warning("Routing provider failed: %s. Using emergency fallback.", exc)
            fallback = TerrainAdjustedRoutingProvider()
            return fallback.calculate_route(origin_lat, origin_lon, dest_lat, dest_lon, mode)


_global_routing_service: RoutingService | None = None


def get_routing_service() -> RoutingService:
    """Singleton accessor for RoutingService."""
    global _global_routing_service
    if _global_routing_service is None:
        _global_routing_service = RoutingService()
    return _global_routing_service

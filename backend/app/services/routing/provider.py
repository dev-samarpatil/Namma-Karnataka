"""Abstract base provider for routing calculations."""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.services.routing.models import RouteEstimate


class RoutingProvider(ABC):
    """Abstract interface for calculating travel distances and durations."""

    @abstractmethod
    def calculate_route(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        mode: str = "driving",
    ) -> RouteEstimate:
        """Calculate route estimate between origin and destination."""
        pass

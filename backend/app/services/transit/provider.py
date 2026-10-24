"""Abstract Base Class for Public Transit Providers."""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.services.transit.models import TransitComparison, TransitJourneyOption, TransitStop


class TransitProvider(ABC):
    """Interface for public transit schedule and stop discovery providers."""

    @abstractmethod
    def search_nearby_stops(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 25.0,
        limit: int = 10,
    ) -> list[TransitStop]:
        """Discover public transit stops/stations near geographic coordinates."""
        ...

    @abstractmethod
    def find_journeys(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        departure_time: str = "08:00",
        max_transfers: int = 2,
    ) -> list[TransitJourneyOption]:
        """Find feasible transit journey options between geographic points."""
        ...

    @abstractmethod
    def compare_transit_and_road(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        departure_time: str = "08:00",
    ) -> TransitComparison:
        """Compare personal/cab road travel with scheduled public transit alternatives."""
        ...

"""Transit service manager providing unified access to public transit providers."""

from __future__ import annotations

from app.services.transit.curated_provider import CuratedTransitProvider
from app.services.transit.models import TransitComparison, TransitJourneyOption, TransitStop
from app.services.transit.provider import TransitProvider

_transit_provider_instance: TransitProvider | None = None


def get_transit_provider() -> TransitProvider:
    """Return the configured TransitProvider singleton."""
    global _transit_provider_instance
    if _transit_provider_instance is None:
        _transit_provider_instance = CuratedTransitProvider()
    return _transit_provider_instance


class TransitService:
    """Central coordination service for transit stop discovery and journey comparison."""

    def __init__(self, provider: TransitProvider | None = None) -> None:
        self._provider = provider or get_transit_provider()

    def get_nearby_stops(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 25.0,
        limit: int = 10,
    ) -> list[TransitStop]:
        return self._provider.search_nearby_stops(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            limit=limit,
        )

    def find_journeys(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        departure_time: str = "08:00",
        max_transfers: int = 2,
    ) -> list[TransitJourneyOption]:
        return self._provider.find_journeys(
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            departure_time=departure_time,
            max_transfers=max_transfers,
        )

    def compare_transit_and_road(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        departure_time: str = "08:00",
    ) -> TransitComparison:
        return self._provider.compare_transit_and_road(
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            departure_time=departure_time,
        )


_service_instance: TransitService | None = None


def get_transit_service() -> TransitService:
    global _service_instance
    if _service_instance is None:
        _service_instance = TransitService()
    return _service_instance

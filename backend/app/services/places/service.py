"""High-level Places service orchestrating restaurant and accommodation discovery."""

from __future__ import annotations

import logging

from app.schemas.places import AccommodationRead, RestaurantRead
from app.services.places.curated_provider import CuratedPlacesProvider
from app.services.places.provider import PlacesProvider

logger = logging.getLogger(__name__)


class PlacesService:
    """Service providing search, retrieval, and graceful fallback for places."""

    def __init__(self, provider: PlacesProvider | None = None) -> None:
        self._provider = provider or CuratedPlacesProvider()

    def get_restaurants_near(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 25.0,
        cuisine: str | None = None,
        is_vegetarian: bool | None = None,
        price_tier: str | None = None,
        max_results: int = 10,
    ) -> list[RestaurantRead]:
        """Discover restaurants near geographic coordinates."""
        try:
            return self._provider.search_restaurants(
                latitude=latitude,
                longitude=longitude,
                radius_km=radius_km,
                cuisine=cuisine,
                is_vegetarian=is_vegetarian,
                price_tier=price_tier,
                max_results=max_results,
            )
        except Exception as exc:
            logger.warning("Places provider error searching restaurants: %s", exc)
            return []

    def get_accommodations_near(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 40.0,
        accommodation_type: str | None = None,
        price_tier: str | None = None,
        max_results: int = 10,
    ) -> list[AccommodationRead]:
        """Discover accommodations near geographic coordinates."""
        try:
            return self._provider.search_accommodations(
                latitude=latitude,
                longitude=longitude,
                radius_km=radius_km,
                accommodation_type=accommodation_type,
                price_tier=price_tier,
                max_results=max_results,
            )
        except Exception as exc:
            logger.warning("Places provider error searching accommodations: %s", exc)
            return []

    def get_restaurant(self, restaurant_id: str) -> RestaurantRead | None:
        """Fetch single restaurant by identifier."""
        return self._provider.get_restaurant_by_id(restaurant_id)

    def get_accommodation(self, accommodation_id: str) -> AccommodationRead | None:
        """Fetch single accommodation by identifier."""
        return self._provider.get_accommodation_by_id(accommodation_id)


_global_places_service: PlacesService | None = None


def get_places_service() -> PlacesService:
    """Singleton accessor for PlacesService."""
    global _global_places_service
    if _global_places_service is None:
        _global_places_service = PlacesService()
    return _global_places_service

"""Abstract data provider interface for places (restaurants and accommodations)."""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.schemas.places import AccommodationRead, RestaurantRead


class PlacesProvider(ABC):
    """Abstract base class defining contract for place search and retrieval."""

    @abstractmethod
    def search_restaurants(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 25.0,
        cuisine: str | None = None,
        is_vegetarian: bool | None = None,
        price_tier: str | None = None,
        max_results: int = 10,
    ) -> list[RestaurantRead]:
        """Search nearby restaurants within radius."""
        pass

    @abstractmethod
    def search_accommodations(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 40.0,
        accommodation_type: str | None = None,
        price_tier: str | None = None,
        max_results: int = 10,
    ) -> list[AccommodationRead]:
        """Search nearby accommodations within radius."""
        pass

    @abstractmethod
    def get_restaurant_by_id(self, restaurant_id: str) -> RestaurantRead | None:
        """Retrieve a specific restaurant by unique identifier."""
        pass

    @abstractmethod
    def get_accommodation_by_id(self, accommodation_id: str) -> AccommodationRead | None:
        """Retrieve a specific accommodation by unique identifier."""
        pass

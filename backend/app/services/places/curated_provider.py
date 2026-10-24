"""Curated verified places provider reading from canonical local seed data."""

from __future__ import annotations

import json
import math
from pathlib import Path

from app.schemas.places import AccommodationRead, RestaurantRead
from app.services.places.provider import PlacesProvider


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate straight-line great-circle distance between two points in km."""
    radius_earth_km = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(radius_earth_km * c, 2)


class CuratedPlacesProvider(PlacesProvider):
    """Concrete provider serving curated verified restaurants and accommodations."""

    def __init__(self, data_path: Path | None = None) -> None:
        if data_path is None:
            repo_root = Path(__file__).resolve().parent.parent.parent.parent.parent
            data_path = repo_root / "data" / "seed" / "places.json"

        self._data_path = data_path
        self._restaurants: dict[str, RestaurantRead] = {}
        self._accommodations: dict[str, AccommodationRead] = {}
        self._load_data()

    def _load_data(self) -> None:
        if not self._data_path.exists():
            return

        with open(self._data_path, encoding="utf-8") as f:
            data = json.load(f)

        for r in data.get("restaurants", []):
            item = RestaurantRead.model_validate(r)
            self._restaurants[item.id] = item

        for a in data.get("accommodations", []):
            item = AccommodationRead.model_validate(a)
            self._accommodations[item.id] = item

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
        candidates: list[tuple[float, RestaurantRead]] = []

        for r in self._restaurants.values():
            dist = calculate_haversine_distance(latitude, longitude, r.latitude, r.longitude)
            if dist > radius_km:
                continue

            if cuisine and cuisine.lower() not in [c.lower() for c in r.cuisines]:
                continue

            if is_vegetarian is not None and is_vegetarian and not r.is_vegetarian:
                continue

            if price_tier and r.price_tier != price_tier:
                continue

            # Clone and attach distance
            r_copy = r.model_copy(update={"distance_km": dist})
            candidates.append((dist, r_copy))

        # Sort by distance
        candidates.sort(key=lambda x: x[0])
        return [r for _, r in candidates[:max_results]]

    def search_accommodations(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 40.0,
        accommodation_type: str | None = None,
        price_tier: str | None = None,
        max_results: int = 10,
    ) -> list[AccommodationRead]:
        candidates: list[tuple[float, AccommodationRead]] = []

        for a in self._accommodations.values():
            dist = calculate_haversine_distance(latitude, longitude, a.latitude, a.longitude)
            if dist > radius_km:
                continue

            if accommodation_type and a.accommodation_type != accommodation_type:
                continue

            if price_tier and a.price_tier != price_tier:
                continue

            a_copy = a.model_copy(update={"distance_km": dist})
            candidates.append((dist, a_copy))

        candidates.sort(key=lambda x: x[0])
        return [a for _, a in candidates[:max_results]]

    def get_restaurant_by_id(self, restaurant_id: str) -> RestaurantRead | None:
        return self._restaurants.get(restaurant_id)

    def get_accommodation_by_id(self, accommodation_id: str) -> AccommodationRead | None:
        return self._accommodations.get(accommodation_id)

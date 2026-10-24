"""API endpoints for restaurant discovery, accommodation discovery, and routing estimates."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query

from app.core.errors import NotFoundError
from app.schemas.places import AccommodationRead, RestaurantRead
from app.services.places.service import get_places_service
from app.services.routing.models import RouteEstimate
from app.services.routing.service import get_routing_service

router = APIRouter(prefix="/places", tags=["places"])


@router.get("/restaurants", response_model=list[RestaurantRead])
def search_restaurants(
    lat: Annotated[float, Query(ge=-90.0, le=90.0, description="Latitude")],
    lon: Annotated[float, Query(ge=-180.0, le=180.0, description="Longitude")],
    radius_km: Annotated[float, Query(gt=0.0, le=100.0)] = 25.0,
    cuisine: str | None = None,
    is_vegetarian: bool | None = None,
    price_tier: str | None = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> list[RestaurantRead]:
    """Search for verified restaurants near geographic coordinates."""
    service = get_places_service()
    return service.get_restaurants_near(
        latitude=lat,
        longitude=lon,
        radius_km=radius_km,
        cuisine=cuisine,
        is_vegetarian=is_vegetarian,
        price_tier=price_tier,
        max_results=limit,
    )


@router.get("/restaurants/{restaurant_id}", response_model=RestaurantRead)
def get_restaurant_by_id(restaurant_id: str) -> RestaurantRead:
    """Retrieve details for a specific restaurant."""
    service = get_places_service()
    place = service.get_restaurant(restaurant_id)
    if not place:
        raise NotFoundError(f"Restaurant '{restaurant_id}' not found.")
    return place


@router.get("/accommodations", response_model=list[AccommodationRead])
def search_accommodations(
    lat: Annotated[float, Query(ge=-90.0, le=90.0, description="Latitude")],
    lon: Annotated[float, Query(ge=-180.0, le=180.0, description="Longitude")],
    radius_km: Annotated[float, Query(gt=0.0, le=100.0)] = 40.0,
    accommodation_type: str | None = None,
    price_tier: str | None = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> list[AccommodationRead]:
    """Search for verified accommodations near geographic coordinates."""
    service = get_places_service()
    return service.get_accommodations_near(
        latitude=lat,
        longitude=lon,
        radius_km=radius_km,
        accommodation_type=accommodation_type,
        price_tier=price_tier,
        max_results=limit,
    )


@router.get("/accommodations/{accommodation_id}", response_model=AccommodationRead)
def get_accommodation_by_id(accommodation_id: str) -> AccommodationRead:
    """Retrieve details for a specific accommodation establishment."""
    service = get_places_service()
    acc = service.get_accommodation(accommodation_id)
    if not acc:
        raise NotFoundError(f"Accommodation '{accommodation_id}' not found.")
    return acc


@router.get("/routing/estimate", response_model=RouteEstimate)
def estimate_route(
    origin_lat: Annotated[float, Query(ge=-90.0, le=90.0)],
    origin_lon: Annotated[float, Query(ge=-180.0, le=180.0)],
    dest_lat: Annotated[float, Query(ge=-90.0, le=90.0)],
    dest_lon: Annotated[float, Query(ge=-180.0, le=180.0)],
    mode: str = "driving",
) -> RouteEstimate:
    """Calculate distance, terrain-adjusted duration, and feasibility warnings."""
    service = get_routing_service()
    return service.estimate_travel(
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        mode=mode,
    )

"""API endpoints for public transit stops, journeys, and road vs transit comparison."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query

from app.services.transit import (
    TransitComparison,
    TransitJourneyOption,
    TransitStop,
    get_transit_service,
)

router = APIRouter(prefix="/transit", tags=["transit"])


@router.get("/stops", response_model=list[TransitStop])
def get_nearby_transit_stops(
    lat: Annotated[float, Query(ge=-90.0, le=90.0, description="Latitude")],
    lon: Annotated[float, Query(ge=-180.0, le=180.0, description="Longitude")],
    radius_km: Annotated[float, Query(gt=0.0, le=100.0)] = 25.0,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> list[TransitStop]:
    """Discover verified public transit bus and rail terminals near coordinates."""
    service = get_transit_service()
    return service.get_nearby_stops(latitude=lat, longitude=lon, radius_km=radius_km, limit=limit)


@router.get("/journeys", response_model=list[TransitJourneyOption])
def find_transit_journeys(
    origin_lat: Annotated[float, Query(ge=-90.0, le=90.0)],
    origin_lon: Annotated[float, Query(ge=-180.0, le=180.0)],
    dest_lat: Annotated[float, Query(ge=-90.0, le=90.0)],
    dest_lon: Annotated[float, Query(ge=-180.0, le=180.0)],
    departure_time: str = "08:00",
    max_transfers: Annotated[int, Query(ge=0, le=3)] = 2,
) -> list[TransitJourneyOption]:
    """Find scheduled public transit journeys (KSRTC express, BMTC, SWR rail) between points."""
    service = get_transit_service()
    return service.find_journeys(
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        departure_time=departure_time,
        max_transfers=max_transfers,
    )


@router.get("/compare", response_model=TransitComparison)
def compare_transit_and_road(
    origin_lat: Annotated[float, Query(ge=-90.0, le=90.0)],
    origin_lon: Annotated[float, Query(ge=-180.0, le=180.0)],
    dest_lat: Annotated[float, Query(ge=-90.0, le=90.0)],
    dest_lon: Annotated[float, Query(ge=-180.0, le=180.0)],
    departure_time: str = "08:00",
) -> TransitComparison:
    """Compare travel time, costs, and carbon considerations between road cab and public transit."""
    service = get_transit_service()
    return service.compare_transit_and_road(
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        departure_time=departure_time,
    )

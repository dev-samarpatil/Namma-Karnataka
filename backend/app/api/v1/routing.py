"""API routes for road routing and turn-by-turn travel directions."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.services.routing.models import DirectionsRequest, DirectionsResponse
from app.services.routing.road_provider import RoadRoutingService, get_road_routing_service

router = APIRouter(prefix="/routing", tags=["routing"])


@router.post("/directions", response_model=DirectionsResponse)
async def get_route_directions(
    request: DirectionsRequest,
    routing_service: RoadRoutingService = Depends(get_road_routing_service),
) -> DirectionsResponse:
    """Calculate authentic road routing geometry, leg-by-leg distances, durations,
    and turn directions connecting itinerary waypoints with Google Maps navigation link.
    """
    return await routing_service.calculate_directions(request)

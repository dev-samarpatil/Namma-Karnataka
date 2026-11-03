"""Destination discovery API endpoints.

Exposes multi-source discovered attractions across Karnataka Tourism,
ASI, District Gazetteers, and OpenStreetMap with authentic offbeat scores.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.services.destination_discovery import (
    DiscoveredDestination,
    get_destination_discovery_service,
)

router = APIRouter(prefix="/discovery", tags=["Discovery"])


@router.get("/destinations", response_model=list[DiscoveredDestination])
def discover_destinations(
    latitude: float | None = Query(None, description="Center latitude for proximity discovery"),
    longitude: float | None = Query(None, description="Center longitude for proximity discovery"),
    radius_km: float = Query(60.0, ge=5.0, le=250.0, description="Discovery radius in km"),
    district: str | None = Query(None, description="Target district name or code"),
    category: str | None = Query(None, description="Filter category"),
    offbeat_only: bool = Query(False, description="Restrict to high-offbeat destinations"),
    min_offbeat_score: float = Query(0.0, ge=0.0, le=1.0, description="Minimum offbeat score"),
    limit: int = Query(20, ge=1, le=50, description="Maximum results to return"),
) -> list[DiscoveredDestination]:
    """Discover attractions across multi-provider sources."""
    svc = get_destination_discovery_service()
    categories = [category] if category else None
    return svc.discover_destinations(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        district=district,
        categories=categories,
        offbeat_only=offbeat_only,
        min_offbeat_score=min_offbeat_score,
        limit=limit,
    )


@router.get("/offbeat", response_model=list[DiscoveredDestination])
def get_offbeat_gems(
    district: str | None = Query(None, description="Optional district filter"),
    limit: int = Query(15, ge=1, le=30, description="Maximum results to return"),
) -> list[DiscoveredDestination]:
    """Retrieve high-confidence offbeat gems with rich cultural provenance."""
    svc = get_destination_discovery_service()
    return svc.discover_destinations(
        district=district,
        offbeat_only=True,
        min_offbeat_score=0.5,
        limit=limit,
    )


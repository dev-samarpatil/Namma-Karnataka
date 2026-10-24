"""Destination API v1 route handlers."""

from __future__ import annotations

import math
from typing import Any

from fastapi import APIRouter, Depends, Query

from app.core.errors import AppError
from app.repositories.destinations import DestinationRepository, get_destination_repository
from app.schemas.destinations import (
    DestinationCategory,
    DestinationFilterParams,
    DestinationListResponse,
    DestinationNearbyResponse,
    DestinationRead,
    LanguageCode,
    NearbyAttractionItem,
    NearbyTransitItem,
)
from app.services.places.service import PlacesService
from app.services.transit.curated_provider import CuratedTransitProvider

router = APIRouter(prefix="/destinations", tags=["destinations"])


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r_lat1, r_lon1 = math.radians(lat1), math.radians(lon1)
    r_lat2, r_lon2 = math.radians(lat2), math.radians(lon2)
    dlat = r_lat2 - r_lat1
    dlon = r_lon2 - r_lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(r_lat1) * math.cos(r_lat2) * math.sin(dlon / 2) ** 2
    return 6371.0 * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


@router.get("", response_model=DestinationListResponse)
def list_destinations(
    q: str | None = Query(None, max_length=120, description="Keyword search query"),
    district: str | None = Query(
        None, max_length=16, description="Filter by district code e.g. 'KA-MYS'"
    ),
    category: DestinationCategory | None = Query(
        None, description="Filter by destination category"
    ),
    is_offbeat: bool | None = Query(None, description="Filter by offbeat classification"),
    fee_type: str | None = Query(
        None, pattern="^(free|paid|unknown)$", description="Filter by fee type"
    ),
    min_duration: int | None = Query(None, ge=1, description="Min duration in minutes"),
    max_duration: int | None = Query(None, ge=1, description="Max duration in minutes"),
    sort_by: str | None = Query(
        None,
        pattern="^(name|district|duration_asc|duration_desc)$",
        description="Sort order",
    ),
    lang: LanguageCode = Query(LanguageCode.EN, description="Language preference"),
    limit: int = Query(20, ge=1, le=100, description="Pagination page size"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    repo: DestinationRepository = Depends(get_destination_repository),
) -> DestinationListResponse:
    """Retrieve a paginated collection of published destinations."""
    params = DestinationFilterParams(
        q=q,
        district=district,
        category=category,
        is_offbeat=is_offbeat,
        fee_type=fee_type,
        min_duration=min_duration,
        max_duration=max_duration,
        sort_by=sort_by,
        lang=lang,
        limit=limit,
        offset=offset,
    )
    items, total = repo.list_destinations(params, published_only=True)
    return DestinationListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
        has_more=(offset + limit) < total,
    )


@router.get("/{id_or_slug}/nearby", response_model=DestinationNearbyResponse)
def get_destination_nearby(
    id_or_slug: str,
    radius_km: float = Query(50.0, ge=5.0, le=150.0, description="Search radius in kilometers"),
    limit: int = Query(6, ge=1, le=20, description="Max nearby attractions"),
    repo: DestinationRepository = Depends(get_destination_repository),
) -> DestinationNearbyResponse:
    """Discover nearby verified attractions, transit terminals, food, and stays."""
    destination = repo.get_by_slug(id_or_slug) or repo.get_by_id(id_or_slug)
    if not destination or destination.content_status != "published" or not destination.active:
        raise AppError(
            code="DESTINATION_NOT_FOUND",
            message=f"Destination '{id_or_slug}' was not found or is not published.",
            status_code=404,
        )

    nearby_attractions: list[NearbyAttractionItem] = []
    nearby_transit: list[NearbyTransitItem] = []
    nearby_restaurants: list[dict[str, Any]] = []
    nearby_accommodations: list[dict[str, Any]] = []

    if destination.coordinates:
        lat = destination.coordinates.lat
        lon = destination.coordinates.lon

        # 1. Nearby Attractions (exclude itself)
        raw_attractions = repo.list_nearby(lat, lon, radius_km * 1000.0, limit=limit + 1)
        for dest, dist_m in raw_attractions:
            if dest.id == destination.id:
                continue
            nearby_attractions.append(
                NearbyAttractionItem(
                    id=dest.id,
                    slug=dest.slug,
                    name=dest.name_en or dest.slug.replace("-", " ").title(),
                    category=dest.category,
                    district_code=dest.district_code,
                    district_name=dest.district.name_en if dest.district else None,
                    distance_km=round(dist_m / 1000.0, 1),
                    estimated_visit_minutes=dest.estimated_visit_minutes,
                    entry_fee_min_inr=dest.entry_fee_min_inr,
                    entry_fee_max_inr=dest.entry_fee_max_inr,
                    primary_image_url=dest.primary_image_url,
                    is_offbeat=dest.is_offbeat,
                )
            )
            if len(nearby_attractions) >= limit:
                break

        # 2. Nearby Transit Facilities
        try:
            transit_provider = CuratedTransitProvider()
            transit_candidates = []
            for s in transit_provider._stops.values():
                d_km = _haversine_km(lat, lon, s.latitude, s.longitude)
                if d_km <= radius_km:
                    transit_candidates.append((s, d_km))
            transit_candidates.sort(key=lambda x: x[1])
            for s, d_km in transit_candidates[:4]:
                nearby_transit.append(
                    NearbyTransitItem(
                        hub_id=s.id,
                        name=s.name,
                        hub_type=s.type.value if hasattr(s.type, "value") else str(s.type),
                        distance_km=round(d_km, 1),
                        connectivity_summary=(
                            f"{s.name} ({s.code}) ~{round(d_km, 1)} km from destination"
                        ),
                    )
                )
        except Exception:
            pass

        # 3. Nearby Food & Stay via Places Service
        try:
            places_svc = PlacesService()
            rests = places_svc.get_restaurants_near(lat, lon, radius_km=radius_km, max_results=6)
            for r in rests:
                nearby_restaurants.append(r.model_dump())
            accs = places_svc.get_accommodations_near(lat, lon, radius_km=radius_km, max_results=6)
            for a in accs:
                nearby_accommodations.append(a.model_dump())
        except Exception:
            pass

    return DestinationNearbyResponse(
        destination_id=destination.id,
        destination_slug=destination.slug,
        radius_km=radius_km,
        nearby_attractions=nearby_attractions,
        nearby_transit=nearby_transit,
        nearby_restaurants=nearby_restaurants,
        nearby_accommodations=nearby_accommodations,
    )


@router.get("/{id_or_slug}", response_model=DestinationRead)
def get_destination(
    id_or_slug: str,
    repo: DestinationRepository = Depends(get_destination_repository),
) -> DestinationRead:
    """Retrieve a single published destination by stable UUID or URL slug."""
    destination = repo.get_by_slug(id_or_slug) or repo.get_by_id(id_or_slug)

    if not destination or destination.content_status != "published" or not destination.active:
        raise AppError(
            code="DESTINATION_NOT_FOUND",
            message=f"Destination '{id_or_slug}' was not found or is not published.",
            status_code=404,
        )

    return destination

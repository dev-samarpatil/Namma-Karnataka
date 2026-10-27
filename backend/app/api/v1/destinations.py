"""Destination API v1 route handlers."""

from __future__ import annotations

import math
from typing import Any
import httpx

from fastapi import APIRouter, Depends, Query

from app.core.errors import AppError
from app.repositories.destinations import DestinationRepository, get_destination_repository
from app.schemas.destinations import (
    DestinationCategory,
    DestinationFilterParams,
    DestinationListResponse,
    DestinationMedia,
    DestinationNearbyResponse,
    DestinationRead,
    LanguageCode,
    NearbyAttractionItem,
    NearbyTransitItem,
)
from app.services.media.image_search import DestinationImageSearchService
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
        effective_radius_km: float | None = None
        radius_expanded = False
        radius_note: str | None = None

        try:
            places_svc = PlacesService()
            rests = places_svc.get_restaurants_near(lat, lon, radius_km=radius_km, max_results=6)
            for r in rests:
                nearby_restaurants.append(r.model_dump())
            accs = places_svc.get_accommodations_near(lat, lon, radius_km=radius_km, max_results=6)
            for a in accs:
                nearby_accommodations.append(a.model_dump())

            # If no places found within initial radius, perform transparent radius expansion
            if not nearby_restaurants and not nearby_accommodations:
                expanded_radius = min(max(radius_km * 2.0, 35.0), 60.0)
                expanded_rests = places_svc.get_restaurants_near(lat, lon, radius_km=expanded_radius, max_results=6)
                expanded_accs = places_svc.get_accommodations_near(lat, lon, radius_km=expanded_radius, max_results=6)
                if expanded_rests or expanded_accs:
                    for r in expanded_rests:
                        nearby_restaurants.append(r.model_dump())
                    for a in expanded_accs:
                        nearby_accommodations.append(a.model_dump())
                    radius_expanded = True
                    effective_radius_km = expanded_radius
                    radius_note = (
                        f"No verified food or stays found within {radius_km} km. "
                        f"Showing closest verified options within {expanded_radius} km."
                    )
                else:
                    radius_note = f"No curated food or lodging records within {radius_km} km radius."
        except Exception:
            pass

    return DestinationNearbyResponse(
        destination_id=destination.id,
        destination_slug=destination.slug,
        radius_km=radius_km,
        effective_radius_km=effective_radius_km,
        radius_expanded=radius_expanded,
        radius_note=radius_note,
        nearby_attractions=nearby_attractions,
        nearby_transit=nearby_transit,
        nearby_restaurants=nearby_restaurants,
        nearby_accommodations=nearby_accommodations,
    )



import asyncio
import hashlib
from pathlib import Path
from fastapi.responses import Response

_MEDIA_CACHE: dict[str, tuple[bytes, str]] = {}
_MEDIA_DISK_CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "media_cache"
_MEDIA_DISK_CACHE_DIR.mkdir(parents=True, exist_ok=True)
_PROXY_SEMAPHORE = asyncio.Semaphore(6)
_SHARED_PROXY_CLIENT: httpx.AsyncClient | None = None


def _get_proxy_client() -> httpx.AsyncClient:
    global _SHARED_PROXY_CLIENT
    if _SHARED_PROXY_CLIENT is None or _SHARED_PROXY_CLIENT.is_closed:
        _SHARED_PROXY_CLIENT = httpx.AsyncClient(
            timeout=12.0,
            follow_redirects=True,
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            headers={
                "User-Agent": "NammaKarnatakaTravelApp/1.0 (https://karnataka.gov.in; tourism@nammakarnataka.org)",
                "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
            },
        )
    return _SHARED_PROXY_CLIENT


@router.get("/media/proxy")
async def proxy_destination_media(
    url: str = Query(..., description="Canonical Wikimedia media URL to proxy"),
) -> Any:
    """Proxy authentic destination media from verified Wikimedia domains to avoid
    CORS, network sandboxing, or client-side referrer restriction failures.
    Includes memory + persistent disk caching and unscaled thumbnail fallback.
    """
    clean_url = url.split("?")[0].replace("thumb.wikimedia.org", "upload.wikimedia.org")

    # 1. Local filesystem assets
    if clean_url.startswith(("/images/", "/static/")):
        filename = Path(clean_url).name
        local_path = Path(__file__).resolve().parent.parent.parent / "static" / "destinations" / filename
        frontend_path = (
            Path(__file__).resolve().parent.parent.parent.parent.parent
            / "frontend"
            / "public"
            / "images"
            / "destinations"
            / filename
        )
        target_path = local_path if local_path.exists() else (frontend_path if frontend_path.exists() else None)
        if target_path:
            data = target_path.read_bytes()
            content_type = "image/jpeg" if filename.lower().endswith((".jpg", ".jpeg")) else "image/png"
            return Response(
                content=data,
                media_type=content_type,
                headers={"Cache-Control": "public, max-age=604800"},
            )

    # 2. Domain verification
    if not (
        clean_url.startswith("https://upload.wikimedia.org/")
        or clean_url.startswith("https://commons.wikimedia.org/")
    ):
        raise AppError(
            code="INVALID_MEDIA_PROXY_URL",
            message="Only verified Wikimedia Commons media URLs may be proxied.",
            status_code=403,
        )

    # 3. Check In-Memory Cache
    if clean_url in _MEDIA_CACHE:
        data, content_type = _MEDIA_CACHE[clean_url]
        return Response(
            content=data,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=604800"},
        )

    # 4. Check Disk Cache
    url_hash = hashlib.sha256(clean_url.encode("utf-8")).hexdigest()
    bin_file = _MEDIA_DISK_CACHE_DIR / f"{url_hash}.bin"
    meta_file = _MEDIA_DISK_CACHE_DIR / f"{url_hash}.meta"

    if bin_file.exists() and meta_file.exists() and bin_file.stat().st_size > 500:
        try:
            data = bin_file.read_bytes()
            content_type = meta_file.read_text(encoding="utf-8").strip() or "image/jpeg"
            _MEDIA_CACHE[clean_url] = (data, content_type)
            return Response(
                content=data,
                media_type=content_type,
                headers={"Cache-Control": "public, max-age=604800"},
            )
        except Exception:
            pass

    # 5. Remote fetch with semaphore & fallback to unscaled
    client = _get_proxy_client()
    urls_to_try = [clean_url]
    if "/thumb/" in clean_url:
        import re

        unscaled = re.sub(
            r"/wikipedia/commons/thumb/([a-f0-9]/[a-f0-9]{2}/[^/]+)/.*",
            r"/wikipedia/commons/\1",
            clean_url,
        )
        if unscaled != clean_url:
            urls_to_try.append(unscaled)

    async with _PROXY_SEMAPHORE:
        for candidate_url in urls_to_try:
            try:
                resp = await client.get(candidate_url)
                if resp.status_code == 200 and len(resp.content) > 500:
                    content_type = resp.headers.get("content-type", "image/jpeg")
                    _MEDIA_CACHE[clean_url] = (resp.content, content_type)
                    try:
                        bin_file.write_bytes(resp.content)
                        meta_file.write_text(content_type, encoding="utf-8")
                    except Exception:
                        pass
                    return Response(
                        content=resp.content,
                        media_type=content_type,
                        headers={"Cache-Control": "public, max-age=604800"},
                    )
            except Exception:
                continue

    raise AppError(
        code="MEDIA_FETCH_FAILED",
        message="Unable to proxy authentic destination photograph.",
        status_code=502,
    )


@router.get("/{id_or_slug}/images", response_model=list[DestinationMedia])
async def get_destination_images(
    id_or_slug: str,
    limit: int = Query(8, ge=1, le=15, description="Maximum images to retrieve"),
    refresh: bool = Query(False, description="Bypass cache and query provider fresh"),
    repo: DestinationRepository = Depends(get_destination_repository),
) -> list[DestinationMedia]:
    """Retrieve 5-8 verified, distinct photographs for a destination."""
    dest = repo.get_by_slug(id_or_slug) or repo.get_by_id(id_or_slug)
    if not dest or dest.content_status != "published" or not dest.active:
        raise AppError(
            code="DESTINATION_NOT_FOUND",
            message=f"Destination '{id_or_slug}' was not found or is not published.",
            status_code=404,
        )

    search_svc = DestinationImageSearchService(repository=repo)
    images = await search_svc.search_destination_images(
        id_or_slug=id_or_slug,
        target_count=limit,
        force_refresh=refresh,
    )
    return images


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

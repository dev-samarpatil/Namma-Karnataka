"""Destination API v1 route handlers."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.core.errors import AppError
from app.repositories.destinations import DestinationRepository, get_destination_repository
from app.schemas.destinations import (
    DestinationCategory,
    DestinationFilterParams,
    DestinationListResponse,
    DestinationRead,
    LanguageCode,
)

router = APIRouter(prefix="/destinations", tags=["destinations"])


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


@router.get("/{id_or_slug}", response_model=DestinationRead)
def get_destination(
    id_or_slug: str,
    repo: DestinationRepository = Depends(get_destination_repository),
) -> DestinationRead:
    """Retrieve a single published destination by stable UUID or URL slug."""
    # Attempt resolution by slug first, then by UUID
    destination = repo.get_by_slug(id_or_slug)
    if not destination:
        destination = repo.get_by_id(id_or_slug)

    if not destination or destination.content_status != "published" or not destination.active:
        raise AppError(
            code="DESTINATION_NOT_FOUND",
            message=f"Destination '{id_or_slug}' was not found or is not published.",
            status_code=404,
        )

    return destination

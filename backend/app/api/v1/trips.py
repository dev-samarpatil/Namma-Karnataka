"""FastAPI routes for authenticated saved trips operations.

Ensures strict multi-tenant boundary checks: User identity is extracted
strictly from verified credentials, never from client body payload.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.errors import AppError
from app.repositories.trips import TripRepository, get_trip_repository
from app.schemas.trips import (
    SavedTripDetail,
    SaveTripRequest,
    TripListResponse,
)

router = APIRouter(prefix="/trips", tags=["Saved Trips"])


@router.post(
    "",
    response_model=SavedTripDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Save a planned itinerary under the user's account",
)
async def create_saved_trip(
    request: SaveTripRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    repo: TripRepository = Depends(get_trip_repository),
) -> SavedTripDetail:
    """Persist an itinerary snapshot associated with the authenticated user."""
    return repo.create_trip(user_id=current_user.user_id, request=request)


@router.get(
    "",
    response_model=TripListResponse,
    summary="List saved trips for the authenticated user",
)
async def list_saved_trips(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: AuthenticatedUser = Depends(get_current_user),
    repo: TripRepository = Depends(get_trip_repository),
) -> TripListResponse:
    """Retrieve paginated saved trips belonging strictly to the caller."""
    items, total = repo.list_user_trips(
        user_id=current_user.user_id,
        limit=limit,
        offset=offset,
    )
    return TripListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{trip_id}",
    response_model=SavedTripDetail,
    summary="Retrieve full detail of a specific saved trip",
)
async def get_saved_trip(
    trip_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    repo: TripRepository = Depends(get_trip_repository),
) -> SavedTripDetail:
    """Fetch trip detail if owned by the caller.

    Returns 404 if the trip does not exist or belongs to another user.
    """
    trip = repo.get_trip(user_id=current_user.user_id, trip_id=trip_id)
    if trip is None:
        raise AppError(
            code="TRIP_NOT_FOUND",
            message=f"Trip '{trip_id}' was not found or you do not have permission to access it.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return trip


@router.delete(
    "/{trip_id}",
    summary="Delete a saved trip",
)
async def delete_saved_trip(
    trip_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    repo: TripRepository = Depends(get_trip_repository),
) -> dict[str, str | bool]:
    """Delete a saved trip if owned by the caller.

    Returns 404 if the trip does not exist or belongs to another user.
    """
    deleted = repo.delete_trip(user_id=current_user.user_id, trip_id=trip_id)
    if not deleted:
        raise AppError(
            code="TRIP_NOT_FOUND",
            message=f"Trip '{trip_id}' was not found or you do not have permission to delete it.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return {"deleted": True, "trip_id": trip_id}

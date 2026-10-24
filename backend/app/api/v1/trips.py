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
    CreateTripShareRequest,
    SavedTripDetail,
    SaveTripRequest,
    SharedTripDetail,
    TripAuditHistoryResponse,
    TripListResponse,
    TripShareInfo,
    TripShareListResponse,
    UpdateSharedTripRequest,
    UpdateTripRequest,
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
    "/shared/{share_token}",
    response_model=SharedTripDetail,
    summary="Retrieve a shared trip via secure token",
)
async def get_shared_trip(
    share_token: str,
    repo: TripRepository = Depends(get_trip_repository),
) -> SharedTripDetail:
    """Access a shared itinerary using a valid, non-expired, non-revoked share token."""
    trip, error = repo.get_shared_trip(share_token)
    if error == "revoked":
        raise AppError(
            code="SHARE_REVOKED",
            message="This trip share link has been revoked by the owner.",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if error == "expired":
        raise AppError(
            code="SHARE_EXPIRED",
            message="This trip share link has expired.",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if trip is None:
        raise AppError(
            code="TRIP_NOT_FOUND",
            message="Shared trip not found or link is invalid.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return trip


@router.put(
    "/shared/{share_token}",
    response_model=SharedTripDetail,
    summary="Collaboratively update a shared itinerary",
)
async def update_shared_trip(
    share_token: str,
    request: UpdateSharedTripRequest,
    repo: TripRepository = Depends(get_trip_repository),
) -> SharedTripDetail:
    """Update a shared trip under optimistic concurrency control (requires editor permission)."""
    trip, error = repo.update_shared_trip(share_token, request)
    if error == "forbidden":
        raise AppError(
            code="SHARE_FORBIDDEN",
            message=(
                "Viewers do not have permission to modify this trip. "
                "Request editor access from the owner."
            ),
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if error == "revoked":
        raise AppError(
            code="SHARE_REVOKED",
            message="This trip share link has been revoked by the owner.",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if error == "expired":
        raise AppError(
            code="SHARE_EXPIRED",
            message="This trip share link has expired.",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if error == "conflict":
        raise AppError(
            code="TRIP_VERSION_CONFLICT",
            message=(
                "Trip version conflict: another collaborator has updated this trip. "
                "Please reload the latest plan before applying your edits."
            ),
            status_code=status.HTTP_409_CONFLICT,
        )

    if trip is None:
        raise AppError(
            code="TRIP_NOT_FOUND",
            message="Shared trip not found or link is invalid.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return trip


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


@router.put(
    "/{trip_id}",
    response_model=SavedTripDetail,
    summary="Update an existing saved trip",
)
async def update_saved_trip(
    trip_id: str,
    request: UpdateTripRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    repo: TripRepository = Depends(get_trip_repository),
) -> SavedTripDetail:
    """Update a saved trip if owned by the caller.

    Returns 404 if the trip does not exist or belongs to another user.
    """
    updated = repo.update_trip(
        user_id=current_user.user_id, trip_id=trip_id, request=request
    )
    if updated is None:
        raise AppError(
            code="TRIP_NOT_FOUND",
            message=f"Trip '{trip_id}' was not found or you do not have permission to modify it.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return updated


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


@router.post(
    "/{trip_id}/shares",
    response_model=TripShareInfo,
    status_code=status.HTTP_201_CREATED,
    summary="Create a secure share link for an owned trip",
)
async def create_trip_share(
    trip_id: str,
    request: CreateTripShareRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    repo: TripRepository = Depends(get_trip_repository),
) -> TripShareInfo:
    """Generate a viewer or editor share link for the caller's trip."""
    share = repo.create_share_link(
        user_id=current_user.user_id,
        trip_id=trip_id,
        role=request.role,
        expires_in_days=request.expires_in_days,
    )
    if share is None:
        raise AppError(
            code="TRIP_NOT_FOUND",
            message=f"Trip '{trip_id}' was not found or you do not have permission to share it.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return share


@router.get(
    "/{trip_id}/shares",
    response_model=TripShareListResponse,
    summary="List share links for an owned trip",
)
async def list_trip_shares(
    trip_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    repo: TripRepository = Depends(get_trip_repository),
) -> TripShareListResponse:
    """List all active and revoked share links for an owned trip."""
    shares = repo.list_shares(user_id=current_user.user_id, trip_id=trip_id)
    if shares is None:
        raise AppError(
            code="TRIP_NOT_FOUND",
            message=f"Trip '{trip_id}' was not found or you do not have permission to view shares.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return TripShareListResponse(items=shares, total=len(shares))


@router.delete(
    "/{trip_id}/shares/{share_id}",
    summary="Revoke an existing share link",
)
async def revoke_trip_share(
    trip_id: str,
    share_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    repo: TripRepository = Depends(get_trip_repository),
) -> dict[str, str | bool]:
    """Revoke a share link so it can no longer be used to access or edit the trip."""
    revoked = repo.revoke_share(
        user_id=current_user.user_id, trip_id=trip_id, share_id=share_id
    )
    if not revoked:
        raise AppError(
            code="SHARE_NOT_FOUND",
            message=(
                f"Share link '{share_id}' was not found or you do not have permission to revoke it."
            ),
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return {"revoked": True, "share_id": share_id}


@router.get(
    "/{trip_id}/history",
    response_model=TripAuditHistoryResponse,
    summary="Retrieve audit change history for a trip",
)
async def get_trip_history(
    trip_id: str,
    share_token: str | None = Query(default=None),
    current_user: AuthenticatedUser = Depends(get_current_user),
    repo: TripRepository = Depends(get_trip_repository),
) -> TripAuditHistoryResponse:
    """Retrieve chronological audit trail of edits and actions for a trip."""
    history = repo.get_trip_history(
        trip_id=trip_id,
        user_id=current_user.user_id if current_user else None,
        share_token=share_token,
    )
    if history is None:
        raise AppError(
            code="TRIP_NOT_FOUND",
            message=(
                f"Trip '{trip_id}' was not found or you do not have permission to view its history."
            ),
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return TripAuditHistoryResponse(items=history, total=len(history))



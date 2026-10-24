"""Schemas for Trip persistence and saved trip operations."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.planning import PlanningRecommendationResponse


class StrictBaseModel(BaseModel):
    """Base schema enforcing whitespace stripping and forbidding unexpected extra keys."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )


class SaveTripRequest(StrictBaseModel):
    """Payload submitted to persist a planned itinerary under the user's account."""

    title: str = Field(..., min_length=1, max_length=160, description="User-assigned trip title")
    origin_label: str = Field(..., min_length=1, max_length=100, description="Starting hub / city")
    duration_days: int = Field(..., ge=1, le=14, description="Trip duration in days")
    pace: str = Field(
        ...,
        pattern="^(relaxed|balanced|packed)$",
        description="Travel intensity",
    )
    is_offbeat_preferred: bool = Field(default=False)
    preferences: dict[str, Any] = Field(default_factory=dict)
    budget_min_inr: float | None = Field(default=None, ge=0)
    budget_max_inr: float | None = Field(default=None, ge=0)
    currency_code: str = Field(default="INR", pattern="^INR$")
    idempotency_key: str | None = Field(
        default=None,
        max_length=128,
        description="Optional client mutation identifier for safe import/creation retry",
    )
    itinerary: PlanningRecommendationResponse = Field(
        ..., description="Full verified itinerary response to snapshot"
    )


class SavedTripSummary(StrictBaseModel):
    """Lightweight summary of a saved trip for collection views."""

    id: str
    title: str
    origin_label: str
    duration_days: int
    pace: str
    budget_min_inr: float | None = None
    budget_max_inr: float | None = None
    currency_code: str = "INR"
    total_stops: int
    version: int = 1
    created_at: str
    updated_at: str


class SavedTripDetail(StrictBaseModel):
    """Full detail view of an authenticated saved trip, including its snapshot."""

    id: str
    user_id: str
    title: str
    origin_label: str
    duration_days: int
    pace: str
    is_offbeat_preferred: bool = False
    preferences: dict[str, Any] = Field(default_factory=dict)
    budget_min_inr: float | None = None
    budget_max_inr: float | None = None
    currency_code: str = "INR"
    status: str = "active"
    version: int = 1
    last_modified_by: str | None = None
    snapshot: PlanningRecommendationResponse
    created_at: str
    updated_at: str


class TripListResponse(StrictBaseModel):
    """Paginated collection of saved trip summaries."""

    items: list[SavedTripSummary]
    total: int
    limit: int
    offset: int


class UpdateTripRequest(StrictBaseModel):
    """Payload submitted to update an existing saved trip under the user's account."""

    title: str | None = Field(default=None, min_length=1, max_length=160)
    expected_version: int | None = Field(
        default=None, ge=1, description="Optional optimistic concurrency control check"
    )
    idempotency_key: str | None = Field(
        default=None,
        max_length=128,
        description="Optional client mutation identifier for safe offline retry",
    )
    itinerary: PlanningRecommendationResponse = Field(
        ..., description="Updated verified itinerary response to snapshot"
    )


class CreateTripShareRequest(StrictBaseModel):
    """Request to generate a secure share link for a trip."""

    role: str = Field(..., pattern="^(viewer|editor)$", description="Role granted to recipient")
    expires_in_days: int | None = Field(
        default=30, ge=1, le=365, description="Token validity duration in days"
    )


class TripShareInfo(StrictBaseModel):
    """Information regarding an active or historical trip share link."""

    id: str
    trip_id: str
    created_by: str
    role: str
    share_token: str
    expires_at: str | None = None
    is_revoked: bool = False
    created_at: str


class TripShareListResponse(StrictBaseModel):
    """Collection of share links associated with a trip."""

    items: list[TripShareInfo]
    total: int


class SharedTripDetail(StrictBaseModel):
    """Shared trip view accessible via a valid share token."""

    id: str
    title: str
    origin_label: str
    duration_days: int
    pace: str
    is_offbeat_preferred: bool = False
    budget_min_inr: float | None = None
    budget_max_inr: float | None = None
    currency_code: str = "INR"
    version: int = 1
    role: str = Field(..., pattern="^(viewer|editor)$")
    snapshot: PlanningRecommendationResponse
    created_at: str
    updated_at: str


class UpdateSharedTripRequest(StrictBaseModel):
    """Collaborator payload to update a shared itinerary."""

    expected_version: int = Field(
        ..., ge=1, description="Expected trip version for optimistic locking"
    )
    idempotency_key: str | None = Field(
        default=None,
        max_length=128,
        description="Optional client mutation identifier for safe offline retry",
    )
    title: str | None = Field(default=None, min_length=1, max_length=160)
    itinerary: PlanningRecommendationResponse = Field(
        ..., description="Updated itinerary recommendation snapshot"
    )


class TripAuditEvent(StrictBaseModel):
    """Immutable log entry for a trip lifecycle action."""

    id: str
    trip_id: str
    actor_type: str = Field(..., pattern="^(owner|editor|guest)$")
    actor_id: str | None = None
    action: str
    summary: str
    version_before: int | None = None
    version_after: int | None = None
    created_at: str


class TripAuditHistoryResponse(StrictBaseModel):
    """Audit log history for a trip."""

    items: list[TripAuditEvent]
    total: int

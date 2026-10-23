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
    snapshot: PlanningRecommendationResponse
    created_at: str
    updated_at: str


class TripListResponse(StrictBaseModel):
    """Paginated collection of saved trip summaries."""

    items: list[SavedTripSummary]
    total: int
    limit: int
    offset: int

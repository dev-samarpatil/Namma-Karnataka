"""Pydantic schemas for AI planning requests, raw model outputs, and recommendations."""

from __future__ import annotations

from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.destinations import (
    AccessStatus,
    Coordinates,
    DestinationCategory,
    DestinationSourceRead,
    LanguageCode,
)


class StrictSchema(BaseModel):
    """Base schema enforcing whitespace stripping and forbidding unexpected extra keys."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
        use_enum_values=True,
    )


class StopType(StrEnum):
    """Classification of stops within a daily travel plan."""

    ATTRACTION = "attraction"
    ACTIVITY = "activity"
    MEAL = "meal"
    ACCOMMODATION = "accommodation"
    TRANSPORT = "transport"
    BREAK = "break"
    EVENT = "event"


class CostStatus(StrEnum):
    """Transparency status of a monetary figure."""

    VERIFIED = "verified"
    ESTIMATED = "estimated"
    USER_PROVIDED = "user_provided"
    UNKNOWN = "unknown"
    NOT_APPLICABLE = "not_applicable"


class PlanningRequest(StrictSchema):
    """User preferences for generating travel recommendations."""

    language: LanguageCode = LanguageCode.EN
    origin_label: str = Field("Bengaluru", min_length=1, max_length=160)
    duration_days: Annotated[
        int, Field(ge=1, le=7, description="Travel duration from 1 to 7 days")
    ] = 2
    travelers_count: Annotated[
        int, Field(ge=1, le=20, description="Number of travelers in the party")
    ] = 1
    start_date: str | None = Field(
        None, max_length=20, description="Optional start date YYYY-MM-DD"
    )
    preferred_districts: list[str] = Field(
        default_factory=list,
        description="Optional district code filters without arbitrary limits",
    )
    categories: list[DestinationCategory] = Field(
        default_factory=list,
        description="Preferred categories e.g. ['heritage', 'waterfall'] without arbitrary limits",
    )
    pace: str = Field(
        "balanced",
        pattern="^(relaxed|balanced|packed)$",
        description="Travel intensity: 'relaxed' (2 stops/day), 'balanced' (3), 'packed' (4)",
    )
    is_offbeat_preferred: bool = Field(
        False, description="Whether to prioritize editorial offbeat destinations"
    )
    travel_mode: str = Field(
        "driving_car",
        pattern="^(driving_car|cab_taxi|public_transit|mixed)$",
        description="Transportation mode: driving_car, cab_taxi, public_transit, or mixed",
    )
    budget_scenario: str = Field(
        "standard",
        pattern="^(budget|standard|comfort)$",
        description="Budget preference profile: budget, standard, or comfort",
    )
    budget_limit_inr: float | None = Field(
        None,
        gt=0.0,
        le=10_000_000.0,
        description="Optional maximum budget spending limit in INR (entire trip or per-traveler)",
    )
    budget_scope: str = Field(
        "total_trip",
        pattern="^(total_trip|per_person)$",
        description="Budget limit scope: 'total_trip' (entire party) or 'per_person'",
    )
    fuel_efficiency_km_per_litre: float = Field(
        14.0,
        gt=0.0,
        le=50.0,
        description="Vehicle fuel efficiency in km/litre for private driving",
    )
    fuel_price_per_litre: float = Field(
        102.86,
        ge=50.0,
        le=200.0,
        description="Fuel price in INR per litre (Karnataka 2026 baseline ₹102.86/L)",
    )
    is_return_trip: bool = Field(
        True,
        description="Whether transport calculations include the return trip back to origin",
    )
    notes: str | None = Field(None, max_length=300, description="Optional brief user notes")


class RawAIPlanItem(StrictSchema):
    """Single item returned by the LLM in structured JSON mode."""

    destination_id: str = Field(
        ...,
        min_length=1,
        max_length=120,
        description="Must match candidate destination slug or UUID",
    )
    day_number: int = Field(ge=1, le=7, description="Day number of stop")
    order: int = Field(ge=1, le=10, description="Sequence order within the day")
    rationale: str = Field(..., min_length=1, max_length=300, description="Brief curated rationale")


class RawAIPlanResponse(StrictSchema):
    """Raw structured output schema requested from the AI provider."""

    items: list[RawAIPlanItem] = Field(
        ..., min_length=1, max_length=28, description="List of recommended stops"
    )
    notes: str | None = Field(None, max_length=500)


class RecommendedDestination(StrictSchema):
    """Authoritative, grounded destination recommendation returned to the client."""

    id: str
    slug: str
    name: str
    summary: str | None = None
    category: DestinationCategory
    district_code: str
    district_name: str | None = None
    coordinates: Coordinates | None = None
    day_number: int
    order: int
    rationale: str
    entry_fee_min_inr: float | None = None
    entry_fee_max_inr: float | None = None
    currency_code: str = "INR"
    access_status: AccessStatus
    is_offbeat: bool
    sources: list[DestinationSourceRead] = Field(default_factory=list)


class ItineraryStop(StrictSchema):
    """Rich, chronological stop in a day's travel schedule."""

    stop_id: str = Field(..., description="Unique stop identifier")
    destination_id: str | None = Field(None, description="Catalog destination ID if applicable")
    stop_type: StopType = Field(
        ..., description="Type of stop: attraction, meal, accommodation, etc."
    )
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    start_time: str = Field(..., description="Scheduled start time e.g. '09:00'")
    end_time: str = Field(..., description="Scheduled end time e.g. '11:00'")
    duration_minutes: int = Field(..., ge=1, le=720)
    coordinates: Coordinates | None = None
    distance_from_prev_km: float | None = None
    transit_from_prev_minutes: int | None = None
    transit_method: str | None = Field(
        None, description="'straight_line_estimate' or 'local_transit'"
    )
    cost_min_inr: float | None = None
    cost_max_inr: float | None = None
    currency: str = "INR"
    cost_status: CostStatus = CostStatus.VERIFIED
    source_reference: str | None = None
    rationale: str | None = None
    notes: str | None = Field(
        None, max_length=500, description="User-provided notes or custom details"
    )
    user_modified: bool = Field(False, description="Flag indicating user customization")
    locked: bool = Field(False, description="Flag preventing automated reordering or regeneration")


class DayPlan(StrictSchema):
    """Structured daily itinerary with chronological stops, meals, transit, and lodgings."""

    day_number: int = Field(..., ge=1, le=7)
    date: str | None = None
    theme: str = Field("Day Exploration", min_length=1, max_length=200)
    stops: list[ItineraryStop] = Field(default_factory=list)
    total_duration_minutes: int = 0
    transit_minutes: int = 0
    driving_distance_km: float | None = None
    start_location_name: str | None = None
    start_coordinates: Coordinates | None = None
    end_location_name: str | None = None
    end_coordinates: Coordinates | None = None
    accommodation_name: str | None = None
    meals_covered: list[str] = Field(default_factory=list)
    daily_cost_min_inr: float | None = None
    daily_cost_max_inr: float | None = None
    warnings: list[str] = Field(default_factory=list)


class BudgetCategoryItem(StrictSchema):
    """Detailed category line-item within the transparent travel budget."""

    category_name: str
    estimated_min_inr: float | None = None
    estimated_max_inr: float | None = None
    cost_status: CostStatus
    calculation_basis: str
    notes: str | None = None
    basis_type: str = Field(
        "per_group",
        description="'per_person' or 'per_group'",
    )
    subtotal_type: str = Field(
        "estimated",
        description="'verified' or 'estimated' or 'contingency'",
    )


class CompleteBudgetBreakdown(StrictSchema):
    """Authoritative, Python-calculated budget breakdown with explicit cost statuses."""

    grand_total_min_inr: float | None = None
    grand_total_max_inr: float | None = None
    per_person_min_inr: float | None = None
    per_person_max_inr: float | None = None
    verified_subtotal_inr: float = 0.0
    estimated_subtotal_min_inr: float = 0.0
    estimated_subtotal_max_inr: float = 0.0
    currency: str = "INR"
    traveler_count: int = 1
    travel_mode_used: str = "driving_car"
    budget_scenario_used: str = "standard"
    is_return_trip: bool = True
    budget_limit_inr: float | None = None
    budget_scope: str = "total_trip"
    is_budget_feasible: bool = True
    budget_overrun_inr: float | None = None
    categories: list[BudgetCategoryItem] = Field(default_factory=list)
    has_unknown_costs: bool = False
    calculation_notes: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class PlanningRecommendationResponse(StrictSchema):
    """Complete API response for travel planning recommendations."""

    request_id: str | None = None
    language: LanguageCode
    generation_mode: str = Field(
        ..., description="'ai' when generated by LLM, 'fallback' when rule-based engine used"
    )
    provider_used: str = Field(..., description="Name of provider or 'deterministic_fallback'")
    items: list[RecommendedDestination]
    total_destinations: int
    duration_days: int
    days: list[DayPlan] = Field(default_factory=list)
    budget_breakdown: CompleteBudgetBreakdown | None = None
    origin_label: str | None = None
    corridor_name: str | None = None
    assumptions: list[str] = Field(default_factory=list)
    data_limitations: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class StopEditRequest(StrictSchema):
    """Request payload to modify an existing itinerary stop."""

    stop_id: str = Field(..., min_length=1, max_length=120)
    day_number: int = Field(..., ge=1, le=7)
    start_time: str | None = Field(None, pattern=r"^[0-2][0-9]:[0-5][0-9]$")
    duration_minutes: int | None = Field(None, ge=15, le=720)
    notes: str | None = Field(None, max_length=500)
    locked: bool | None = None


class StopAddRequest(StrictSchema):
    """Request payload to add a verified destination stop to a day."""

    day_number: int = Field(..., ge=1, le=7)
    destination_id: str = Field(..., min_length=1, max_length=120)
    position_index: int | None = Field(None, ge=0)
    notes: str | None = Field(None, max_length=500)


class StopRemoveRequest(StrictSchema):
    """Request payload to remove an itinerary stop."""

    day_number: int = Field(..., ge=1, le=7)
    stop_id: str = Field(..., min_length=1, max_length=120)


class StopReorderRequest(StrictSchema):
    """Request payload to reorder attractions within a day."""

    day_number: int = Field(..., ge=1, le=7)
    stop_ids: list[str] = Field(..., min_length=1, max_length=20)


class StopRegenerateCandidate(StrictSchema):
    """Grounded alternative destination proposal for replacing an itinerary stop."""

    destination_id: str
    slug: str
    name: str
    summary: str | None = None
    category: DestinationCategory
    district_code: str
    district_name: str | None = None
    coordinates: Coordinates | None = None
    estimated_visit_minutes: int = 90
    entry_fee_min_inr: float | None = None
    entry_fee_max_inr: float | None = None
    cost_status: CostStatus = CostStatus.VERIFIED
    distance_delta_km: float | None = None
    transit_delta_minutes: int | None = None
    fee_difference_inr: float | None = None
    rationale: str


class StopRegenerateRequest(StrictSchema):
    """Request to find grounded alternatives for an itinerary stop."""

    day_number: int = Field(..., ge=1, le=7)
    stop_id: str = Field(..., min_length=1, max_length=120)
    preferred_category: DestinationCategory | None = None
    request: PlanningRequest
    current_plan: PlanningRecommendationResponse


class StopRegenerateResponse(StrictSchema):
    """Grounded alternative candidates returned for stop replacement."""

    original_stop_id: str
    day_number: int
    candidates: list[StopRegenerateCandidate]


class DayRegenerateRequest(StrictSchema):
    """Request to regenerate attractions for an entire day while keeping locked stops."""

    day_number: int = Field(..., ge=1, le=7)
    request: PlanningRequest
    current_plan: PlanningRecommendationResponse


class ItineraryRecalculateRequest(StrictSchema):
    """Request to deterministically recalculate schedule and budget after user edits."""

    request: PlanningRequest
    days: list[DayPlan]
    generation_mode: str = "ai"
    provider_used: str = "deterministic_scheduler"

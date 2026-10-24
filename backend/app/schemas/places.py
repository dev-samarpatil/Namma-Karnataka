"""Pydantic v2 schemas for Restaurant and Accommodation place discovery."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class PlaceType(StrEnum):
    RESTAURANT = "restaurant"
    ACCOMMODATION = "accommodation"


class PriceTier(StrEnum):
    BUDGET = "budget"
    MID_RANGE = "mid_range"
    PREMIUM = "premium"


class PriceStatus(StrEnum):
    VERIFIED = "verified"
    ESTIMATED = "estimated"
    UNKNOWN = "unknown"


class DataSourceType(StrEnum):
    CURATED_VERIFIED = "curated_verified"
    LIVE_PROVIDER = "live_provider"
    CACHED_PROVIDER = "cached_provider"


class AccommodationType(StrEnum):
    HOTEL = "hotel"
    RESORT = "resort"
    HOMESTAY = "homestay"
    LODGE = "lodge"
    HERITAGE = "heritage"


class StrictSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
        use_enum_values=True,
    )


class RestaurantRead(StrictSchema):
    """Schema representing a verified dining establishment."""

    id: str = Field(..., description="Unique slug or identifier")
    name_en: str = Field(..., min_length=1, max_length=200)
    name_kn: str = Field(..., min_length=1, max_length=200)
    place_type: PlaceType = PlaceType.RESTAURANT
    district_code: str = Field(..., max_length=16)
    nearby_destination_slug: str = Field(..., max_length=120)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address_en: str = Field(..., min_length=1)
    address_kn: str | None = None
    cuisines: list[str] = Field(default_factory=list)
    is_vegetarian: bool = False
    price_tier: PriceTier = PriceTier.MID_RANGE
    estimated_cost_per_person_inr: float | None = Field(None, ge=0.0)
    price_status: PriceStatus = PriceStatus.ESTIMATED
    opening_hours: str | None = None
    source_name: str = Field(..., min_length=1)
    source_type: DataSourceType = DataSourceType.CURATED_VERIFIED
    verified_at: str | datetime = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    user_notes_en: str | None = None
    user_notes_kn: str | None = None
    distance_km: float | None = Field(None, ge=0.0)


class AccommodationRead(StrictSchema):
    """Schema representing a verified accommodation establishment."""

    id: str = Field(..., description="Unique slug or identifier")
    name_en: str = Field(..., min_length=1, max_length=200)
    name_kn: str = Field(..., min_length=1, max_length=200)
    place_type: PlaceType = PlaceType.ACCOMMODATION
    accommodation_type: AccommodationType = AccommodationType.HOTEL
    district_code: str = Field(..., max_length=16)
    nearby_destination_slug: str = Field(..., max_length=120)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address_en: str = Field(..., min_length=1)
    address_kn: str | None = None
    price_tier: PriceTier = PriceTier.MID_RANGE
    estimated_cost_per_night_inr: float | None = Field(None, ge=0.0)
    price_status: PriceStatus = PriceStatus.ESTIMATED
    amenities: list[str] = Field(default_factory=list)
    booking_reference_url: str | None = None
    source_name: str = Field(..., min_length=1)
    source_type: DataSourceType = DataSourceType.CURATED_VERIFIED
    verified_at: str | datetime = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    user_notes_en: str | None = None
    user_notes_kn: str | None = None
    distance_km: float | None = Field(None, ge=0.0)


class PlaceSearchFilter(StrictSchema):
    """Query parameters for place search."""

    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    radius_km: float = Field(25.0, gt=0.0, le=100.0)
    place_type: PlaceType | None = None
    cuisine: str | None = None
    is_vegetarian: bool | None = None
    accommodation_type: AccommodationType | None = None
    price_tier: PriceTier | None = None
    max_results: int = Field(10, ge=1, le=50)

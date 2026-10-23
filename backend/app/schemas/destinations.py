"""Pydantic v2 schemas for Destination catalog domain and API representations."""

from __future__ import annotations

import re
from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator

# ============================================================================
# Enums and Controlled Vocabularies
# ============================================================================

class LanguageCode(StrEnum):
    EN = "en"
    KN = "kn"


class DestinationCategory(StrEnum):
    NATURE = "nature"
    WATERFALL = "waterfall"
    HILL_STATION = "hill_station"
    VIEWPOINT = "viewpoint"
    HERITAGE = "heritage"
    ARCHITECTURE = "architecture"
    BEACH = "beach"
    WILDLIFE = "wildlife"
    FOOD_CULTURE = "food_culture"
    SPIRITUAL_CULTURAL = "spiritual_cultural"
    ADVENTURE = "adventure"
    MUSEUM = "museum"
    TOWN_CITY = "town_city"
    OTHER = "other"


class AccessStatus(StrEnum):
    OPEN_REPORTED = "open_reported"
    RESTRICTED = "restricted"
    SEASONAL = "seasonal"
    CLOSED_REPORTED = "closed_reported"
    UNKNOWN = "unknown"


class VerificationStatus(StrEnum):
    HUMAN_REVIEWED = "human_reviewed"
    SOURCE_CHECKED = "source_checked"
    NEEDS_REVIEW = "needs_review"
    STALE = "stale"
    UNKNOWN = "unknown"


class ContentStatus(StrEnum):
    DRAFT = "draft"
    REVIEWED = "reviewed"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class SourceType(StrEnum):
    GOVERNMENT_OFFICIAL = "government_official"
    TOURISMB_BOARD = "tourism_board"
    VERIFIED_EDITORIAL = "verified_editorial"
    ACADEMIC = "academic"
    FIELD_REPORT = "field_report"
    OTHER = "other"


class TranslationStatus(StrEnum):
    HUMAN_REVIEWED = "human_reviewed"
    PROVIDER_GENERATED = "provider_generated"
    NEEDS_REVIEW = "needs_review"
    NOT_AVAILABLE = "not_available"


SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


# ============================================================================
# Core Types & Value Objects
# ============================================================================

class StrictSchema(BaseModel):
    """Base schema enforcing whitespace stripping and strict extra fields."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
        use_enum_values=True,
    )


class Coordinates(StrictSchema):
    """Geographic WGS84 point coordinates with bounds validation."""

    lat: Annotated[float, Field(ge=-90.0, le=90.0, description="Latitude in decimal degrees")]
    lon: Annotated[float, Field(ge=-180.0, le=180.0, description="Longitude in decimal degrees")]


class DistrictSummary(StrictSchema):
    """District reference summary."""

    code: str = Field(..., max_length=16, description="District code e.g. 'KA-MYS'")
    name_en: str = Field(..., max_length=100, description="District English name")
    name_kn: str = Field(..., max_length=100, description="District Kannada name")


class DestinationTranslationRead(StrictSchema):
    """Localized textual presentation for a single language."""

    language_code: LanguageCode
    name: str = Field(..., min_length=1, max_length=200)
    summary: str | None = Field(None, max_length=500)
    description: str | None = None
    how_to_reach: str | None = None
    accessibility_notes: str | None = None
    translation_status: TranslationStatus = TranslationStatus.NEEDS_REVIEW


class DestinationSourceRead(StrictSchema):
    """Source provenance and verification citation."""

    source_name: str = Field(..., min_length=1, max_length=200)
    source_url: str | None = None
    source_type: SourceType = SourceType.OTHER
    claim_scope: str = Field(..., min_length=1, max_length=100)
    checked_at: str | datetime = Field(
        default_factory=lambda: datetime.now(UTC).isoformat()
    )
    license_notes: str | None = None
    attribution_required: bool = False


# ============================================================================
# Destination Entity Models
# ============================================================================

class DestinationBase(StrictSchema):
    """Base destination model capturing core business invariants."""

    slug: str = Field(..., min_length=2, max_length=120)
    district_code: str = Field(..., max_length=16)
    category: DestinationCategory
    coordinates: Coordinates | None = None
    access_status: AccessStatus = AccessStatus.UNKNOWN
    verification_status: VerificationStatus = VerificationStatus.UNKNOWN
    content_status: ContentStatus = ContentStatus.DRAFT
    is_offbeat: bool = False
    estimated_visit_minutes: int | None = Field(None, ge=1)
    entry_fee_min_inr: float | None = Field(None, ge=0.0)
    entry_fee_max_inr: float | None = Field(None, ge=0.0)
    currency_code: str = Field("INR", max_length=3)
    active: bool = True
    translations: list[DestinationTranslationRead] = Field(default_factory=list)
    sources: list[DestinationSourceRead] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_invariants(self) -> DestinationBase:
        # Validate slug format
        if not SLUG_PATTERN.match(self.slug):
            raise ValueError(
                f"Slug '{self.slug}' must be lowercase kebab-case (e.g. 'mysore-palace')"
            )

        # Validate fee ranges
        if self.entry_fee_min_inr is not None and self.entry_fee_max_inr is not None:
            if self.entry_fee_min_inr > self.entry_fee_max_inr:
                raise ValueError(
                    f"entry_fee_min_inr ({self.entry_fee_min_inr}) cannot exceed "
                    f"entry_fee_max_inr ({self.entry_fee_max_inr})"
                )

        # Currency code validation
        if self.currency_code != "INR":
            raise ValueError(f"Only INR currency is currently supported, got: {self.currency_code}")

        return self


class DestinationRead(DestinationBase):
    """Full internal destination model with primary key and metadata."""

    id: str = Field(..., description="Stable destination UUID")
    district: DistrictSummary | None = None
    created_at: datetime | str | None = None
    updated_at: datetime | str | None = None


class DestinationPublicItem(StrictSchema):
    """Publicly presented destination projection for client discovery."""

    id: str
    slug: str
    name: str
    summary: str | None = None
    description: str | None = None
    how_to_reach: str | None = None
    accessibility_notes: str | None = None
    category: DestinationCategory
    district_code: str
    district_name: str | None = None
    coordinates: Coordinates | None = None
    access_status: AccessStatus
    verification_status: VerificationStatus
    is_offbeat: bool
    estimated_visit_minutes: int | None = None
    entry_fee_min_inr: float | None = None
    entry_fee_max_inr: float | None = None
    currency_code: str = "INR"
    language_code: LanguageCode = LanguageCode.EN
    sources: list[DestinationSourceRead] = Field(default_factory=list)


class DestinationListResponse(StrictSchema):
    """Paginated collection of destinations."""

    items: list[DestinationRead]
    total: int = Field(..., ge=0)
    limit: int = Field(..., ge=1, le=100)
    offset: int = Field(..., ge=0)
    has_more: bool


class DestinationFilterParams(StrictSchema):
    """Validated query parameters for reading destination catalogs."""

    q: str | None = Field(None, max_length=120)
    district: str | None = Field(None, max_length=16)
    category: DestinationCategory | None = None
    is_offbeat: bool | None = None
    lang: LanguageCode = LanguageCode.EN
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)

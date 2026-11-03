"""Base interfaces and normalized contracts for Destination Discovery Engine.

Defines the DiscoveredDestination contract with explicit provenance,
verification status, confidence scores, and genuine offbeat indicators.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from enum import Enum
from typing import Sequence
from pydantic import BaseModel, Field


class VerificationStatus(str, Enum):
    VERIFIED = "VERIFIED"
    COMMUNITY_SOURCED = "COMMUNITY_SOURCED"
    DISCOVERED_UNVERIFIED = "DISCOVERED_UNVERIFIED"
    RESTRICTED = "RESTRICTED"
    TEMPORARILY_CLOSED = "TEMPORARILY_CLOSED"


class ProvenanceSource(str, Enum):
    OFFICIAL_KARNATAKA_TOURISM = "OFFICIAL_KARNATAKA_TOURISM"
    ASI_ARCHAEOLOGICAL_SURVEY = "ASI_ARCHAEOLOGICAL_SURVEY"
    DISTRICT_GAZETTEER = "DISTRICT_GAZETTEER"
    OPEN_STREET_MAP = "OPEN_STREET_MAP"
    COMMUNITY_CURATED = "COMMUNITY_CURATED"


class DiscoveredDestination(BaseModel):
    """Normalized contract for destinations discovered across disparate sources."""

    id: str
    slug: str
    name_en: str
    name_kn: str
    category: str
    district: str
    district_code: str
    latitude: float
    longitude: float
    description_en: str
    description_kn: str | None = None
    historical_significance_en: str | None = None
    cultural_significance_en: str | None = None
    best_time_to_visit: str | None = None
    ideal_duration_hours: float = 1.5
    difficulty_level: str = "easy"  # easy, moderate, challenging
    entry_fee_min_inr: float | None = 0.0
    entry_fee_max_inr: float | None = 0.0
    entry_fee_status: str = "VERIFIED"  # VERIFIED, ESTIMATED, FREE, UNKNOWN
    timings_en: str | None = "6:00 AM - 6:00 PM"
    opening_time: str | None = "06:00"
    closing_time: str | None = "18:00"
    verification_status: VerificationStatus = VerificationStatus.VERIFIED
    provenance_source: ProvenanceSource = ProvenanceSource.OFFICIAL_KARNATAKA_TOURISM
    source_id: str | None = None
    source_url: str | None = None
    last_verified_at: str | None = None
    offbeat_score: float = Field(0.0, ge=0.0, le=1.0)
    is_offbeat: bool = False
    confidence_score: float = Field(0.9, ge=0.0, le=1.0)
    image_url: str | None = None
    tags: list[str] = Field(default_factory=list)


class DiscoveryProvider(ABC):
    """Abstract provider interface for multi-source destination discovery."""

    @abstractmethod
    def get_source_name(self) -> ProvenanceSource:
        """Return the provenance source tag."""
        pass

    @abstractmethod
    def search(
        self,
        latitude: float | None = None,
        longitude: float | None = None,
        radius_km: float = 50.0,
        district: str | None = None,
        categories: Sequence[str] | None = None,
        offbeat_only: bool = False,
        limit: int = 20,
    ) -> list[DiscoveredDestination]:
        """Search and return discovered destinations matching query parameters."""
        pass


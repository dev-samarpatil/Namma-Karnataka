"""Pydantic v2 schemas for AI Visual Place Discovery from photos and videos."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class StrictSchema(BaseModel):
    """Base strict schema with whitespace trimming and forbidden extra fields."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
        use_enum_values=True,
    )


class ConfidenceLabel(StrEnum):
    STRONG_MATCH = "strong_match"
    POSSIBLE_MATCH = "possible_match"
    UNCERTAIN_SUGGESTION = "uncertain_suggestion"


class VisualEvidence(StrictSchema):
    """Observable visual features extracted during analysis."""

    observed_features: list[str] = Field(
        default_factory=list,
        description="List of observed architectural, natural, or structural features",
    )
    architectural_style: str | None = Field(
        None, description="Identified architectural school (e.g., Hoysala, Chalukya, Indo-Saracenic)"
    )
    landscape_clues: list[str] = Field(
        default_factory=list, description="Terrain, flora, coastline, or waterbody cues"
    )
    detected_signage: str | None = Field(
        None, description="Visible text or signage detected in the frame"
    )
    notes: str | None = Field(
        None, description="Observational reasoning distinguishing facts from interpretation"
    )


class VisualDiscoveryCandidate(StrictSchema):
    """Grounded candidate destination matched against the verified catalogue."""

    destination_id: str = Field(..., description="UUID matching a verified catalogue record")
    slug: str = Field(..., description="Canonical URL-safe destination slug")
    name_en: str = Field(..., min_length=1, max_length=200)
    name_kn: str = Field(..., min_length=1, max_length=200)
    district_code: str = Field(..., max_length=16)
    district_name_en: str | None = None
    district_name_kn: str | None = None
    category: str = Field(..., description="Destination category")
    summary_en: str | None = None
    summary_kn: str | None = None
    match_score: Annotated[float, Field(ge=0.0, le=1.0, description="Normalized match score")]
    confidence_label: ConfidenceLabel
    matching_reasons: list[str] = Field(
        default_factory=list, description="Reasons connecting visual observations to catalogue record"
    )
    visual_evidence: VisualEvidence | None = None
    uncertainty_notes: str | None = Field(
        None, description="Honest statement of ambiguity or alternative interpretations"
    )
    image_url: str | None = Field(
        None, description="Representative verified thumbnail from the destination catalogue"
    )


class VisualDiscoveryResponse(StrictSchema):
    """Structured response for visual discovery queries."""

    query_type: str = Field(..., description="'image' or 'video'")
    is_confident: bool = Field(
        ..., description="True if top candidate meets confidence threshold; False if ambiguous"
    )
    message_en: str = Field(..., description="User-facing summary message in English")
    message_kn: str = Field(..., description="User-facing summary message in Kannada")
    candidates: list[VisualDiscoveryCandidate] = Field(
        default_factory=list, description="Ranked catalogue candidates (empty if no match)"
    )
    sampled_frame_count: int | None = Field(
        None, description="Number of video frames sampled (for video queries)"
    )
    analyzed_at: str | datetime = Field(
        default_factory=lambda: datetime.now(UTC).isoformat(),
        description="Timestamp of analysis",
    )
    privacy_notice: str = Field(
        default="Your uploaded media was processed ephemerally in memory and was not permanently stored.",
        description="Explicit privacy disclosure regarding uploaded data handling",
    )

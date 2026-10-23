"""Validation, defensive parsing, and destination grounding pipeline for AI outputs."""

from __future__ import annotations

import json
import re

from pydantic import ValidationError

from app.schemas.destinations import DestinationRead, LanguageCode
from app.schemas.planning import (
    RawAIPlanResponse,
    RecommendedDestination,
)


class AIValidationError(Exception):
    """Raised when provider output fails parsing, schema validation, or catalog grounding."""

    def __init__(self, message: str, code: str = "AI_OUTPUT_INVALID") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


def strip_markdown_fences(raw_text: str) -> str:
    """Strip surrounding markdown code fences (```json ... ```) defensively."""
    text = raw_text.strip()
    if text.startswith("```"):
        # Match ```json or ``` at start
        text = re.sub(r"^```(?:json)?\s*\n?", "", text, flags=re.IGNORECASE)
        # Match ``` at end
        text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def parse_and_ground_plan(
    raw_text: str,
    candidates: list[DestinationRead],
    language: LanguageCode = LanguageCode.EN,
) -> list[RecommendedDestination]:
    """Parse, validate schema, and ground AI-produced recommendations.

    1. Defensive markdown fence stripping.
    2. JSON parsing.
    3. Pydantic schema validation into RawAIPlanResponse.
    4. Strict destination catalog grounding against candidate allowlist.
    5. Authoritative hydration using DestinationRepository data.
    """
    cleaned_json = strip_markdown_fences(raw_text)
    if not cleaned_json:
        raise AIValidationError("Empty output received from AI provider")

    try:
        data = json.loads(cleaned_json)
    except json.JSONDecodeError as exc:
        raise AIValidationError(
            f"Failed to parse provider response as JSON: {exc}",
            code="AI_OUTPUT_INVALID",
        ) from exc

    try:
        raw_plan = RawAIPlanResponse.model_validate(data)
    except ValidationError as exc:
        raise AIValidationError(
            f"Provider output failed schema validation: {exc}",
            code="AI_OUTPUT_INVALID",
        ) from exc

    if not raw_plan.items:
        raise AIValidationError(
            "Provider generated empty list of destinations",
            code="AI_OUTPUT_INVALID",
        )

    # Build allowlist lookup map by both slug and UUID
    candidate_map: dict[str, DestinationRead] = {}
    for c in candidates:
        candidate_map[c.slug] = c
        candidate_map[c.id] = c

    grounded_items: list[RecommendedDestination] = []
    seen_dest_ids: set[str] = set()

    for item in raw_plan.items:
        ref_id = item.destination_id.strip()
        matched_dest = candidate_map.get(ref_id)
        if not matched_dest:
            raise AIValidationError(
                f"Destination reference '{ref_id}' is not in the curated catalogue",
                code="AI_DESTINATION_NOT_GROUNDED",
            )

        if matched_dest.id in seen_dest_ids:
            # Skip duplicates to ensure itinerary variety
            continue
        seen_dest_ids.add(matched_dest.id)

        # Authoritatively resolve name and summary in requested language
        disp_name = matched_dest.slug
        disp_summary = None
        for t in matched_dest.translations:
            if t.language_code == language:
                disp_name = t.name
                disp_summary = t.summary
                break
        else:
            # Fallback to English if translation missing
            for t in matched_dest.translations:
                if t.language_code == LanguageCode.EN:
                    disp_name = t.name
                    disp_summary = t.summary
                    break

        district_name = matched_dest.district.name_en if matched_dest.district else None
        if matched_dest.district and language == LanguageCode.KN:
            district_name = matched_dest.district.name_kn

        grounded = RecommendedDestination(
            id=matched_dest.id,
            slug=matched_dest.slug,
            name=disp_name,
            summary=disp_summary,
            category=matched_dest.category,
            district_code=matched_dest.district_code,
            district_name=district_name,
            coordinates=matched_dest.coordinates,
            day_number=item.day_number,
            order=item.order,
            rationale=item.rationale,
            entry_fee_min_inr=matched_dest.entry_fee_min_inr,
            entry_fee_max_inr=matched_dest.entry_fee_max_inr,
            currency_code=matched_dest.currency_code,
            access_status=matched_dest.access_status,
            is_offbeat=matched_dest.is_offbeat,
            sources=matched_dest.sources,
        )
        grounded_items.append(grounded)

    if not grounded_items:
        raise AIValidationError(
            "No valid, distinct destinations could be grounded from output",
            code="AI_DESTINATION_NOT_GROUNDED",
        )

    # Sort deterministically by (day_number, order)
    grounded_items.sort(key=lambda d: (d.day_number, d.order))
    return grounded_items

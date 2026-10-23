"""Seed data validation utility for Namma Karnataka.

Validates destinations and districts seed files against strict business rules,
geographic boundaries, translation requirements, and provenance standards.
"""

from __future__ import annotations

import json
import re
import sys
import uuid
from pathlib import Path
from typing import Any

VALID_CATEGORIES = {
    "nature",
    "waterfall",
    "hill_station",
    "viewpoint",
    "heritage",
    "architecture",
    "beach",
    "wildlife",
    "food_culture",
    "spiritual_cultural",
    "adventure",
    "museum",
    "town_city",
    "other",
}

VALID_ACCESS_STATUSES = {
    "open_reported",
    "restricted",
    "seasonal",
    "closed_reported",
    "unknown",
}

VALID_VERIFICATION_STATUSES = {
    "human_reviewed",
    "source_checked",
    "needs_review",
    "stale",
    "unknown",
}

VALID_CONTENT_STATUSES = {
    "draft",
    "reviewed",
    "published",
    "archived",
}

VALID_SOURCE_TYPES = {
    "government_official",
    "tourism_board",
    "verified_editorial",
    "academic",
    "field_report",
    "other",
}

VALID_TRANSLATION_STATUSES = {
    "human_reviewed",
    "provider_generated",
    "needs_review",
    "not_available",
}

SLUG_REGEX = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

# Karnataka Geographic Bounding Box (inclusive buffer)
MIN_LAT, MAX_LAT = 11.0, 19.0
MIN_LON, MAX_LON = 73.5, 79.0


def validate_seed_data(
    destinations: list[dict[str, Any]],
    valid_district_codes: set[str] | None = None,
) -> list[str]:
    """Validate destination records and return a list of error messages."""
    errors: list[str] = []
    seen_ids: set[str] = set()
    seen_slugs: set[str] = set()

    for index, record in enumerate(destinations):
        rec_id = record.get("id")
        slug = record.get("slug")
        identifier = f"Record #{index + 1} (slug: '{slug}', id: '{rec_id}')"

        # 1. Identifier & Slug checks
        if not rec_id:
            errors.append(f"{identifier}: Missing required 'id'")
        else:
            try:
                uuid.UUID(str(rec_id))
            except ValueError:
                errors.append(f"{identifier}: 'id' must be a valid UUID string")
            if rec_id in seen_ids:
                errors.append(f"{identifier}: Duplicate 'id' '{rec_id}'")
            seen_ids.add(rec_id)

        if not slug:
            errors.append(f"{identifier}: Missing required 'slug'")
        else:
            if not SLUG_REGEX.match(slug):
                errors.append(
                    f"{identifier}: 'slug' '{slug}' does not match URL-safe kebab-case format"
                )
            if slug in seen_slugs:
                errors.append(f"{identifier}: Duplicate 'slug' '{slug}'")
            seen_slugs.add(slug)

        # 2. District Reference
        dist_code = record.get("district_code")
        if not dist_code:
            errors.append(f"{identifier}: Missing required 'district_code'")
        elif valid_district_codes and dist_code not in valid_district_codes:
            errors.append(
                f"{identifier}: 'district_code' '{dist_code}' not recognized in districts catalog"
            )

        # 3. Controlled Vocabularies
        cat = record.get("category")
        if cat not in VALID_CATEGORIES:
            errors.append(f"{identifier}: Invalid category '{cat}'")

        access_status = record.get("access_status")
        if access_status not in VALID_ACCESS_STATUSES:
            errors.append(f"{identifier}: Invalid access_status '{access_status}'")

        verif_status = record.get("verification_status")
        if verif_status not in VALID_VERIFICATION_STATUSES:
            errors.append(f"{identifier}: Invalid verification_status '{verif_status}'")

        content_status = record.get("content_status")
        if content_status not in VALID_CONTENT_STATUSES:
            errors.append(f"{identifier}: Invalid content_status '{content_status}'")

        # 4. Coordinate Pair and Bounds
        lat = record.get("latitude")
        lon = record.get("longitude")

        if (lat is None and lon is not None) or (lat is not None and lon is None):
            errors.append(
                f"{identifier}: Latitude and longitude must both be provided or both be null"
            )
        elif lat is not None and lon is not None:
            if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
                errors.append(f"{identifier}: Coordinates must be numeric floats")
            else:
                if not (-90.0 <= lat <= 90.0):
                    errors.append(f"{identifier}: Latitude {lat} outside [-90, 90]")
                if not (-180.0 <= lon <= 180.0):
                    errors.append(f"{identifier}: Longitude {lon} outside [-180, 180]")
                if not (MIN_LAT <= lat <= MAX_LAT and MIN_LON <= lon <= MAX_LON):
                    errors.append(
                        f"{identifier}: Coordinates ({lat}, {lon}) outside Karnataka bounds "
                        f"[{MIN_LAT}..{MAX_LAT}, {MIN_LON}..{MAX_LON}]"
                    )

        # 5. Visit Duration
        visit_mins = record.get("estimated_visit_minutes")
        if visit_mins is not None:
            if not isinstance(visit_mins, int) or visit_mins <= 0:
                errors.append(
                    f"{identifier}: estimated_visit_minutes must be a positive integer"
                )

        # 6. Entry Fees
        fee_min = record.get("entry_fee_min_inr")
        fee_max = record.get("entry_fee_max_inr")

        if fee_min is not None and (not isinstance(fee_min, (int, float)) or fee_min < 0):
            errors.append(f"{identifier}: entry_fee_min_inr cannot be negative: {fee_min}")
        if fee_max is not None and (not isinstance(fee_max, (int, float)) or fee_max < 0):
            errors.append(f"{identifier}: entry_fee_max_inr cannot be negative: {fee_max}")
        if fee_min is not None and fee_max is not None and fee_min > fee_max:
            errors.append(
                f"{identifier}: entry_fee_min_inr ({fee_min}) exceeds entry_fee_max_inr ({fee_max})"
            )

        # 7. Translations Check
        translations = record.get("translations")
        if not isinstance(translations, list) or len(translations) == 0:
            errors.append(f"{identifier}: Missing 'translations' list")
        else:
            lang_codes = set()
            for t_idx, trans in enumerate(translations):
                t_lang = trans.get("language_code")
                if not t_lang or t_lang not in {"en", "kn"}:
                    errors.append(
                        f"{identifier} translation #{t_idx + 1}: Invalid or missing language_code '{t_lang}'"
                    )
                else:
                    lang_codes.add(t_lang)

                t_name = trans.get("name")
                if not t_name or not isinstance(t_name, str) or not t_name.strip():
                    errors.append(
                        f"{identifier} translation ({t_lang}): Display name cannot be blank"
                    )

                t_status = trans.get("translation_status")
                if t_status not in VALID_TRANSLATION_STATUSES:
                    errors.append(
                        f"{identifier} translation ({t_lang}): Invalid translation_status '{t_status}'"
                    )

            if "en" not in lang_codes:
                errors.append(f"{identifier}: Missing mandatory English ('en') translation")
            if "kn" not in lang_codes:
                errors.append(f"{identifier}: Missing mandatory Kannada ('kn') translation")

        # 8. Provenance Sources Check
        sources = record.get("sources")
        if not isinstance(sources, list) or len(sources) == 0:
            errors.append(f"{identifier}: Missing 'sources' provenance list")
        else:
            for s_idx, src in enumerate(sources):
                s_name = src.get("source_name")
                if not s_name or not isinstance(s_name, str) or not s_name.strip():
                    errors.append(f"{identifier} source #{s_idx + 1}: Missing source_name")

                s_type = src.get("source_type")
                if s_type not in VALID_SOURCE_TYPES:
                    errors.append(
                        f"{identifier} source #{s_idx + 1}: Invalid source_type '{s_type}'"
                    )

                s_claim = src.get("claim_scope")
                if not s_claim or not isinstance(s_claim, str) or not s_claim.strip():
                    errors.append(f"{identifier} source #{s_idx + 1}: Missing claim_scope")

                s_checked = src.get("checked_at")
                if not s_checked or not isinstance(s_checked, str):
                    errors.append(f"{identifier} source #{s_idx + 1}: Missing checked_at timestamp")

    return errors


def main() -> int:
    """Run validation against data/seed files."""
    base_dir = Path(__file__).resolve().parent.parent / "seed"
    destinations_file = base_dir / "destinations.json"
    districts_file = base_dir / "districts.json"

    if not destinations_file.exists():
        print(f"ERROR: Destinations seed file not found at: {destinations_file}", file=sys.stderr)
        return 1

    if not districts_file.exists():
        print(f"ERROR: Districts seed file not found at: {districts_file}", file=sys.stderr)
        return 1

    try:
        with open(districts_file, encoding="utf-8") as f:
            districts = json.load(f)
        valid_district_codes = {d["code"] for d in districts if "code" in d}
    except Exception as e:
        print(f"ERROR reading districts file: {e}", file=sys.stderr)
        return 1

    try:
        with open(destinations_file, encoding="utf-8") as f:
            destinations = json.load(f)
    except Exception as e:
        print(f"ERROR reading destinations file: {e}", file=sys.stderr)
        return 1

    print(f"Auditing {len(destinations)} destination seed records against {len(valid_district_codes)} districts...")
    errors = validate_seed_data(destinations, valid_district_codes)

    if errors:
        print(f"\nFAILED: Found {len(errors)} validation error(s):", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    print(f"SUCCESS: All {len(destinations)} destination seed records passed validation cleanly!")
    return 0


if __name__ == "__main__":
    sys.exit(main())

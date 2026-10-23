"""Unit tests for seed dataset integrity, validation rules, and idempotent loading."""

import json
from pathlib import Path

from data.seed.load_seed import load_seed_idempotent
from data.validation.validate_seed import validate_seed_data

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DESTINATIONS_FILE = REPO_ROOT / "data" / "seed" / "destinations.json"
DISTRICTS_FILE = REPO_ROOT / "data" / "seed" / "districts.json"


def test_seed_files_exist_and_pass_validation():
    assert DESTINATIONS_FILE.exists()
    assert DISTRICTS_FILE.exists()

    with open(DISTRICTS_FILE, encoding="utf-8") as f:
        districts = json.load(f)
    valid_district_codes = {d["code"] for d in districts}

    with open(DESTINATIONS_FILE, encoding="utf-8") as f:
        destinations = json.load(f)

    assert len(destinations) >= 10
    assert len(valid_district_codes) == 31

    errors = validate_seed_data(destinations, valid_district_codes)
    assert errors == [], f"Validation errors found: {errors}"


def test_seed_validation_detects_invalid_uuid():
    bad_data = [
        {
            "id": "not-a-uuid",
            "slug": "bad-uuid-place",
            "district_code": "KA-MYS",
            "category": "nature",
            "access_status": "open_reported",
            "verification_status": "source_checked",
            "content_status": "published",
            "translations": [
                {
                    "language_code": "en",
                    "name": "Bad Place",
                    "translation_status": "human_reviewed",
                },
                {
                    "language_code": "kn",
                    "name": "ಕೆಟ್ಟ ಸ್ಥಳ",
                    "translation_status": "human_reviewed",
                },
            ],
            "sources": [
                {
                    "source_name": "Test Source",
                    "source_type": "other",
                    "claim_scope": "all",
                    "checked_at": "2026-10-20T10:00:00Z",
                }
            ],
        }
    ]
    errors = validate_seed_data(bad_data, {"KA-MYS"})
    assert any("valid UUID" in e for e in errors)


def test_seed_validation_detects_duplicate_slugs():
    src = [
        {
            "source_name": "Src",
            "source_type": "other",
            "claim_scope": "all",
            "checked_at": "2026-10-20T10:00:00Z",
        }
    ]
    dup_data = [
        {
            "id": "33333333-3333-4333-8333-333333333301",
            "slug": "same-slug",
            "district_code": "KA-MYS",
            "category": "nature",
            "access_status": "open_reported",
            "verification_status": "source_checked",
            "content_status": "published",
            "translations": [
                {"language_code": "en", "name": "Place 1", "translation_status": "human_reviewed"},
                {"language_code": "kn", "name": "ಸ್ಥಳ 1", "translation_status": "human_reviewed"},
            ],
            "sources": src,
        },
        {
            "id": "33333333-3333-4333-8333-333333333302",
            "slug": "same-slug",
            "district_code": "KA-MYS",
            "category": "nature",
            "access_status": "open_reported",
            "verification_status": "source_checked",
            "content_status": "published",
            "translations": [
                {"language_code": "en", "name": "Place 2", "translation_status": "human_reviewed"},
                {"language_code": "kn", "name": "ಸ್ಥಳ 2", "translation_status": "human_reviewed"},
            ],
            "sources": src,
        },
    ]
    errors = validate_seed_data(dup_data, {"KA-MYS"})
    assert any("Duplicate 'slug'" in e for e in errors)


def test_seed_validation_detects_out_of_bounds_coordinates():
    out_of_bounds = [
        {
            "id": "33333333-3333-4333-8333-333333333303",
            "slug": "himalayas-place",
            "district_code": "KA-MYS",
            "category": "nature",
            "latitude": 30.5000,  # Far north of Karnataka
            "longitude": 76.6500,
            "access_status": "open_reported",
            "verification_status": "source_checked",
            "content_status": "published",
            "translations": [
                {
                    "language_code": "en",
                    "name": "Himalaya Place",
                    "translation_status": "human_reviewed",
                },
                {
                    "language_code": "kn",
                    "name": "ಹಿಮಾಲಯ ತಾಣ",
                    "translation_status": "human_reviewed",
                },
            ],
            "sources": [
                {
                    "source_name": "Src",
                    "source_type": "other",
                    "claim_scope": "all",
                    "checked_at": "2026-10-20T10:00:00Z",
                }
            ],
        }
    ]
    errors = validate_seed_data(out_of_bounds, {"KA-MYS"})
    assert any("outside Karnataka bounds" in e for e in errors)


def test_seed_validation_detects_missing_kannada():
    missing_kn = [
        {
            "id": "33333333-3333-4333-8333-333333333304",
            "slug": "english-only-place",
            "district_code": "KA-MYS",
            "category": "nature",
            "access_status": "open_reported",
            "verification_status": "source_checked",
            "content_status": "published",
            "translations": [
                {
                    "language_code": "en",
                    "name": "English Only",
                    "translation_status": "human_reviewed",
                }
            ],
            "sources": [
                {
                    "source_name": "Src",
                    "source_type": "other",
                    "claim_scope": "all",
                    "checked_at": "2026-10-20T10:00:00Z",
                }
            ],
        }
    ]
    errors = validate_seed_data(missing_kn, {"KA-MYS"})
    assert any("Missing mandatory Kannada ('kn') translation" in e for e in errors)


def test_load_seed_idempotency_run():
    with open(DISTRICTS_FILE, encoding="utf-8") as f:
        districts = json.load(f)
    with open(DESTINATIONS_FILE, encoding="utf-8") as f:
        destinations = json.load(f)

    # First dry run
    result1 = load_seed_idempotent(destinations, districts, dry_run=True)
    assert result1.inserted == len(destinations)
    assert result1.skipped == 0
    assert len(result1.errors) == 0

    # Repeat run against existing database state (simulated by existing_slugs)
    existing_slugs = {d["slug"] for d in destinations}
    result2 = load_seed_idempotent(
        destinations, districts, dry_run=True, existing_slugs=existing_slugs
    )
    assert result2.inserted == 0  # No duplicate insertions
    assert result2.skipped == len(destinations)  # All existing records skipped/preserved
    assert len(result2.errors) == 0

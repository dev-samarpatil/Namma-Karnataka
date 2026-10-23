"""Tests for AI Output Parsing, Validation, and Destination Grounding."""

import pytest

from app.repositories.destinations import InMemoryDestinationRepository
from app.schemas.destinations import DestinationFilterParams, LanguageCode
from app.services.ai.validator import (
    AIValidationError,
    parse_and_ground_plan,
    strip_markdown_fences,
)


@pytest.fixture
def sample_candidates():
    """Fixture providing known destination candidates from in-memory repository."""
    repo = InMemoryDestinationRepository()
    candidates, _ = repo.list_destinations(DestinationFilterParams(limit=50), published_only=True)
    return candidates


def test_strip_markdown_fences():
    """Verify markdown fences (```json ... ```) are cleanly stripped."""
    raw = '```json\n{"items": []}\n```'
    assert strip_markdown_fences(raw) == '{"items": []}'

    raw_plain = '```\n{"key": "val"}\n```'
    assert strip_markdown_fences(raw_plain) == '{"key": "val"}'

    unfenced = '{"key": "val"}'
    assert strip_markdown_fences(unfenced) == '{"key": "val"}'


def test_validator_valid_plan_by_slug(sample_candidates):
    """Verify successful validation and grounding when model references canonical slug."""
    slug1 = sample_candidates[0].slug
    slug2 = sample_candidates[1].slug
    raw_response = f"""
    {{
        "items": [
            {{
                "destination_id": "{slug1}",
                "day_number": 1,
                "order": 1,
                "rationale": "Must-visit landmark."
            }},
            {{
                "destination_id": "{slug2}",
                "day_number": 1,
                "order": 2,
                "rationale": "Panoramic view and visit."
            }}
        ],
        "notes": "Discovery tour"
    }}
    """
    recommended = parse_and_ground_plan(
        raw_text=raw_response,
        candidates=sample_candidates,
        language=LanguageCode.EN,
    )

    assert len(recommended) == 2
    assert recommended[0].slug == slug1
    assert recommended[0].day_number == 1
    assert recommended[0].order == 1
    assert recommended[1].slug == slug2
    assert recommended[1].day_number == 1
    assert recommended[1].order == 2


def test_validator_kannada_language_selection(sample_candidates):
    """Verify title and description resolve to Kannada when language=kn."""
    raw_response = """
    {
        "items": [
            {
                "destination_id": "mysore-palace",
                "day_number": 1,
                "order": 1,
                "rationale": "ಐತಿಹಾಸಿಕ ಅರಮನೆ"
            }
        ]
    }
    """
    recommended = parse_and_ground_plan(
        raw_text=raw_response,
        candidates=sample_candidates,
        language=LanguageCode.KN,
    )
    assert len(recommended) == 1
    assert recommended[0].slug == "mysore-palace"
    assert "ಮೈಸೂರು ಅರಮನೆ" in recommended[0].name


def test_validator_rejects_ungrounded_fabricated_id(sample_candidates):
    """Verify validator strictly rejects destinations not present in candidate catalogue."""
    raw_response = """
    {
        "items": [
            {
                "destination_id": "fabricated-taj-mahal-in-karnataka",
                "day_number": 1,
                "order": 1,
                "rationale": "Fabricated stop"
            }
        ]
    }
    """
    with pytest.raises(AIValidationError) as exc_info:
        parse_and_ground_plan(
            raw_text=raw_response,
            candidates=sample_candidates,
            language=LanguageCode.EN,
        )
    assert exc_info.value.code == "AI_DESTINATION_NOT_GROUNDED"
    assert "fabricated-taj-mahal-in-karnataka" in exc_info.value.message


def test_validator_rejects_malformed_json(sample_candidates):
    """Verify validator rejects truncated or broken JSON strings."""
    with pytest.raises(AIValidationError) as exc_info:
        parse_and_ground_plan(
            raw_text="{'not': valid json",
            candidates=sample_candidates,
            language=LanguageCode.EN,
        )
    assert exc_info.value.code == "AI_OUTPUT_INVALID"


def test_validator_rejects_empty_items(sample_candidates):
    """Verify validator rejects plans containing no destination items."""
    raw_response = '{"items": []}'
    with pytest.raises(AIValidationError) as exc_info:
        parse_and_ground_plan(
            raw_text=raw_response,
            candidates=sample_candidates,
            language=LanguageCode.EN,
        )
    assert exc_info.value.code == "AI_OUTPUT_INVALID"


def test_validator_deduplicates_duplicate_destination_references(sample_candidates):
    """Verify duplicate destination references in the plan are deduplicated."""
    raw_response = """
    {
        "items": [
            {
                "destination_id": "mysore-palace",
                "day_number": 1,
                "order": 1,
                "rationale": "Day 1 stop"
            },
            {
                "destination_id": "mysore-palace",
                "day_number": 2,
                "order": 1,
                "rationale": "Day 2 stop duplicate"
            }
        ]
    }
    """
    recommended = parse_and_ground_plan(
        raw_text=raw_response,
        candidates=sample_candidates,
        language=LanguageCode.EN,
    )
    assert len(recommended) == 1
    assert recommended[0].slug == "mysore-palace"

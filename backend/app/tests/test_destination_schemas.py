"""Tests for Destination Pydantic schemas and domain invariants."""

import pytest
from pydantic import ValidationError

from app.schemas.destinations import (
    AccessStatus,
    ContentStatus,
    Coordinates,
    DestinationBase,
    DestinationCategory,
    DestinationRead,
    DestinationSourceRead,
    DestinationTranslationRead,
    DistrictSummary,
    LanguageCode,
    SourceType,
    TranslationStatus,
    VerificationStatus,
)


def test_valid_coordinates():
    coords = Coordinates(lat=12.3051, lon=76.6551)
    assert coords.lat == 12.3051
    assert coords.lon == 76.6551


def test_invalid_coordinates_out_of_bounds():
    with pytest.raises(ValidationError):
        Coordinates(lat=95.0, lon=76.0)

    with pytest.raises(ValidationError):
        Coordinates(lat=12.0, lon=195.0)


def test_valid_destination_base():
    dest = DestinationBase(
        slug="mysore-palace",
        district_code="KA-MYS",
        category=DestinationCategory.ARCHITECTURE,
        coordinates=Coordinates(lat=12.3051, lon=76.6551),
        access_status=AccessStatus.OPEN_REPORTED,
        verification_status=VerificationStatus.SOURCE_CHECKED,
        content_status=ContentStatus.PUBLISHED,
        is_offbeat=False,
        estimated_visit_minutes=120,
        entry_fee_min_inr=100.0,
        entry_fee_max_inr=100.0,
        currency_code="INR",
        active=True,
        translations=[
            DestinationTranslationRead(
                language_code=LanguageCode.EN,
                name="Mysore Palace",
                summary="Royal palace",
                translation_status=TranslationStatus.HUMAN_REVIEWED,
            ),
            DestinationTranslationRead(
                language_code=LanguageCode.KN,
                name="ಮೈಸೂರು ಅರಮನೆ",
                summary="ರಾಜಮನೆತನದ ಅರಮನೆ",
                translation_status=TranslationStatus.HUMAN_REVIEWED,
            ),
        ],
        sources=[
            DestinationSourceRead(
                source_name="Mysore Palace Board",
                source_url="https://mysorepalace.gov.in",
                source_type=SourceType.GOVERNMENT_OFFICIAL,
                claim_scope="all",
            )
        ],
    )
    assert dest.slug == "mysore-palace"
    assert dest.entry_fee_min_inr == 100.0
    assert len(dest.translations) == 2


def test_invalid_slug_format():
    with pytest.raises(ValidationError, match="lowercase kebab-case"):
        DestinationBase(
            slug="Mysore Palace",  # Uppercase and space
            district_code="KA-MYS",
            category=DestinationCategory.ARCHITECTURE,
        )

    with pytest.raises(ValidationError, match="lowercase kebab-case"):
        DestinationBase(
            slug="mysore_palace",  # Underscore
            district_code="KA-MYS",
            category=DestinationCategory.ARCHITECTURE,
        )


def test_invalid_fee_range():
    with pytest.raises(ValidationError, match="cannot exceed"):
        DestinationBase(
            slug="test-place",
            district_code="KA-MYS",
            category=DestinationCategory.NATURE,
            entry_fee_min_inr=200.0,
            entry_fee_max_inr=100.0,  # min > max
        )


def test_negative_fees_rejected():
    with pytest.raises(ValidationError):
        DestinationBase(
            slug="test-place",
            district_code="KA-MYS",
            category=DestinationCategory.NATURE,
            entry_fee_min_inr=-10.0,
        )


def test_unknown_fee_stays_none():
    dest = DestinationBase(
        slug="free-or-unknown-place",
        district_code="KA-MYS",
        category=DestinationCategory.NATURE,
        entry_fee_min_inr=None,
        entry_fee_max_inr=None,
    )
    assert dest.entry_fee_min_inr is None
    assert dest.entry_fee_max_inr is None


def test_destination_read_with_district():
    dest = DestinationRead(
        id="11111111-1111-4111-8111-111111111101",
        slug="mysore-palace",
        district_code="KA-MYS",
        district=DistrictSummary(code="KA-MYS", name_en="Mysuru", name_kn="ಮೈಸೂರು"),
        category=DestinationCategory.ARCHITECTURE,
        content_status=ContentStatus.PUBLISHED,
    )
    assert dest.id == "11111111-1111-4111-8111-111111111101"
    assert dest.district.name_en == "Mysuru"

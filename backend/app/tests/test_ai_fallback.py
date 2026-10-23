"""Tests for Deterministic Fallback Engine."""

import pytest

from app.core.errors import AppError
from app.repositories.destinations import InMemoryDestinationRepository
from app.schemas.destinations import DestinationFilterParams, LanguageCode
from app.schemas.planning import PlanningRequest
from app.services.ai.fallback import DeterministicFallbackEngine


@pytest.fixture
def catalog_candidates():
    """Load curated destination catalog from seed repository."""
    repo = InMemoryDestinationRepository()
    candidates, _ = repo.list_destinations(DestinationFilterParams(limit=50), published_only=True)
    return candidates


def test_fallback_stable_ordering(catalog_candidates):
    """Verify fallback returns identical ordered list across multiple runs with same input."""
    req = PlanningRequest(duration_days=2, pace="relaxed", language=LanguageCode.EN)

    plan1 = DeterministicFallbackEngine.generate_plan(req, catalog_candidates)
    plan2 = DeterministicFallbackEngine.generate_plan(req, catalog_candidates)

    slugs1 = [item.slug for item in plan1]
    slugs2 = [item.slug for item in plan2]

    assert len(plan1) > 0
    assert slugs1 == slugs2


def test_fallback_pace_allocation(catalog_candidates):
    """Verify pace setting controls stops per day."""
    req_relaxed = PlanningRequest(duration_days=2, pace="relaxed", language=LanguageCode.EN)
    req_balanced = PlanningRequest(duration_days=2, pace="balanced", language=LanguageCode.EN)

    plan_relaxed = DeterministicFallbackEngine.generate_plan(req_relaxed, catalog_candidates)
    plan_balanced = DeterministicFallbackEngine.generate_plan(req_balanced, catalog_candidates)

    # 2 days * 2 stops = 4 stops for relaxed; 2 days * 3 stops = 6 stops for balanced
    assert len(plan_relaxed) == 4
    assert len(plan_balanced) == 6


def test_fallback_preserves_language_and_unknown_fee(catalog_candidates):
    """Verify fallback respects Kannada language and preserves None fees without coercion."""
    req = PlanningRequest(duration_days=2, pace="balanced", language=LanguageCode.KN)

    plan = DeterministicFallbackEngine.generate_plan(req, catalog_candidates)
    assert len(plan) > 0

    # Verify at least one destination resolves with Kannada characters
    has_kannada = any(any("\u0c80" <= char <= "\u0cff" for char in item.name) for item in plan)
    assert has_kannada is True

    # Verify fees are either float or None, never arbitrary strings or forced 0s
    for item in plan:
        assert item.entry_fee_min_inr is None or isinstance(item.entry_fee_min_inr, (int, float))


def test_fallback_insufficient_data():
    """Verify fallback raises AppError with INSUFFICIENT_DESTINATION_DATA when pool is too small."""
    req = PlanningRequest(duration_days=5, language=LanguageCode.EN)

    with pytest.raises(AppError) as exc_info:
        DeterministicFallbackEngine.generate_plan(req, candidates=[])

    assert exc_info.value.code == "INSUFFICIENT_DESTINATION_DATA"
    assert exc_info.value.status_code == 422

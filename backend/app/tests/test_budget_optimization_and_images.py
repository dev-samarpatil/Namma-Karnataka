"""Automated tests for budget optimization and destination photograph pipeline."""

from __future__ import annotations

from app.repositories.destinations import get_destination_repository
from app.schemas.destinations import DestinationFilterParams
from app.schemas.planning import PlanningRequest
from app.services.ai.fallback import DeterministicFallbackEngine
from app.services.budget import BudgetCalculator
from app.services.destination_discovery import get_destination_discovery_service
from app.services.destination_image_service import (
    get_destination_image_service,
)
from app.services.scheduler import DeterministicScheduler


def test_destination_image_service_verified_archive():
    """Verify that discovered destinations have pre-verified real photographs with CC metadata."""
    img_svc = get_destination_image_service()
    meta = img_svc.get_verified_media_for_id("gaz-kavaledurga-fort")

    assert meta is not None
    assert meta.verification_status == "VERIFIED_AUTHENTIC"
    assert "upload.wikimedia.org" in meta.image_url
    assert "Manjeshpv" in meta.creator
    assert "CC BY-SA" in meta.license
    assert meta.thumbnail_url != ""

    # Test conversion to DestinationMedia
    media = meta.to_destination_media("Kavaledurga Fort")
    assert media.url == meta.image_url
    assert media.license_type == meta.license


def test_destination_discovery_enriches_images():
    """Ensure multi-source discovery populates image_url on all returned candidates."""
    disc_svc = get_destination_discovery_service()
    results = disc_svc.discover_destinations(limit=15)

    assert len(results) > 0
    for cand in results:
        assert cand.image_url is not None
        assert cand.image_url.startswith("https://upload.wikimedia.org/")


def test_destination_image_non_photo_exclusion():
    """Verify non-photo graphics (maps, flags, logos) are rejected by image metadata validation."""
    clean = get_destination_image_service()._clean_html("<b>Manjeshpv</b> &amp; Contributors")
    assert clean == "Manjeshpv & Contributors"


def test_budget_optimization_feasible_for_10000_inr():
    """Test Case A1: 1 traveler, 5 days, ₹10,000 budget, public transit must be feasible."""
    req = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=5,
        travelers_count=1,
        travel_mode="public_transit",
        budget_scenario="budget",
        budget_limit_inr=10000.0,
        budget_scope="total_trip",
        strict_budget=True,
    )

    candidates, _ = get_destination_repository().list_destinations(
        DestinationFilterParams(limit=40), published_only=True
    )
    fallback_items, _, _ = DeterministicFallbackEngine.generate_plan_with_metadata(req, candidates)
    days, _, _ = DeterministicScheduler.build_schedule(req, fallback_items)
    budget = BudgetCalculator.calculate_budget(req, days, fallback_items)

    # Must be financially feasible within 10,000 INR
    assert budget.is_budget_feasible is True
    assert budget.grand_total_min_inr <= 10000.0
    assert budget.feasibility_status in ("within_budget", "near_budget")
    assert budget.remaining_budget_inr is not None
    assert budget.remaining_budget_inr >= 0.0


def test_budget_optimization_impossible_budget_diagnostics():
    """Test impossible budget (₹1,500 for 5 days) returns explicit infeasibility diagnostics."""
    req = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=5,
        travelers_count=1,
        travel_mode="public_transit",
        budget_scenario="budget",
        budget_limit_inr=1500.0,
        budget_scope="total_trip",
        strict_budget=True,
    )

    candidates, _ = get_destination_repository().list_destinations(
        DestinationFilterParams(limit=20), published_only=True
    )
    fallback_items, _, _ = DeterministicFallbackEngine.generate_plan_with_metadata(req, candidates)
    days, _, _ = DeterministicScheduler.build_schedule(req, fallback_items)
    budget = BudgetCalculator.calculate_budget(req, days, fallback_items)

    assert budget.is_budget_feasible is False
    assert budget.feasibility_status == "infeasible"
    assert budget.infeasibility_reason is not None
    assert "lower than the absolute minimum" in budget.infeasibility_reason
    assert budget.recommended_budget_increase_inr is not None
    assert budget.recommended_budget_increase_inr > 0.0

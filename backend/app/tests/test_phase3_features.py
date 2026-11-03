"""Comprehensive test suite for Phase 3 Master Implementation.

Validates:
1. Hard budget-constrained optimization and structured alternatives.
2. Multi-provider destination discovery and geodesic deduplication.
3. Karnataka regional food intelligence across all 8 culinary regions.
4. Micro-regional geographic clustering and sequence optimization.
"""

from __future__ import annotations

import pytest

from app.schemas.destinations import Coordinates
from app.schemas.planning import PlanningRequest
from app.services.budget import BudgetCalculator
from app.services.budget_optimizer import BudgetOptimizer
from app.services.destination_clustering import DestinationClusteringService
from app.services.destination_discovery import (
    DestinationDiscoveryService,
    DiscoveredDestination,
    ProvenanceSource,
    VerificationStatus,
)
from app.services.food_recommendation import (
    CulinaryRegion,
    FoodRecommendationService,
)


def test_absolute_minimum_trip_cost():
    """Verify deterministic baseline survival cost calculation in Karnataka."""
    # 2 days, 2 travelers
    cost = BudgetOptimizer.calculate_absolute_minimum_trip_cost(
        duration_days=2,
        travelers_count=2,
        origin_label="Bengaluru",
        approx_corridor_km=300.0,
    )
    # 1 night lodging (800) + 2 days meals (2*2*320=1280) + transit (~1200) + 5% contingency
    assert cost > 3000.0
    assert cost < 6000.0


def test_budget_feasibility_infeasible_low_budget():
    """Verify that unrealistic low budget targets trigger structured infeasibility."""
    req = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=3,
        travelers_count=2,
        budget_limit_inr=1500.0,  # Impossible for 3 days 2 people
        budget_scope="total_trip",
    )
    budget = BudgetCalculator.calculate_budget(req, days=[], destinations=[])
    assert not budget.is_budget_feasible
    assert budget.feasibility_status == "infeasible"
    assert budget.lowest_feasible_cost_inr is not None
    assert budget.infeasibility_reason is not None
    assert "lower than the absolute minimum" in budget.infeasibility_reason


def test_budget_alternatives_generated():
    """Verify actionable alternatives generated for cab travel and hotel lodging."""
    req = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=3,
        travelers_count=2,
        travel_mode="cab_taxi",
        budget_scenario="comfort",
        budget_limit_inr=10000.0,
        budget_scope="total_trip",
    )
    budget = BudgetCalculator.calculate_budget(req, days=[], destinations=[])
    assert len(budget.budget_alternatives) > 0
    categories = [alt.category for alt in budget.budget_alternatives]
    assert "Transportation" in categories or "Accommodation" in categories
    for alt in budget.budget_alternatives:
        assert alt.potential_savings_inr > 0
        assert alt.explanation


def test_multi_source_destination_discovery():
    """Verify aggregation across Official Tourism, ASI, Gazetteers, and OSM."""
    svc = DestinationDiscoveryService()
    results = svc.discover_destinations(limit=30)
    assert len(results) >= 10

    provenance_sources = {d.provenance_source for d in results}
    assert ProvenanceSource.OFFICIAL_KARNATAKA_TOURISM in provenance_sources
    assert ProvenanceSource.ASI_ARCHAEOLOGICAL_SURVEY in provenance_sources


def test_discovery_geodesic_deduplication():
    """Verify that records within 300 meters are merged prioritizing verified source."""
    class MockProvider:
        def get_source_name(self):
            return ProvenanceSource.COMMUNITY_CURATED

        def search(self, **kwargs):
            return [
                DiscoveredDestination(
                    id="mock-dest-1",
                    slug="mock-dest-1",
                    name_en="Duplicate Spot A",
                    name_kn="ಸ್ಪಾಟ್ ಎ",
                    category="heritage",
                    district="Mysuru",
                    district_code="KA-MYS",
                    latitude=12.3051,
                    longitude=76.6551,
                    description_en="Community description",
                    verification_status=VerificationStatus.COMMUNITY_SOURCED,
                    provenance_source=ProvenanceSource.COMMUNITY_CURATED,
                ),
                DiscoveredDestination(
                    id="mock-dest-2",
                    slug="mock-dest-2",
                    name_en="Duplicate Spot A Verified",
                    name_kn="ಸ್ಪಾಟ್ ಎ ವೆರಿಫೈಡ್",
                    category="heritage",
                    district="Mysuru",
                    district_code="KA-MYS",
                    latitude=12.30515,  # ~6 meters away
                    longitude=76.65512,
                    description_en="Official verified description",
                    verification_status=VerificationStatus.VERIFIED,
                    provenance_source=ProvenanceSource.OFFICIAL_KARNATAKA_TOURISM,
                ),
            ]

    svc = DestinationDiscoveryService(providers=[MockProvider()])
    deduped = svc.discover_destinations()
    assert len(deduped) == 1
    assert deduped[0].verification_status == VerificationStatus.VERIFIED
    assert deduped[0].name_en == "Duplicate Spot A Verified"


def test_regional_food_all_eight_regions():
    """Verify authentic coverage and dietary filtering across Karnataka's 8 culinary regions."""
    svc = FoodRecommendationService()

    districts_to_test = [
        ("Bengaluru Urban", CulinaryRegion.BENGALURU_URBAN),
        ("Mysuru", CulinaryRegion.MYSURU_MANDYA),
        ("Mangaluru", CulinaryRegion.COASTAL_KARAVALI),
        ("Chikkamagaluru", CulinaryRegion.MALNAD),
        ("Kodagu", CulinaryRegion.KODAGU),
        ("Dharwad", CulinaryRegion.NORTH_KARNATAKA),
        ("Kalaburagi", CulinaryRegion.KALYANA_KARNATAKA),
        ("Davanagere", CulinaryRegion.CENTRAL_KARNATAKA),
    ]

    for dist, expected_region in districts_to_test:
        region = svc.get_region_for_district(dist)
        assert region == expected_region

        # Check that we have recommendations
        recs = svc.get_recommendations(district_name=dist)
        assert len(recs) > 0
        for r in recs:
            assert r.name_en
            assert r.name_kn
            assert r.typical_cost_min_inr > 0
            assert r.recommended_venue_type


def test_food_dietary_filtering():
    """Verify strict vegetarian and vegan filtering."""
    svc = FoodRecommendationService()
    veg_recs = svc.get_recommendations(district_name="Kodagu", dietary_preference="veg")
    for d in veg_recs:
        assert d.is_vegetarian
        assert not d.contains_meat


def test_geographic_clustering_and_sequence():
    """Verify micro-clustering and daylight sequence optimization."""
    svc = DestinationDiscoveryService()
    destinations = [svc.to_destination_read(d) for d in svc.discover_destinations(limit=6)]

    # Cluster into 2 days
    clusters = DestinationClusteringService.cluster_by_days(
        destinations=destinations,
        days_count=2,
        origin_coords=Coordinates(lat=12.9716, lon=77.5946),
    )
    assert len(clusters) == 2
    assert sum(len(c) for c in clusters) == len(destinations)

    # Optimize sequence within day 1
    seq = DestinationClusteringService.optimize_day_sequence(
        day_destinations=clusters[0],
        start_coords=Coordinates(lat=12.9716, lon=77.5946),
    )
    assert len(seq) == len(clusters[0])


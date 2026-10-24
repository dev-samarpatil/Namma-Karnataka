"""Unit tests for Phase 4 transportation cost modeling and budget scenarios."""

import pytest

from app.schemas.planning import CostStatus, PlanningRequest
from app.services.budget import BudgetCalculator
from app.services.scheduler import DeterministicScheduler
from app.services.transport_cost import SupportedTransportMode, TransportCostCalculator
from app.tests.test_scheduler_and_budget import create_mock_destination


def test_car_fuel_cost_calculation():
    """Verify private car fuel formula: (distance / efficiency) * price * vehicles."""
    # 100 km round-trip = 200 billable km. 1 car (<= 4 passengers)
    # 200 km / 14 km/L * 100 Rs/L = 1428.57 INR
    estimate = TransportCostCalculator.calculate_car_fuel(
        road_distance_km=100.0,
        travelers_count=2,
        fuel_efficiency_km_per_litre=14.0,
        fuel_price_per_litre=100.0,
        is_return_trip=True,
    )
    assert estimate.mode == SupportedTransportMode.DRIVING_CAR
    assert estimate.billable_distance_km == 200.0
    assert estimate.vehicles_count == 1
    assert estimate.total_cost_min_inr == pytest.approx(1428.57, abs=0.1)
    assert estimate.per_person_min_inr == pytest.approx(714.29, abs=0.1)
    assert estimate.cost_status == CostStatus.ESTIMATED


def test_car_fuel_multiple_vehicles_ceiling():
    """Verify travelers > 4 allocates multiple vehicles."""
    estimate = TransportCostCalculator.calculate_car_fuel(
        road_distance_km=100.0,
        travelers_count=6,  # requires 2 vehicles (capacity 4 each)
        fuel_efficiency_km_per_litre=10.0,
        fuel_price_per_litre=100.0,
        is_return_trip=False,  # 100 km one way
    )
    # 100 km / 10 km/L * 100 Rs/L * 2 cars = 2000 INR
    assert estimate.vehicles_count == 2
    assert estimate.billable_distance_km == 100.0
    assert estimate.total_cost_min_inr == 2000.0
    assert estimate.per_person_min_inr == pytest.approx(333.33, abs=0.1)


def test_cab_taxi_tariff_and_driver_bata():
    """Verify outstation cab tariff formula: max(base, km * 16) + days * 400."""
    estimate = TransportCostCalculator.calculate_cab_fare(
        road_distance_km=150.0,
        travelers_count=3,
        duration_days=2,
        is_return_trip=True,  # 300 billable km
    )
    assert estimate.mode == SupportedTransportMode.CAB_TAXI
    assert estimate.billable_distance_km == 300.0
    # 300 km * 16 = 4800 Rs. Driver bata: 2 days * 400 = 800 Rs. Total = 5600 Rs
    assert estimate.total_cost_min_inr == 5600.0
    assert estimate.per_person_min_inr == pytest.approx(1866.67, abs=0.1)


def test_public_transit_verified_corridor_fare():
    """Verify verified corridor fare per person scaled by passenger count."""
    estimate = TransportCostCalculator.calculate_public_transit(
        road_distance_km=145.0,
        travelers_count=3,
        is_return_trip=True,
        corridor_fare_min=210.0,  # Bengaluru to Mysuru KSRTC fare
        corridor_fare_max=380.0,
    )
    assert estimate.mode == SupportedTransportMode.PUBLIC_TRANSIT
    assert estimate.cost_status == CostStatus.VERIFIED
    # 210 * 2 return * 3 travelers = 1260 INR min
    assert estimate.total_cost_min_inr == 1260.0
    # 380 * 2 return * 3 travelers = 2280 INR max
    assert estimate.total_cost_max_inr == 2280.0
    assert estimate.per_person_min_inr == 420.0
    assert estimate.per_person_max_inr == 760.0


def test_budget_scenarios_comparison():
    """Verify budget scenario affects lodging and meal allocations."""
    req_budget = PlanningRequest(
        duration_days=2,
        travelers_count=2,
        budget_scenario="budget",
        travel_mode="driving_car",
    )
    req_comfort = PlanningRequest(
        duration_days=2,
        travelers_count=2,
        budget_scenario="comfort",
        travel_mode="driving_car",
    )
    dests = [
        create_mock_destination("1", "p1", "Place 1", 1, 1, 12.0, 76.0, 50.0, 50.0),
        create_mock_destination("2", "p2", "Place 2", 2, 1, 12.0, 76.0, 50.0, 50.0),
    ]

    days_b, _, _ = DeterministicScheduler.build_schedule(req_budget, dests)
    budget_b = BudgetCalculator.calculate_budget(req_budget, days_b, dests)

    days_c, _, _ = DeterministicScheduler.build_schedule(req_comfort, dests)
    budget_c = BudgetCalculator.calculate_budget(req_comfort, days_c, dests)

    assert budget_b.grand_total_min_inr < budget_c.grand_total_min_inr
    assert budget_b.budget_scenario_used == "budget"
    assert budget_c.budget_scenario_used == "comfort"


def test_budget_verified_vs_estimated_subtotals():
    """Verify verified tariffs and estimated costs are cleanly partitioned."""
    req = PlanningRequest(
        duration_days=2,
        travelers_count=2,
        travel_mode="driving_car",
    )
    # Both destinations have verified entry fees (50 * 2 = 100 each = 200 total)
    dests = [
        create_mock_destination("1", "p1", "Place 1", 1, 1, 12.0, 76.0, 50.0, 50.0),
        create_mock_destination("2", "p2", "Place 2", 2, 1, 12.0, 76.0, 50.0, 50.0),
    ]

    days, _, _ = DeterministicScheduler.build_schedule(req, dests)
    budget = BudgetCalculator.calculate_budget(req, days, dests)

    assert budget.verified_subtotal_inr >= 200.0
    assert budget.estimated_subtotal_min_inr > 0.0

    # Grand total min must equal (verified + estimated_min) + 10% contingency
    known_subtotal = budget.verified_subtotal_inr + budget.estimated_subtotal_min_inr
    expected_contingency = round(known_subtotal * 0.10, 2)
    expected_grand_total = round(known_subtotal + expected_contingency, 2)

    assert budget.grand_total_min_inr == expected_grand_total

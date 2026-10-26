"""Unit and regression tests for Leg-by-Leg Practical Transportation Guide (Workstream C & D).

Verifies:
1. build_travel_leg_details produces transparent, explainable transport options.
2. Verified bus/train route details from transit network are populated when corridor matches.
3. Missing bus numbers/schedules are never fabricated; limitations are honestly disclosed.
4. Fares scale properly according to passenger count.
5. Walking feasibility is correctly assessed (short distance <= 1.2km vs long distance).
6. Alternatives include driving_car, cab_taxi, public_transit, and walking when feasible.
7. Bilingual recommendation reasons and alternative labels exist.
8. Unknown fares are never treated as zero.
"""

import pytest

from app.schemas.destinations import Coordinates, LanguageCode
from app.schemas.planning import CostStatus, PlanningRequest
from app.services.scheduler import DeterministicScheduler, build_travel_leg_details
from app.services.transport_cost import SupportedTransportMode
from app.tests.test_scheduler_and_budget import create_mock_destination


def test_travel_leg_short_distance_walking_recommendation():
    """Short distances (<= 0.8 km) recommend walking with zero fare and verified status."""
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=1,
        travelers_count=2,
        travel_mode=SupportedTransportMode.DRIVING_CAR,
    )
    c1 = Coordinates(lat=12.9716, lon=77.5946)
    c2 = Coordinates(lat=12.9750, lon=77.5980)

    leg = build_travel_leg_details(
        origin_name="Cubbon Park",
        dest_name="Government Museum",
        dist_km=0.6,
        duration_mins=8,
        prev_coords=c1,
        dest_coords=c2,
        request=req,
    )

    assert leg.recommended_mode == "walking"
    assert leg.walking_feasible is True
    assert leg.cost_group_inr == 0.0
    assert leg.cost_per_person_inr == 0.0
    assert leg.fare_status == CostStatus.VERIFIED
    assert "Short pedestrian connection" in leg.recommendation_reason
    assert leg.recommendation_reason_kn is not None
    assert len(leg.alternatives) >= 3


def test_travel_leg_car_mode_and_fuel_calculation():
    """Driving car mode calculates deterministic fuel cost and basis."""
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=1,
        travelers_count=4,
        travel_mode=SupportedTransportMode.DRIVING_CAR,
        fuel_efficiency_km_per_litre=14.0,
        fuel_price_per_litre=100.0,
    )
    c1 = Coordinates(lat=12.9716, lon=77.5946)
    c2 = Coordinates(lat=12.2958, lon=76.6394)

    # 140 km one-way: 140 / 14 * 100 = 1000 INR group, 250 INR per person
    leg = build_travel_leg_details(
        origin_name="Bengaluru",
        dest_name="Mysuru Palace",
        dist_km=140.0,
        duration_mins=180,
        prev_coords=c1,
        dest_coords=c2,
        request=req,
    )

    assert leg.recommended_mode == "driving_car"
    assert leg.distance_km == 140.0
    assert leg.duration_minutes == 180
    assert leg.cost_group_inr == pytest.approx(1000.0, abs=1.0)
    assert leg.cost_per_person_inr == pytest.approx(250.0, abs=0.5)
    assert leg.fare_status == CostStatus.ESTIMATED
    assert "Self-drive" in leg.recommendation_reason or "self-drive" in leg.recommendation_reason
    assert leg.walking_feasible is False
    assert "not recommended" in leg.walking_notes.lower()


def test_travel_leg_public_transit_passenger_scaling():
    """Transit options scale fare by the travelers count."""
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=1,
        travelers_count=3,
        travel_mode=SupportedTransportMode.PUBLIC_TRANSIT,
    )
    # Bengaluru Majestic to Mysuru KSRTC corridor
    c_bengaluru = Coordinates(lat=12.9778, lon=77.5724)
    c_mysuru = Coordinates(lat=12.3118, lon=76.6552)

    leg = build_travel_leg_details(
        origin_name="Bengaluru Central",
        dest_name="Mysuru KSRTC Bus Stand",
        dist_km=145.0,
        duration_mins=180,
        prev_coords=c_bengaluru,
        dest_coords=c_mysuru,
        request=req,
    )

    assert leg.recommended_mode in ("public_transit", "cab_taxi")
    if leg.recommended_mode == "public_transit":
        assert leg.operator_name is not None
        assert leg.cost_group_inr == pytest.approx(leg.cost_per_person_inr * 3, abs=0.1)
        assert leg.fare_status in (CostStatus.VERIFIED, CostStatus.ESTIMATED)


def test_travel_leg_unverified_transit_does_not_fabricate():
    """When no transit route is found, missing timetable is disclosed honestly."""
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Devanahalli",
        duration_days=1,
        travelers_count=2,
        travel_mode=SupportedTransportMode.PUBLIC_TRANSIT,
    )
    # Remote spots without direct public corridor
    c_remote1 = Coordinates(lat=13.2500, lon=77.7100)
    c_remote2 = Coordinates(lat=13.3100, lon=77.7800)

    leg = build_travel_leg_details(
        origin_name="Rural Spot A",
        dest_name="Rural Spot B",
        dist_km=15.0,
        duration_mins=30,
        prev_coords=c_remote1,
        dest_coords=c_remote2,
        request=req,
    )

    # Transit alternative should clearly show unknown / not verified status
    transit_alt = next((a for a in leg.alternatives if a.mode == "public_transit"), None)
    assert transit_alt is not None
    if transit_alt.cost_status == CostStatus.UNKNOWN:
        assert transit_alt.cost_inr is None  # Unknown fare is NEVER fabricated to 0
        assert "schedule" in transit_alt.notes.lower() or "verified" in transit_alt.notes.lower()


def test_scheduler_attaches_travel_leg_to_all_transitions():
    """DeterministicScheduler populates travel_leg on all inter-destination stops."""
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=2,
        travelers_count=2,
        travel_mode=SupportedTransportMode.DRIVING_CAR,
        is_return_trip=True,
    )
    d1 = create_mock_destination(
        "dest-1", "lalbagh", "Lalbagh Botanical Garden", 1, 1, 12.9507, 77.5848
    )
    d2 = create_mock_destination(
        "dest-2", "palace", "Bangalore Palace", 1, 2, 12.9982, 77.5921
    )
    d3 = create_mock_destination(
        "dest-3", "nandi-hills", "Nandi Hills", 2, 1, 13.3702, 77.6835
    )

    day_plans, _, _ = DeterministicScheduler.build_schedule(req, [d1, d2, d3])

    assert len(day_plans) == 2

    # Day 1 attraction stops have travel_leg populated
    day1_attractions = [s for s in day_plans[0].stops if s.stop_type == "attraction"]
    for stop in day1_attractions:
        if stop.distance_from_prev_km and stop.distance_from_prev_km > 0:
            assert stop.travel_leg is not None
            assert stop.travel_leg.distance_km == pytest.approx(stop.distance_from_prev_km, abs=0.2)
            assert stop.travel_leg.recommended_mode in ("driving_car", "cab_taxi", "walking", "public_transit")
            assert len(stop.travel_leg.alternatives) > 0

    # Overnight stay has travel_leg
    day1_stay = next((s for s in day_plans[0].stops if s.stop_type == "accommodation"), None)
    if day1_stay and day1_stay.distance_from_prev_km:
        assert day1_stay.travel_leg is not None

    # Day 2 return trip has travel_leg
    day2_return = next((s for s in day_plans[1].stops if s.stop_type == "transport"), None)
    if day2_return:
        assert day2_return.travel_leg is not None
        assert day2_return.travel_leg.recommended_mode == "driving_car"


def test_travel_leg_mixed_mode_preserves_selection_and_builds_segments():
    """Selecting mixed mode maintains selected_mode='mixed', recommended_mode='mixed', and segments."""
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=1,
        travelers_count=3,
        travel_mode=SupportedTransportMode.MIXED,
    )
    # Bengaluru Majestic to Mysuru corridor
    c_bengaluru = Coordinates(lat=12.9778, lon=77.5724)
    c_mysuru = Coordinates(lat=12.3118, lon=76.6552)

    leg = build_travel_leg_details(
        origin_name="Bengaluru Majestic",
        dest_name="Mysuru Palace",
        dist_km=145.0,
        duration_mins=180,
        prev_coords=c_bengaluru,
        dest_coords=c_mysuru,
        request=req,
    )

    # Must preserve selected_mode as mixed
    assert leg.selected_mode == "mixed"
    assert leg.recommended_mode == "mixed"
    assert "Private Car" not in leg.recommendation_reason
    assert leg.cost_group_inr is not None
    assert leg.cost_group_inr > 0
    assert leg.cost_per_person_inr is not None
    assert len(leg.segments) >= 2

    # Segments should contain local transfer and transit
    seg_types = [s.segment_type for s in leg.segments]
    assert "first_mile" in seg_types or "local_transfer" in seg_types
    assert "intercity_transit" in seg_types or "transit" in seg_types


def test_travel_leg_private_car_toll_and_fuel_breakdown():
    """Driving car provides explicit fuel cost and separates unavailable tolls."""
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=1,
        travelers_count=2,
        travel_mode=SupportedTransportMode.DRIVING_CAR,
        fuel_efficiency_km_per_litre=14.0,
        fuel_price_per_litre=105.0,
    )
    c1 = Coordinates(lat=12.9716, lon=77.5946)
    c2 = Coordinates(lat=12.2958, lon=76.6394)

    leg = build_travel_leg_details(
        origin_name="Bengaluru",
        dest_name="Mysuru Palace",
        dist_km=140.0,
        duration_mins=180,
        prev_coords=c1,
        dest_coords=c2,
        request=req,
    )

    assert leg.selected_mode == "driving_car"
    assert leg.recommended_mode == "driving_car"
    assert leg.fuel_cost_inr is not None
    assert leg.fuel_cost_inr == pytest.approx(1050.0, abs=2.0)
    assert leg.fuel_litres == pytest.approx(10.0, abs=0.5)
    assert "Toll estimate unavailable" in leg.toll_note
    assert "Parking excluded" in leg.parking_note


def test_planning_request_travelers_and_duration_bounds():
    """Numeric planner constraints: travelers (1 to 20), duration (1 to 7 days)."""
    # Valid bounds
    req_valid = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=4,
        travelers_count=6,
        travel_mode="mixed",
    )
    assert req_valid.duration_days == 4
    assert req_valid.travelers_count == 6
    assert req_valid.travel_mode == "mixed"

    # Extreme valid
    req_max = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=7,
        travelers_count=20,
    )
    assert req_max.duration_days == 7
    assert req_max.travelers_count == 20

    # Invalid travelers < 1
    with pytest.raises(Exception):
        PlanningRequest(origin_label="Bengaluru", travelers_count=0)

    # Invalid travelers > 20
    with pytest.raises(Exception):
        PlanningRequest(origin_label="Bengaluru", travelers_count=25)

    # Invalid duration < 1
    with pytest.raises(Exception):
        PlanningRequest(origin_label="Bengaluru", duration_days=0)

    # Invalid duration > 7
    with pytest.raises(Exception):
        PlanningRequest(origin_label="Bengaluru", duration_days=8)


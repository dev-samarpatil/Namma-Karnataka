"""Tests for public transit discovery, journeys, and comparison endpoints."""

from fastapi.testclient import TestClient

from app.main import app
from app.services.transit.curated_provider import CuratedTransitProvider
from app.services.transit.models import TransitStop

client = TestClient(app)


def test_get_nearby_transit_stops():
    # Search around Bengaluru Majestic (12.9778, 77.5713)
    response = client.get(
        "/api/v1/transit/stops",
        params={"lat": 12.9778, "lon": 77.5713, "radius_km": 10.0, "limit": 5},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

    stop_ids = [s["stop_id"] for s in data]
    assert "stop-blr-majestic" in stop_ids or "stop-blr-railway-sbc" in stop_ids

    majestic = next(s for s in data if s["stop_id"] == "stop-blr-majestic")
    assert "Kempegowda Bus Station" in majestic["name_en"]
    assert "ಕೆಂಪೇಗೌಡ ಬಸ್ ನಿಲ್ದಾಣ" in majestic["name_kn"]
    assert majestic["district_code"] == "KA-BLRU"
    assert majestic["station_type"] in ("bus_terminal", "railway_station", "multimodal_hub")


def test_get_transit_stops_empty_distant():
    # Outside Karnataka boundary (e.g., Arabian sea off coast)
    response = client.get(
        "/api/v1/transit/stops",
        params={"lat": 14.0, "lon": 70.0, "radius_km": 10.0},
    )
    assert response.status_code == 200
    assert response.json() == []


def test_find_transit_journeys_bengaluru_to_mysuru():
    # Origin: Bangalore (12.9716, 77.5946), Destination: Mysore (12.2958, 76.6394)
    response = client.get(
        "/api/v1/transit/journeys",
        params={
            "origin_lat": 12.9716,
            "origin_lon": 77.5946,
            "dest_lat": 12.2958,
            "dest_lon": 76.6394,
            "departure_time": "07:30",
        },
    )
    assert response.status_code == 200
    journeys = response.json()
    assert len(journeys) >= 1

    primary = journeys[0]
    assert primary["total_duration_minutes"] > 0
    assert len(primary["legs"]) >= 1
    assert primary["total_fare_min_inr"] > 0
    assert primary["is_realtime"] is False
    assert "disclaimer" in primary
    assert "static" in primary["disclaimer"].lower() or "delays" in primary["disclaimer"].lower()


def test_compare_transit_and_road():
    # Compare between Bengaluru and Mysuru
    response = client.get(
        "/api/v1/transit/compare",
        params={
            "origin_lat": 12.9716,
            "origin_lon": 77.5946,
            "dest_lat": 12.2958,
            "dest_lon": 76.6394,
            "departure_time": "08:00",
        },
    )
    assert response.status_code == 200
    comparison = response.json()

    assert comparison["road_distance_km"] > 100.0
    assert comparison["road_duration_minutes"] > 60
    assert comparison["road_estimated_cab_cost_inr"] > 0

    assert comparison["transit_available"] is True
    assert len(comparison["transit_options"]) >= 1
    transit_fare = comparison["transit_options"][0]["total_fare_min_inr"]
    assert transit_fare < comparison["road_estimated_cab_cost_inr"]
    assert "carbon_comparison_note_en" in comparison
    assert "carbon_comparison_note_kn" in comparison


def test_curated_provider_direct_instantiation():
    provider = CuratedTransitProvider()
    stops = provider.get_all_stops()
    assert len(stops) >= 15
    assert all(isinstance(s, TransitStop) for s in stops)

    # Corridors check
    assert len(provider._routes) >= 10


def test_find_transit_journeys_transfer_feasibility():
    """Verify that 1-transfer routing through Majestic hub computes realistic layovers."""
    # Hubballi (15.3647, 75.1240) to Mysuru (12.2958, 76.6394)
    # This requires connecting through Bengaluru Majestic
    response = client.get(
        "/api/v1/transit/journeys",
        params={
            "origin_lat": 15.3647,
            "origin_lon": 75.1240,
            "dest_lat": 12.2958,
            "dest_lon": 76.6394,
            "departure_time": "06:00",
        },
    )
    assert response.status_code == 200
    journeys = response.json()
    assert len(journeys) >= 1

    transfer_journey = next((j for j in journeys if j["transfers_count"] == 1), None)
    assert transfer_journey is not None, "Expected at least one feasible transfer journey"

    legs = transfer_journey["legs"]
    assert len(legs) == 2

    leg1, leg2 = legs[0], legs[1]
    # Arrival of leg 1
    arr1_h, arr1_m = map(int, leg1["arrival_time"].split(":"))
    # Departure of leg 2
    dep2_h, dep2_m = map(int, leg2["departure_time"].split(":"))

    arr1_mins = arr1_h * 60 + arr1_m
    dep2_mins = dep2_h * 60 + dep2_m
    if dep2_mins < arr1_mins:
        dep2_mins += 24 * 60

    layover = dep2_mins - arr1_mins
    # Transfer buffer must be at least 25 minutes (intermodal Majestic hub transfer buffer)
    assert layover >= 25

    # Total duration must equal leg1 duration + layover + leg2 duration
    expected_total_duration = leg1["duration_minutes"] + layover + leg2["duration_minutes"]
    assert transfer_journey["total_duration_minutes"] == expected_total_duration

    # Fare must aggregate both legs
    assert transfer_journey["total_fare_min_inr"] >= leg1["fare_inr"] + leg2["fare_inr"]


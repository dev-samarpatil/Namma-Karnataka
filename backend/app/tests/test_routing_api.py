"""Tests for road routing API and directions calculation."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_routing_directions_endpoint_success() -> None:
    """Test road routing directions calculation connecting Bengaluru, Mysuru, and Madikeri."""
    payload = {
        "origin": {
            "name": "Bengaluru",
            "lat": 12.9716,
            "lon": 77.5946,
        },
        "destination": {
            "name": "Abbey Falls, Madikeri",
            "lat": 12.4542,
            "lon": 75.7176,
        },
        "waypoints": [
            {
                "name": "Mysuru Palace",
                "lat": 12.3051,
                "lon": 76.6551,
                "stop_order": 1,
                "day_number": 1,
            }
        ],
        "travel_mode": "driving",
    }

    response = client.post("/api/v1/routing/directions", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["calculation_method"] in ("road_network", "terrain_adjusted")
    assert data["total_distance_km"] > 50.0
    assert data["total_duration_minutes"] > 60
    assert len(data["legs"]) == 2

    # Leg 1: Bengaluru -> Mysuru Palace
    leg1 = data["legs"][0]
    assert leg1["origin"]["name"] == "Bengaluru"
    assert leg1["destination"]["name"] == "Mysuru Palace"
    assert leg1["distance_km"] > 30.0
    assert len(leg1["steps"]) >= 1

    # Leg 2: Mysuru Palace -> Abbey Falls
    leg2 = data["legs"][1]
    assert leg2["origin"]["name"] == "Mysuru Palace"
    assert leg2["destination"]["name"] == "Abbey Falls, Madikeri"
    assert leg2["distance_km"] > 30.0

    # Google Maps URL verification
    assert "https://www.google.com/maps/dir/?api=1" in data["google_maps_url"]
    assert (
        "origin=12.97160%2C77.59460" in data["google_maps_url"]
        or "origin=12.9716" in data["google_maps_url"]
    )


def test_routing_directions_input_validation() -> None:
    """Test input validation for invalid coordinate boundaries."""
    payload = {
        "origin": {
            "name": "Invalid Origin",
            "lat": 95.0,  # Invalid latitude > 90
            "lon": 77.5946,
        },
        "destination": {
            "name": "Bengaluru",
            "lat": 12.9716,
            "lon": 77.5946,
        },
        "waypoints": [],
    }

    response = client.post("/api/v1/routing/directions", json=payload)
    assert response.status_code == 422


def test_routing_directions_frontend_contract_and_modes() -> None:
    """Test that frontend travel_mode variants (driving_car, cab_taxi, public_transit)
    are successfully normalized without 422 errors and return valid road geometry.
    """
    for mode in ("driving_car", "cab_taxi", "public_transit", "walking"):
        payload = {
            "origin": {
                "name": "Bengaluru",
                "lat": 12.9716,
                "lon": 77.5946,
                "stop_id": "trip-origin",
                "stop_order": 0,
            },
            "destination": {
                "name": "Mysuru Palace",
                "lat": 12.3051,
                "lon": 76.6551,
                "stop_id": "dest-mysore",
                "stop_order": 1,
            },
            "waypoints": [],
            "travel_mode": mode,
            "day_number": 1,
        }

        response = client.post("/api/v1/routing/directions", json=payload)
        assert response.status_code == 200, f"Failed for mode {mode}: {response.text}"
        data = response.json()
        assert data["total_distance_km"] > 50.0
        assert data["total_duration_minutes"] > 30
        assert len(data["all_coordinates"]) > 0
        assert len(data["all_coordinates"][0]) == 2  # [lat, lon]

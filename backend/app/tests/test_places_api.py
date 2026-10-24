"""Automated tests for places discovery, routing estimation, and data provider integrity."""

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.places import AccommodationRead, RestaurantRead
from app.services.places.curated_provider import CuratedPlacesProvider
from app.services.routing.models import CalculationMethod
from app.services.routing.terrain_provider import TerrainAdjustedRoutingProvider

client = TestClient(app)


def test_search_restaurants_near_bangalore():
    # Lalbagh coordinates: 12.9507, 77.5844
    response = client.get(
        "/api/v1/places/restaurants",
        params={"lat": 12.9507, "lon": 77.5844, "radius_km": 15.0},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2

    slugs = [r["id"] for r in data]
    assert "mtr-lalbagh-road-bangalore" in slugs or "vidyarthi-bhavan-bangalore" in slugs

    first = data[0]
    assert first["district_code"] == "KA-BLRU"
    assert first["distance_km"] is not None
    assert first["distance_km"] <= 15.0
    assert first["price_status"] in ("verified", "estimated")
    assert first["source_name"] != ""


def test_filter_restaurants_by_vegetarian():
    response = client.get(
        "/api/v1/places/restaurants",
        params={
            "lat": 12.3087,
            "lon": 76.6612,
            "radius_km": 10.0,
            "is_vegetarian": True,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert all(r["is_vegetarian"] is True for r in data)


def test_get_restaurant_by_id():
    response = client.get("/api/v1/places/restaurants/vidyarthi-bhavan-bangalore")
    assert response.status_code == 200
    data = response.json()
    assert data["name_en"] == "Vidyarthi Bhavan"
    assert data["name_kn"] == "ವಿದ್ಯಾರ್ಥಿ ಭವನ"
    assert data["price_tier"] == "budget"
    assert data["estimated_cost_per_person_inr"] == 120.0


def test_get_restaurant_not_found():
    response = client.get("/api/v1/places/restaurants/non-existent-restaurant-999")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "not found" in data["error"]["message"].lower()


def test_search_accommodations_near_mysuru():
    # Mysuru coordinates: 12.3051, 76.6551
    response = client.get(
        "/api/v1/places/accommodations",
        params={"lat": 12.3051, "lon": 76.6551, "radius_km": 20.0},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

    acc = data[0]
    assert acc["district_code"] == "KA-MYS"
    assert acc["id"] == "kstdc-mayura-hoysala-mysuru"
    assert "KSTDC" in acc["source_name"]
    assert acc["estimated_cost_per_night_inr"] == 2200.0


def test_get_accommodation_by_id():
    response = client.get("/api/v1/places/accommodations/kstdc-mayura-bhuvaneshwari-hampi")
    assert response.status_code == 200
    data = response.json()
    assert data["district_code"] == "KA-VJN"
    assert "Bhuvaneshwari" in data["name_en"]
    assert data["booking_reference_url"] is not None


def test_get_accommodation_not_found():
    response = client.get("/api/v1/places/accommodations/fake-resort-xyz")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "not found" in data["error"]["message"].lower()


def test_routing_estimate_endpoint():
    # Route from Mysuru Palace (12.3051, 76.6551) to Hampi (15.3350, 76.4593) ~337 km straight
    response = client.get(
        "/api/v1/places/routing/estimate",
        params={
            "origin_lat": 12.3051,
            "origin_lon": 76.6551,
            "dest_lat": 15.3350,
            "dest_lon": 76.4593,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["straight_line_distance_km"] > 300.0
    assert data["estimated_road_distance_km"] > data["straight_line_distance_km"]
    assert data["calculation_method"] == CalculationMethod.TERRAIN_ADJUSTED.value
    assert data["is_approximation"] is True
    assert len(data["feasibility_warnings"]) > 0


def test_terrain_adjusted_routing_provider_unit():
    provider = TerrainAdjustedRoutingProvider()
    # Kodagu Western Ghats coordinates
    res = provider.calculate_route(12.4206, 75.7369, 12.3857, 75.4913)
    assert res.winding_factor_applied == 1.45  # Ghats factor applied
    assert res.estimated_road_distance_km > res.straight_line_distance_km
    assert res.duration_minutes >= 30


def test_curated_places_provider_model_validation():
    provider = CuratedPlacesProvider()
    rest = provider.get_restaurant_by_id("original-mylari-mysuru")
    assert isinstance(rest, RestaurantRead)
    assert rest.name_en == "Original Hotel Vinayaka Mylari"

    acc = provider.get_accommodation_by_id("the-serai-chikkamagaluru")
    assert isinstance(acc, AccommodationRead)
    assert acc.accommodation_type == "resort"
    assert acc.price_tier == "premium"

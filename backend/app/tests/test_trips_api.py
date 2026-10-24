"""Tests for authenticated Trips API, CRUD operations, and multi-tenant isolation.

Verifies:
1. Anonymous access is strictly rejected with HTTP 401.
2. User A can create, read, list, and delete their own trips.
3. Multi-tenant boundary: User B CANNOT read, list, or delete User A's trips.
4. Input validation and forbidden extra fields (spoofed user_id in body is rejected).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.repositories.trips import InMemoryTripRepository


@pytest.fixture(autouse=True)
def reset_trip_repository():
    """Ensure clean in-memory state for every test."""
    import app.repositories.trips as trips_module

    trips_module._trip_repository_instance = InMemoryTripRepository()
    yield
    trips_module._trip_repository_instance = None


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def sample_trip_payload() -> dict:
    return {
        "title": "Weekend in Mysuru & Coorg",
        "origin_label": "Bengaluru",
        "duration_days": 2,
        "pace": "balanced",
        "is_offbeat_preferred": False,
        "preferences": {"categories": ["heritage", "nature"]},
        "budget_min_inr": 115.0,
        "budget_max_inr": 115.0,
        "currency_code": "INR",
        "itinerary": {
            "language": "en",
            "generation_mode": "fallback",
            "provider_used": "deterministic_fallback",
            "items": [
                {
                    "id": "11111111-1111-4111-8111-111111111101",
                    "slug": "mysore-palace",
                    "name": "Mysuru Palace (Amba Vilas)",
                    "summary": "Historic seat of the Wadiyar dynasty.",
                    "category": "architecture",
                    "district_code": "KA-MYS",
                    "day_number": 1,
                    "order": 1,
                    "rationale": "Must-visit landmark in Mysuru.",
                    "entry_fee_min_inr": 100.0,
                    "entry_fee_max_inr": 100.0,
                    "currency_code": "INR",
                    "access_status": "open_reported",
                    "is_offbeat": False,
                },
                {
                    "id": "11111111-1111-4111-8111-111111111103",
                    "slug": "abbey-falls-madikeri",
                    "name": "Abbey Falls, Madikeri",
                    "summary": "Scenic 70-foot cascade.",
                    "category": "waterfall",
                    "district_code": "KA-KOD",
                    "day_number": 2,
                    "order": 1,
                    "rationale": "Tranquil waterfall surrounded by coffee estates.",
                    "entry_fee_min_inr": 15.0,
                    "entry_fee_max_inr": 15.0,
                    "currency_code": "INR",
                    "access_status": "open_reported",
                    "is_offbeat": False,
                },
            ],
            "total_destinations": 2,
            "duration_days": 2,
        },
    }


def test_anonymous_requests_rejected(client: TestClient):
    """Anonymous requests without Authorization header must return HTTP 401."""
    # POST
    res = client.post("/api/v1/trips", json=sample_trip_payload())
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"

    # GET list
    res = client.get("/api/v1/trips")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"

    # GET detail
    res = client.get("/api/v1/trips/trip-12345")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"

    # DELETE
    res = client.delete("/api/v1/trips/trip-12345")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"


def test_invalid_bearer_token_rejected(client: TestClient):
    """Malformed or invalid token must return HTTP 401 INVALID_CREDENTIALS."""
    headers = {"Authorization": "Bearer totally-invalid-random-token-xyz"}
    res = client.get("/api/v1/trips", headers=headers)
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_user_a_create_list_get_delete_trip_lifecycle(client: TestClient):
    """User A creates a trip, lists it, views details, and deletes it."""
    user_a_headers = {"Authorization": "Bearer test-token-user-1"}

    # 1. Create Trip
    payload = sample_trip_payload()
    res = client.post("/api/v1/trips", json=payload, headers=user_a_headers)
    assert res.status_code == 201
    created_trip = res.json()
    trip_id = created_trip["id"]
    assert created_trip["title"] == payload["title"]
    assert created_trip["user_id"] == "00000000-0000-0000-0000-000000000001"
    assert len(created_trip["snapshot"]["items"]) == 2

    # 2. List Trips for User A
    res = client.get("/api/v1/trips", headers=user_a_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == trip_id
    assert data["items"][0]["title"] == payload["title"]

    # 3. Retrieve Detail
    res = client.get(f"/api/v1/trips/{trip_id}", headers=user_a_headers)
    assert res.status_code == 200
    assert res.json()["id"] == trip_id
    assert res.json()["snapshot"]["items"][0]["slug"] == "mysore-palace"

    # 4. Delete Trip
    res = client.delete(f"/api/v1/trips/{trip_id}", headers=user_a_headers)
    assert res.status_code == 200
    assert res.json()["deleted"] is True

    # 5. Subsequent GET returns 404
    res = client.get(f"/api/v1/trips/{trip_id}", headers=user_a_headers)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "TRIP_NOT_FOUND"


def test_cross_user_isolation_preventing_data_leakage(client: TestClient):
    """User B CANNOT see, retrieve, or delete User A's trips."""
    user_a_headers = {"Authorization": "Bearer test-token-user-1"}
    user_b_headers = {"Authorization": "Bearer test-token-user-2"}

    # User A creates a trip
    res = client.post("/api/v1/trips", json=sample_trip_payload(), headers=user_a_headers)
    assert res.status_code == 201
    trip_a_id = res.json()["id"]

    # User B lists trips -> should see 0 trips
    res = client.get("/api/v1/trips", headers=user_b_headers)
    assert res.status_code == 200
    assert res.json()["total"] == 0
    assert len(res.json()["items"]) == 0

    # User B attempts to read User A's trip -> returns 404 TRIP_NOT_FOUND (no leakage)
    res = client.get(f"/api/v1/trips/{trip_a_id}", headers=user_b_headers)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "TRIP_NOT_FOUND"

    # User B attempts to delete User A's trip -> returns 404 TRIP_NOT_FOUND
    res = client.delete(f"/api/v1/trips/{trip_a_id}", headers=user_b_headers)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "TRIP_NOT_FOUND"

    # Verify User A's trip is still safe and accessible by User A
    res = client.get(f"/api/v1/trips/{trip_a_id}", headers=user_a_headers)
    assert res.status_code == 200
    assert res.json()["id"] == trip_a_id


def test_reject_client_supplied_user_id_in_body(client: TestClient):
    """Attempting to inject a user_id or extra field in body must be rejected (extra='forbid')."""
    user_a_headers = {"Authorization": "Bearer test-token-user-1"}
    payload = sample_trip_payload()
    payload["user_id"] = "spoofed-another-user-uuid"

    res = client.post("/api/v1/trips", json=payload, headers=user_a_headers)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_trip_input_validation(client: TestClient):
    """Duration out of bounds (1-14) or invalid pace must be rejected."""
    user_a_headers = {"Authorization": "Bearer test-token-user-1"}

    # duration 0
    payload = sample_trip_payload()
    payload["duration_days"] = 0
    res = client.post("/api/v1/trips", json=payload, headers=user_a_headers)
    assert res.status_code == 422

    # duration 15
    payload["duration_days"] = 15
    res = client.post("/api/v1/trips", json=payload, headers=user_a_headers)
    assert res.status_code == 422

    # invalid pace
    payload["duration_days"] = 3
    payload["pace"] = "hypersonic"
    res = client.post("/api/v1/trips", json=payload, headers=user_a_headers)
    assert res.status_code == 422


def test_user_a_update_trip_and_multi_tenant_protection(client: TestClient):
    """User A can update their trip; User B cannot update User A's trip."""
    user_a_headers = {"Authorization": "Bearer test-token-user-1"}
    user_b_headers = {"Authorization": "Bearer test-token-user-2"}

    # 1. User A creates trip
    payload = sample_trip_payload()
    res = client.post("/api/v1/trips", json=payload, headers=user_a_headers)
    assert res.status_code == 201
    trip_id = res.json()["id"]

    # 2. Anonymous PUT is rejected (401)
    update_payload = {
        "title": "Updated Mysuru Trip",
        "itinerary": payload["itinerary"],
    }
    res = client.put(f"/api/v1/trips/{trip_id}", json=update_payload)
    assert res.status_code == 401

    # 3. User B attempts to update User A's trip -> 404
    res = client.put(f"/api/v1/trips/{trip_id}", json=update_payload, headers=user_b_headers)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "TRIP_NOT_FOUND"

    # 4. User A successfully updates trip -> 200
    res = client.put(f"/api/v1/trips/{trip_id}", json=update_payload, headers=user_a_headers)
    assert res.status_code == 200
    updated_trip = res.json()
    assert updated_trip["id"] == trip_id
    assert updated_trip["title"] == "Updated Mysuru Trip"

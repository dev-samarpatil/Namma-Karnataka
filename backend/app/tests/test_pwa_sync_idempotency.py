"""Tests for resilient offline sync, idempotency, and optimistic concurrency control."""

from fastapi.testclient import TestClient
import pytest

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
def client():
    return TestClient(app)


def _create_sample_itinerary():
    return {
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
            }
        ],
        "total_destinations": 1,
        "duration_days": 1,
    }


def test_trip_update_idempotency_replay(client):
    """Test that retrying an update with the same Idempotency-Key returns cached result without 409 conflict."""
    headers = {"Authorization": "Bearer test-token-user-1"}
    init_itinerary = _create_sample_itinerary()

    # 1. Save cloud trip
    save_resp = client.post(
        "/api/v1/trips",
        json={
            "title": "Sync Test Trip",
            "origin_label": "Bengaluru",
            "duration_days": 1,
            "pace": "balanced",
            "itinerary": init_itinerary,
        },
        headers=headers,
    )
    assert save_resp.status_code == 201
    trip_id = save_resp.json()["id"]
    assert save_resp.json()["version"] == 1

    # 2. Update trip with Idempotency-Key
    updated_itinerary = _create_sample_itinerary()
    idempotency_key = "idemp-key-sync-op-001"

    update_resp1 = client.put(
        f"/api/v1/trips/{trip_id}",
        json={
            "title": "Sync Test Trip (Updated)",
            "expected_version": 1,
            "idempotency_key": idempotency_key,
            "itinerary": updated_itinerary,
        },
        headers=headers,
    )
    assert update_resp1.status_code == 200
    data1 = update_resp1.json()
    assert data1["version"] == 2
    assert data1["title"] == "Sync Test Trip (Updated)"

    # 3. Simulate client network retry with identical Idempotency-Key
    update_resp2 = client.put(
        f"/api/v1/trips/{trip_id}",
        json={
            "title": "Sync Test Trip (Updated)",
            "expected_version": 1,  # expected_version is still 1 from initial queued attempt
            "idempotency_key": idempotency_key,
            "itinerary": updated_itinerary,
        },
        headers=headers,
    )
    assert update_resp2.status_code == 200
    data2 = update_resp2.json()
    assert data2["version"] == 2  # Idempotent response: not incremented to 3
    assert data2["title"] == "Sync Test Trip (Updated)"


def test_trip_update_stale_version_triggers_409_conflict(client):
    """Test that submitting an edit with mismatched expected_version triggers HTTP 409 conflict."""
    headers = {"Authorization": "Bearer test-token-user-2"}
    itinerary = _create_sample_itinerary()

    save_resp = client.post(
        "/api/v1/trips",
        json={
            "title": "Conflict Test Trip",
            "origin_label": "Bengaluru",
            "duration_days": 1,
            "pace": "balanced",
            "itinerary": itinerary,
        },
        headers=headers,
    )
    assert save_resp.status_code == 201
    trip_id = save_resp.json()["id"]

    # First update moves version to 2
    res_v2 = client.put(
        f"/api/v1/trips/{trip_id}",
        json={"expected_version": 1, "itinerary": itinerary},
        headers=headers,
    )
    assert res_v2.status_code == 200
    assert res_v2.json()["version"] == 2

    # Stale second update expecting v1 triggers 409
    stale_resp = client.put(
        f"/api/v1/trips/{trip_id}",
        json={"expected_version": 1, "itinerary": itinerary},
        headers=headers,
    )
    assert stale_resp.status_code == 409
    assert stale_resp.json()["error"]["code"] == "TRIP_VERSION_CONFLICT"

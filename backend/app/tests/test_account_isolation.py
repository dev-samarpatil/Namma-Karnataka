"""Tests for multi-tenant account isolation, RLS boundaries, and idempotent trip transfer."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.repositories.trips import InMemoryTripRepository

USER_1_TOKEN = "test-token-user-1"
USER_2_TOKEN = "test-token-user-2"


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


def sample_trip_payload(title: str = "User 1 Private Mysuru Journey") -> dict:
    return {
        "title": title,
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


def test_unauthenticated_requests_rejected(client: TestClient):
    """Verify endpoints reject requests with missing or invalid credentials."""
    # Missing token
    res = client.get("/api/v1/trips")
    assert res.status_code == 401

    # Invalid token
    res = client.get("/api/v1/trips", headers={"Authorization": "Bearer totally-invalid-token"})
    assert res.status_code == 401


def test_user_a_and_user_b_isolation(client: TestClient):
    """Verify strict multi-tenant boundary: User A cannot be accessed or manipulated by User B."""
    headers_user_1 = {"Authorization": f"Bearer {USER_1_TOKEN}"}
    headers_user_2 = {"Authorization": f"Bearer {USER_2_TOKEN}"}

    # 1. User 1 creates a private trip
    create_payload = sample_trip_payload("User 1 Private Mysuru Journey")
    create_res = client.post("/api/v1/trips", json=create_payload, headers=headers_user_1)
    assert create_res.status_code == 201
    trip_1 = create_res.json()
    trip_1_id = trip_1["id"]
    assert trip_1["user_id"] == "00000000-0000-0000-0000-000000000001"

    # 2. User 2 lists trips; User 1's trip must NOT appear
    list_res_2 = client.get("/api/v1/trips", headers=headers_user_2)
    assert list_res_2.status_code == 200
    user_2_trip_ids = [item["id"] for item in list_res_2.json()["items"]]
    assert trip_1_id not in user_2_trip_ids

    # 3. User 2 attempts to read User 1's trip directly; must return 404
    get_res_2 = client.get(f"/api/v1/trips/{trip_1_id}", headers=headers_user_2)
    assert get_res_2.status_code == 404

    # 4. User 2 attempts to update User 1's trip; must return 404
    update_payload = {
        "title": "Hacked Title",
        "itinerary": create_payload["itinerary"],
    }
    update_res_2 = client.put(f"/api/v1/trips/{trip_1_id}", json=update_payload, headers=headers_user_2)
    assert update_res_2.status_code == 404

    # 5. User 2 attempts to delete User 1's trip; must return 404
    del_res_2 = client.delete(f"/api/v1/trips/{trip_1_id}", headers=headers_user_2)
    assert del_res_2.status_code == 404

    # Verify trip still exists untouched for User 1
    get_res_1 = client.get(f"/api/v1/trips/{trip_1_id}", headers=headers_user_1)
    assert get_res_1.status_code == 200
    assert get_res_1.json()["title"] == "User 1 Private Mysuru Journey"


def test_idempotent_guest_trip_import(client: TestClient):
    """Verify that retrying a trip creation/import with the same Idempotency-Key returns cached trip and avoids duplicates."""
    headers = {"Authorization": f"Bearer {USER_1_TOKEN}", "Idempotency-Key": "import-guest-trip-999"}

    payload = sample_trip_payload("Imported Coorg Gateway")

    # First attempt: creates trip
    res_1 = client.post("/api/v1/trips", json=payload, headers=headers)
    assert res_1.status_code == 201
    trip_data_1 = res_1.json()

    # Second attempt (replay): returns same trip
    res_2 = client.post("/api/v1/trips", json=payload, headers=headers)
    assert res_2.status_code == 201
    trip_data_2 = res_2.json()

    assert trip_data_1["id"] == trip_data_2["id"]
    assert trip_data_1["version"] == trip_data_2["version"]

    # Verify listing only has one entry with this ID
    list_res = client.get("/api/v1/trips", headers={"Authorization": f"Bearer {USER_1_TOKEN}"})
    matching = [t for t in list_res.json()["items"] if t["id"] == trip_data_1["id"]]
    assert len(matching) == 1


def test_viewer_share_cannot_mutate_trip(client: TestClient):
    """Verify that a viewer share token is strictly read-only and cannot mutate trip state."""
    owner_headers = {"Authorization": f"Bearer {USER_1_TOKEN}"}

    # 1. Owner creates trip
    payload = sample_trip_payload("Protected Trip for Viewer Test")
    create_res = client.post(
        "/api/v1/trips",
        json=payload,
        headers=owner_headers,
    )
    assert create_res.status_code == 201
    trip_id = create_res.json()["id"]

    # 2. Owner creates viewer share token
    share_res = client.post(
        f"/api/v1/trips/{trip_id}/shares",
        json={"role": "viewer", "expires_in_days": 7},
        headers=owner_headers,
    )
    assert share_res.status_code == 201
    viewer_token = share_res.json()["share_token"]

    # 3. Viewer retrieves trip -> 200 OK
    get_shared = client.get(f"/api/v1/trips/shared/{viewer_token}")
    assert get_shared.status_code == 200
    assert get_shared.json()["role"] == "viewer"

    # 4. Viewer tries to mutate trip -> 403 Forbidden
    update_res = client.put(
        f"/api/v1/trips/shared/{viewer_token}",
        json={"expected_version": 1, "itinerary": payload["itinerary"]},
    )
    assert update_res.status_code == 403
    assert update_res.json()["error"]["code"] == "SHARE_FORBIDDEN"

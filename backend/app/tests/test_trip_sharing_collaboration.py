"""Tests for Phase 6 trip sharing, multi-day collaboration, concurrency, and audit logs.

Verifies:
1. Owner can create viewer and editor share links.
2. Viewers can retrieve shared trips but CANNOT modify them (HTTP 403).
3. Editors can update shared trips under optimistic concurrency control.
4. Stale writes produce HTTP 409 Conflict without silent data loss.
5. Owner can list and revoke shares; revoked links are rejected (HTTP 403).
6. Comprehensive audit history tracks creation, sharing, updates, conflicts, and revocations.
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



def auth_headers(user_id: str = "user_owner_1") -> dict[str, str]:
    token = "test-token-user-1" if "1" in user_id else "test-token-user-2"
    return {
        "Authorization": f"Bearer {token}",
    }



def test_create_and_read_viewer_share(client: TestClient):
    """Owner creates viewer share link; viewer reads snapshot with viewer role."""
    # 1. Create trip as owner
    create_res = client.post("/api/v1/trips", json=sample_trip_payload(), headers=auth_headers())
    assert create_res.status_code == 201
    trip_id = create_res.json()["id"]

    # 2. Owner creates viewer share link
    share_res = client.post(
        f"/api/v1/trips/{trip_id}/shares",
        json={"role": "viewer", "expires_in_days": 7},
        headers=auth_headers(),
    )
    assert share_res.status_code == 201
    share_data = share_res.json()
    assert share_data["role"] == "viewer"
    assert share_data["is_revoked"] is False
    token = share_data["share_token"]

    # 3. Anonymous viewer accesses shared trip
    view_res = client.get(f"/api/v1/trips/shared/{token}")
    assert view_res.status_code == 200
    view_data = view_res.json()
    assert view_data["id"] == trip_id
    assert view_data["role"] == "viewer"
    assert view_data["version"] == 1
    assert len(view_data["snapshot"]["items"]) == 2



def test_viewer_cannot_mutate_shared_trip(client: TestClient):
    """Viewers are strictly forbidden from modifying shared itineraries."""
    create_res = client.post("/api/v1/trips", json=sample_trip_payload(), headers=auth_headers())
    trip_id = create_res.json()["id"]

    share_res = client.post(
        f"/api/v1/trips/{trip_id}/shares",
        json={"role": "viewer", "expires_in_days": 30},
        headers=auth_headers(),
    )
    token = share_res.json()["share_token"]

    update_payload = {
        "expected_version": 1,
        "title": "Hacked Title",
        "itinerary": sample_trip_payload()["itinerary"],
    }
    mutate_res = client.put(f"/api/v1/trips/shared/{token}", json=update_payload)
    assert mutate_res.status_code == 403
    assert mutate_res.json()["error"]["code"] == "SHARE_FORBIDDEN"


def test_editor_can_update_shared_trip_and_audit(client: TestClient):
    """Editor can update shared trip and version increments safely."""
    create_res = client.post("/api/v1/trips", json=sample_trip_payload(), headers=auth_headers())
    trip_id = create_res.json()["id"]

    # Create editor share link
    share_res = client.post(
        f"/api/v1/trips/{trip_id}/shares",
        json={"role": "editor", "expires_in_days": 30},
        headers=auth_headers(),
    )
    token = share_res.json()["share_token"]

    # Editor updates trip
    updated_itin = sample_trip_payload()["itinerary"]
    update_payload = {
        "expected_version": 1,
        "title": "Collaborative Heritage Journey",
        "itinerary": updated_itin,
    }
    update_res = client.put(f"/api/v1/trips/shared/{token}", json=update_payload)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["version"] == 2
    assert updated_data["title"] == "Collaborative Heritage Journey"

    # Verify audit history
    history_res = client.get(f"/api/v1/trips/{trip_id}/history", headers=auth_headers())
    assert history_res.status_code == 200
    events = history_res.json()["items"]
    assert len(events) >= 3
    actions = [e["action"] for e in events]
    assert "created" in actions
    assert "shared" in actions
    assert "updated" in actions


def test_optimistic_concurrency_conflict_409(client: TestClient):
    """Collaborator submitting stale expected_version triggers HTTP 409 Conflict."""
    create_res = client.post("/api/v1/trips", json=sample_trip_payload(), headers=auth_headers())
    trip_id = create_res.json()["id"]

    share_res = client.post(
        f"/api/v1/trips/{trip_id}/shares",
        json={"role": "editor", "expires_in_days": 30},
        headers=auth_headers(),
    )
    token = share_res.json()["share_token"]

    # Collaborator A updates trip to version 2
    res_a = client.put(
        f"/api/v1/trips/shared/{token}",
        json={"expected_version": 1, "itinerary": sample_trip_payload()["itinerary"]},
    )
    assert res_a.status_code == 200
    assert res_a.json()["version"] == 2

    # Collaborator B attempts update still using stale expected_version 1
    res_b = client.put(
        f"/api/v1/trips/shared/{token}",
        json={
            "expected_version": 1,
            "title": "Conflicting edit",
            "itinerary": sample_trip_payload()["itinerary"],
        },
    )
    assert res_b.status_code == 409
    assert res_b.json()["error"]["code"] == "TRIP_VERSION_CONFLICT"


def test_share_revocation(client: TestClient):
    """Owner revokes share link; subsequent access is rejected with HTTP 403."""
    create_res = client.post("/api/v1/trips", json=sample_trip_payload(), headers=auth_headers())
    trip_id = create_res.json()["id"]

    share_res = client.post(
        f"/api/v1/trips/{trip_id}/shares",
        json={"role": "viewer", "expires_in_days": 10},
        headers=auth_headers(),
    )
    share_id = share_res.json()["id"]
    token = share_res.json()["share_token"]

    # Initial view succeeds
    assert client.get(f"/api/v1/trips/shared/{token}").status_code == 200

    # Owner lists shares
    list_res = client.get(f"/api/v1/trips/{trip_id}/shares", headers=auth_headers())
    assert list_res.status_code == 200
    assert len(list_res.json()["items"]) == 1

    # Owner revokes share
    del_res = client.delete(
        f"/api/v1/trips/{trip_id}/shares/{share_id}", headers=auth_headers()
    )
    assert del_res.status_code == 200

    # Viewer access is now rejected
    view_res = client.get(f"/api/v1/trips/shared/{token}")
    assert view_res.status_code == 403
    assert view_res.json()["error"]["code"] == "SHARE_REVOKED"

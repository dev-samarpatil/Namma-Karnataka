"""End-to-End Real HTTP Integration Verification for Namma Karnataka.

Tests real HTTP communication over ASGI / FastAPI routes without mocking.
Ensures secrets are NEVER logged or printed.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def run_e2e_verification() -> bool:
    client = TestClient(app, base_url="http://localhost:8000")
    all_passed = True

    print("=" * 60)
    print("NAMMA KARNATAKA - E2E INTEGRATION & CONTRACT VERIFICATION")
    print("=" * 60)

    # 1. Health & Readiness Probes
    print("\n--- 1. Health & Readiness Probes ---")
    res = client.get("/api/v1/health")
    if res.status_code == 200 and res.json().get("status") == "ok":
        print(f"PASS: /api/v1/health -> HTTP {res.status_code} ({res.json().get('service')})")
    else:
        print(f"FAIL: /api/v1/health -> HTTP {res.status_code}: {res.text}")
        all_passed = False

    res = client.get("/api/v1/ready")
    if res.status_code == 200 and res.json().get("ready") is True:
        print(f"PASS: /api/v1/ready -> HTTP {res.status_code} (ready={res.json().get('ready')})")
    else:
        print(f"FAIL: /api/v1/ready -> HTTP {res.status_code}: {res.text}")
        all_passed = False

    # 2. CORS Verification
    print("\n--- 2. CORS Headers ---")
    cors_headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
    }
    res = client.options("/api/v1/destinations", headers=cors_headers)
    allow_origin = res.headers.get("access-control-allow-origin")
    if allow_origin in ("http://localhost:5173", "*"):
        print(f"PASS: CORS Access-Control-Allow-Origin: {allow_origin}")
    else:
        print(f"FAIL: CORS origin not allowed. Got: {allow_origin}")
        all_passed = False

    # 3. Request-ID Propagation
    print("\n--- 3. Request-ID Propagation ---")
    custom_req_id = "req-e2e-trace-998877"
    res = client.get("/api/v1/health", headers={"X-Request-ID": custom_req_id})
    received_req_id = res.headers.get("x-request-id")
    if received_req_id == custom_req_id:
        print(f"PASS: Request-ID propagated cleanly: {received_req_id}")
    else:
        print(f"FAIL: Expected Request-ID '{custom_req_id}', got: '{received_req_id}'")
        all_passed = False

    # 4. Destination Discovery API
    print("\n--- 4. Destination Discovery API ---")
    # All destinations
    res = client.get("/api/v1/destinations")
    data = res.json()
    if res.status_code == 200 and data.get("total", 0) > 0:
        total = data["total"]
        limit = data["limit"]
        print(f"PASS: /api/v1/destinations returned {total} total items (limit={limit})")
    else:
        print(f"FAIL: /api/v1/destinations -> HTTP {res.status_code}: {res.text}")
        all_passed = False

    # District filter
    res = client.get("/api/v1/destinations?district=KA-BLRU")
    data = res.json()
    items = data.get("items", [])
    if res.status_code == 200 and all(i.get("district_code") == "KA-BLRU" for i in items):
        print(f"PASS: Filter by district 'KA-BLRU' returned {len(items)} items matching district")
    else:
        print(f"FAIL: District filter failed -> HTTP {res.status_code}")
        all_passed = False

    # Category filter
    res = client.get("/api/v1/destinations?category=heritage")
    items = res.json().get("items", [])
    if res.status_code == 200 and all(i.get("category") == "heritage" for i in items):
        print(f"PASS: Filter by category 'heritage' returned {len(items)} items")
    else:
        print(f"FAIL: Category filter failed -> HTTP {res.status_code}")
        all_passed = False

    # Offbeat filter
    res = client.get("/api/v1/destinations?is_offbeat=true")
    items = res.json().get("items", [])
    if res.status_code == 200 and all(i.get("is_offbeat") is True for i in items):
        print(f"PASS: Filter is_offbeat=true returned {len(items)} offbeat destinations")
    else:
        print(f"FAIL: Offbeat filter failed -> HTTP {res.status_code}")
        all_passed = False

    # Single destination by slug
    res = client.get("/api/v1/destinations/mysore-palace")
    if res.status_code == 200 and res.json().get("slug") == "mysore-palace":
        name = res.json().get("name_en")
        print(f"PASS: /api/v1/destinations/mysore-palace resolved by slug (name='{name}')")
    else:
        print(f"FAIL: Slug lookup failed -> HTTP {res.status_code}")
        all_passed = False

    # Non-existent destination (404)
    res = client.get("/api/v1/destinations/non-existent-xyz-999")
    is_not_found = res.json().get("error", {}).get("code") == "DESTINATION_NOT_FOUND"
    if res.status_code == 404 and is_not_found:
        print("PASS: Missing destination correctly returned normalized 404 DESTINATION_NOT_FOUND")
    else:
        print(f"FAIL: Missing destination did not return normalized 404: {res.text}")
        all_passed = False

    # 5. Planning Recommendations API
    print("\n--- 5. Planning Recommendations API ---")
    # Valid Request
    plan_payload = {
        "duration_days": 2,
        "pace": "balanced",
        "language": "en",
        "origin_label": "Bengaluru",
        "categories": ["heritage", "nature"],
        "is_offbeat_preferred": False,
    }
    res = client.post("/api/v1/planning/recommendations", json=plan_payload)
    if res.status_code == 200:
        data = res.json()
        print("PASS: Planning recommendations succeeded -> HTTP 200")
        print(f"      Generation Mode: {data.get('generation_mode')}")
        print(f"      Provider Used:   {data.get('provider_used')}")
        print(f"      Duration (Days): {data.get('duration_days')}")
        print(f"      Stops Returned:  {len(data.get('items', []))}")
    else:
        print(f"FAIL: Planning recommendations -> HTTP {res.status_code}: {res.text}")
        all_passed = False

    # Validation Error Check (duration=0, invalid pace)
    invalid_payload = {
        "duration_days": 0,
        "pace": "ultra_fast_warp_speed",
        "language": "en",
    }
    res = client.post("/api/v1/planning/recommendations", json=invalid_payload)
    if res.status_code == 422:
        err = res.json().get("error", {})
        print(f"PASS: Invalid payload caught cleanly -> HTTP 422 (code='{err.get('code')}')")
    else:
        print(f"FAIL: Expected HTTP 422 on invalid payload, got: HTTP {res.status_code}")
        all_passed = False

    # 6. Authenticated Trips API & Multi-Tenant Isolation
    print("\n--- 6. Authenticated Trips API & Multi-Tenant Isolation ---")
    # Anonymous request should return 401
    res = client.get("/api/v1/trips")
    if res.status_code == 401 and res.json().get("error", {}).get("code") == "UNAUTHORIZED":
        print("PASS: Anonymous trip access rejected -> HTTP 401 UNAUTHORIZED")
    else:
        print(f"FAIL: Expected 401 on anonymous trips, got HTTP {res.status_code}")
        all_passed = False

    # User A creates a trip
    user_a_token = "Bearer test-token-user-1"
    trip_body = {
        "title": "Weekend in Mysuru",
        "origin_label": "Bengaluru",
        "duration_days": 2,
        "pace": "balanced",
        "is_offbeat_preferred": False,
        "budget_min_inr": 100.0,
        "budget_max_inr": 100.0,
        "itinerary": {
            "language": "en",
            "generation_mode": "fallback",
            "provider_used": "deterministic_fallback",
            "items": [
                {
                    "id": "11111111-1111-4111-8111-111111111101",
                    "slug": "mysore-palace",
                    "name": "Mysuru Palace (Amba Vilas)",
                    "category": "architecture",
                    "district_code": "KA-MYS",
                    "day_number": 1,
                    "order": 1,
                    "rationale": "Historic royal palace in Mysuru.",
                    "currency_code": "INR",
                    "access_status": "open_reported",
                    "is_offbeat": False,
                }
            ],
            "total_destinations": 1,
            "duration_days": 2,
        },
    }
    res = client.post("/api/v1/trips", json=trip_body, headers={"Authorization": user_a_token})
    trip_a_id = None
    if res.status_code == 201:
        trip_a_id = res.json().get("id")
        print(f"PASS: User A created saved trip -> HTTP 201 (id={trip_a_id})")
    else:
        print(f"FAIL: User A failed to create trip -> HTTP {res.status_code}: {res.text}")
        all_passed = False

    # User B cannot read User A's trip (Multi-Tenant Isolation)
    user_b_token = "Bearer test-token-user-2"
    if trip_a_id:
        res = client.get(f"/api/v1/trips/{trip_a_id}", headers={"Authorization": user_b_token})
        if res.status_code == 404 and res.json().get("error", {}).get("code") == "TRIP_NOT_FOUND":
            print("PASS: Multi-tenant boundary verified: User B cannot access User A's trip (404)")
        else:
            print(f"FAIL: Cross-user data leakage! User B received HTTP {res.status_code}")
            all_passed = False

        # User A reads their own trip
        res = client.get(f"/api/v1/trips/{trip_a_id}", headers={"Authorization": user_a_token})
        if res.status_code == 200 and res.json().get("id") == trip_a_id:
            title = res.json().get("title")
            print(f"PASS: User A retrieved own trip detail -> HTTP 200 ('{title}')")
        else:
            print(f"FAIL: User A failed to read own trip -> HTTP {res.status_code}")
            all_passed = False

        # User A deletes their trip
        res = client.delete(f"/api/v1/trips/{trip_a_id}", headers={"Authorization": user_a_token})
        if res.status_code == 200 and res.json().get("deleted") is True:
            print("PASS: User A deleted own trip -> HTTP 200")
        else:
            print(f"FAIL: User A failed to delete trip -> HTTP {res.status_code}")
            all_passed = False

    print("\n" + "=" * 60)
    print(f"E2E VERIFICATION RESULT: {'ALL PASSED' if all_passed else 'SOME CHECKS FAILED'}")
    print("=" * 60)
    return all_passed


if __name__ == "__main__":
    success = run_e2e_verification()
    sys.exit(0 if success else 1)

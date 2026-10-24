# Phase 3 — Final Hardening Findings Register

**Environment:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Audit Date:** 2026-10-24  
**Audit Scope:** Public Transit Integration, PWA & Offline Engine, Cache Security, Destination Data Integrity  

---

## Findings Summary

| Finding ID | Component | Severity | Description | Status |
|---|---|---|---|---|
| `FIND-P3-001` | Public Transit Routing | `HIGH` | Constant 30-min transfer buffer caused inaccurate layover duration calculations | `FIXED` |
| `FIND-P3-002` | Public Transit Routing | `MEDIUM` | Cross-terminal transfer between SBC Rail and Majestic Bus lacked dedicated walking buffer | `FIXED` |
| `FIND-P3-003` | Service Worker | `MEDIUM` | Uncached non-list endpoints returned empty list envelope instead of 503 HTTP status | `FIXED` |
| `FIND-P3-004` | Service Worker | `MEDIUM` | Service worker lacked explicit bypass for requests with `Authorization` headers | `FIXED` |
| `FIND-P3-005` | Python Linter / Style | `LOW` | E501 line length violation in `curated_provider.py` | `FIXED` |

---

## Detailed Finding Reports

### FIND-P3-001: Inaccurate Layover Duration in Multi-Leg Transit Routing

- **Component:** `backend/app/services/transit/curated_provider.py`
- **Severity:** `HIGH`
- **Reproduction Steps:**
  1. Call `/api/v1/transit/journeys?origin_lat=15.3647&origin_lon=75.1240&dest_lat=12.2958&dest_lon=76.6394&departure_time=06:00` (Hubballi to Mysuru via Bengaluru).
  2. Inspect the resulting transfer option.
- **Expected Behavior:** Total duration should equal $\text{Duration}_{\text{Leg 1}} + \text{Actual Layover} + \text{Duration}_{\text{Leg 2}}$, where layover is calculated between leg 1 arrival and leg 2 scheduled departure.
- **Actual Behavior:** Total duration was hardcoded as `dur1 + 30 + dur2`, underreporting travel time when the connecting departure was several hours later.
- **Root Cause:** A fixed 30-minute constant was added instead of computing the time delta between arrival of leg 1 and departure of leg 2.
- **Fix:** Implemented `_minutes_diff(t1, t2)` with midnight rollover handling, computing actual physical layovers.
- **Test Added:** `backend/app/tests/test_transit_api.py::test_find_transit_journeys_transfer_feasibility`.
- **Verification Result:** PASSED (Verified in pytest in 1.10s).

---

### FIND-P3-002: Intermodal Pedestrian Connection Buffer at Majestic Hub

- **Component:** `backend/app/services/transit/curated_provider.py`
- **Severity:** `MEDIUM`
- **Reproduction Steps:**
  1. Connect a rail service arriving at `stop-blr-railway-sbc` to an onward bus departing from `stop-blr-majestic`.
- **Expected Behavior:** Cross-terminal walking time through the pedestrian subway should be accounted for with an increased transfer buffer (35 minutes) versus same-terminal transfers (25 minutes).
- **Actual Behavior:** The same minimum buffer was applied uniformly regardless of whether the transfer involved crossing terminals.
- **Root Cause:** Hub identifiers were not compared to detect cross-terminal transfers.
- **Fix:** Added `is_cross_station = r1_hub_id != r2_hub_id` and assigned `min_buffer = 35` for intermodal transfers.
- **Test Added:** Covered by `test_transit_api.py`.
- **Verification Result:** PASSED.

---

### FIND-P3-003: Suboptimal Offline Fallback Envelope for Non-List Endpoints

- **Component:** `frontend/public/sw.js`
- **Severity:** `MEDIUM`
- **Reproduction Steps:**
  1. Make an offline request to `/api/v1/destinations/{slug}` or `/api/v1/transit/compare` when the resource is not in cache.
- **Expected Behavior:** Return a clean HTTP 503 Service Unavailable with an offline notice, allowing UI error boundaries to handle the state cleanly.
- **Actual Behavior:** Returned an empty list envelope `{ items: [], total: 0 }`, causing schema mismatch errors in consumers expecting a destination or comparison object.
- **Root Cause:** Global fallback was returning a list dictionary for all paths matching `/api/v1/destinations` or `/api/v1/transit`.
- **Fix:** Restricted the `{ items: [] }` envelope strictly to `/api/v1/destinations`; returned HTTP 503 JSON for detail and comparison requests.
- **Test Added:** Verified via Vitest and production build.
- **Verification Result:** PASSED.

---

### FIND-P3-004: Explicit Security Guard for Authorized Requests in Service Worker

- **Component:** `frontend/public/sw.js`
- **Severity:** `MEDIUM`
- **Reproduction Steps:**
  1. Review `sw.js` fetch listener rules for requests with `Authorization` headers.
- **Expected Behavior:** Explicitly bypass Service Worker caching for any request carrying credentials.
- **Actual Behavior:** Caching was excluded by path, but lacked an explicit header-level defense-in-depth bypass.
- **Root Cause:** Absence of header-level guard clause before API matching logic.
- **Fix:** Added `if (request.headers.has('Authorization')) return;` at the start of the fetch handler.
- **Test Added:** Included in cache privacy regression tests.
- **Verification Result:** PASSED.

---

### FIND-P3-005: Line Length Violation in Transit Provider

- **Component:** `backend/app/services/transit/curated_provider.py`
- **Severity:** `LOW`
- **Reproduction Steps:** Run `ruff check backend`.
- **Expected Behavior:** Zero lint errors.
- **Actual Behavior:** `E501 Line too long (112 > 100)` on line 242.
- **Root Cause:** Long explanatory comment exceeded 100 characters.
- **Fix:** Wrapped comment across two lines.
- **Test:** `ruff check backend` returned `All checks passed!`.
- **Verification Result:** PASSED.

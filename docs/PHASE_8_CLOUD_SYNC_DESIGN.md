# Phase 8 — Resilient Cloud Synchronization & OCC Design

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Phase:** Phase 8 — Persistence and Account Experience  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Synchronization Architecture

Namma Karnataka distinguishes clearly between three categories of itineraries:
1. **Guest-Local Trip:** Stored strictly on device in `localStorage['nk_saved_trips']`. Remains local until explicitly transferred.
2. **Cloud Trip with Pending Local Edits:** Associated with an authenticated user's account with queued modifications.
3. **Shared Itinerary:** Accessed via token with viewer or editor roles. Modifications must revalidate token validity and permissions.

---

## 2. Optimistic Concurrency Control (OCC)

When updating a cloud trip or shared itinerary:
- Client submits `expected_version: N`.
- The repository checks the active version in PostgreSQL:
  ```python
  if request.expected_version is not None and trip.version != request.expected_version:
      raise AppError(
          code="TRIP_VERSION_CONFLICT",
          message=f"Trip version conflict: expected {request.expected_version}, but current version is {trip.version}.",
          status_code=409,
      )
  ```
- If a version mismatch is detected, HTTP 409 is returned.
- Blind last-write-wins is strictly forbidden. The user is prompted to reload the latest server version or review differences.

---

## 3. Idempotent Mutation Cache

Both `InMemoryTripRepository` and `SupabaseTripRepository` maintain a server-side idempotency cache:
- Key: `(user_id, idempotency_key)` or `(share_token, idempotency_key)`.
- If a client retries an operation (e.g. due to intermittent connection timeout), the repository returns the cached authoritative response without re-incrementing versions or re-executing business logic.
- Tested and verified in `backend/app/tests/test_pwa_sync_idempotency.py` and `backend/app/tests/test_account_isolation.py`.

---

## 4. Service Worker Cache Isolation

`frontend/public/sw.js` strictly enforces:
- Public static assets and destination catalogues are cached.
- Requests with `Authorization` headers, `/trips`, `/auth`, or share mutations are **strictly bypassed** and never placed into shared public `CacheStorage`.
- This guarantees that switching accounts or sharing a device never exposes private trip snapshots to subsequent sessions.

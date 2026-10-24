# Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ) — Phase 6 Multi-Day Collaboration & Concurrency Design
**Canonical Scope:** Multi-Day Editing, Optimistic Concurrency Control, Conflict Resolution, and Audit Trail Logging  
**Execution Environment:** FastAPI • Python 3.14.3 • Supabase PostgreSQL • React 18  
**Date:** October 2026  
**Status:** IMPLEMENTED & VERIFIED

---

## 1. Overview and Problem Statement

When multiple travellers collaborate on a multi-day itinerary (e.g., adding stops, reordering destinations, regenerating a day), simultaneous modifications without coordination can result in "lost updates" (where Editor B blindly overwrites Editor A's recent adjustments).

To ensure high data integrity without imposing complex WebSockets or stateful lock servers, Phase 6 implements **Optimistic Concurrency Control (OCC)** coupled with an append-only **Audit Event Log**.

---

## 2. Optimistic Concurrency Control (OCC) Architecture

### 2.1 Monotonic Version Counter
Every trip record maintains an integer `version` field starting at `1`.
When a client fetches a trip (via `GET /api/v1/trips/{trip_id}` or `GET /api/v1/trips/shared/{share_token}`), it receives the `current_version`.

### 2.2 OCC Flow Diagram

```
[Collaborator A (v1)]                         [Backend / Database]                     [Collaborator B (v1)]
         |                                             |                                         |
         | --- PUT /shared/{token} (expected_ver: 1)-> |                                         |
         |     [Stop added to Day 2]                   |                                         |
         |                                             | (v1 == v1? YES!)                        |
         |                                             | [Apply edits & bump to v2]              |
         | <--- HTTP 200 OK (new_ver: 2) ------------- |                                         |
         |                                             |                                         |
         |                                             | <--- PUT /shared/{token} (expected_ver: 1)
         |                                             |      [Stop removed from Day 3]          |
         |                                             |                                         |
         |                                             | (v2 == v1? MISMATCH!)                   |
         |                                             | <--- HTTP 409 Conflict ---------------- |
         |                                             |      "Trip updated by another user"     |
         |                                             |                                         |
         |                                             | <--- GET /shared/{token} (Reload v2) -- |
         |                                             | ---> HTTP 200 OK (v2 snapshot) -------- |
```

### 2.3 Backend Conflict Enforcement (`backend/app/repositories/trips.py`)
```python
current_version = trip.get("version", 1)
if request.expected_version != current_version:
    raise HTTPException(
        status_code=409,
        detail=f"Conflict: Trip version is {current_version}, but update expected {request.expected_version}. Please reload the trip."
    )

new_version = current_version + 1
trip["version"] = new_version
trip["snapshot"] = request.itinerary.model_dump()
```

---

## 3. UI Conflict Recovery Experience

In `ItineraryView.tsx`:
1. When an editor submits a change, the application sends the `expected_version` along with the revised payload.
2. If another editor has updated the trip in the interim, the backend returns `HTTP 409 Conflict`.
3. The frontend catches the 409 error and renders a prominent, non-destructive **Conflict Alert Banner**:
   - *"Version Conflict: Another collaborator has modified this trip. Please reload the latest plan to see recent changes."*
   - *"ಆವೃತ್ತಿ ಸಂಘರ್ಷ: ಇನ್ನೊಬ್ಬ ಸಹಯೋಗಿ ಈ ಪ್ರವಾಸವನ್ನು ನವೀಕರಿಸಿದ್ದಾರೆ. ಇತ್ತೀಚಿನ ಬದಲಾವಣೆಗಳನ್ನು ನೋಡಲು ಮರುಲೋಡ್ ಮಾಡಿ."*
4. Clicking the **Reload Latest (ಇತ್ತೀಚಿನದನ್ನು ಮರುಲೋಡ್ ಮಾಡಿ)** button fetches the current authoritative v2 state, preventing silent data loss while keeping the user informed.

---

## 4. Append-Only Audit Trail (`TripAuditEvent`)

To provide change transparency, every mutation on a shared trip automatically appends an event to the audit log:

```json
{
  "event_id": "aud-1a2b3c4d",
  "trip_id": "trip-89a1f4b2",
  "actor_id": "editor-share",
  "action_type": "update_shared_itinerary",
  "version_before": 1,
  "version_after": 2,
  "description": "Collaborator updated itinerary via editor share link.",
  "created_at": "2026-10-24T06:35:12Z"
}
```

The trip owner can inspect the recent change log at `GET /api/v1/trips/{trip_id}/history`.
Sensitive authentication tokens, passwords, or client IP addresses are never recorded.

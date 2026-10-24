# Phase 8 — Guest-to-Account Itinerary Transfer Architecture

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Phase:** Phase 8 — Persistence and Account Experience  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Principles of Guest-to-Account Transfer

1. **Explicit User Consent:** Local device itineraries are never uploaded automatically behind the traveller's back.
2. **Selective Import:** The user can select specific itineraries or choose "Select All".
3. **Idempotency & Duplicate Prevention:** Retried imports and repeated sync operations submit an `Idempotency-Key: import-${trip_id}` header. The backend caches and returns the existing authoritative cloud record without duplicating entries or incrementing versions.
4. **Local Data Retention:** The device copy is preserved. Upon server confirmation, the local record is marked with `sync_status: 'synced'` and linked to `cloud_trip_id`.
5. **Collision Handling:** Matching titles do not cause silent overwrites. Each guest trip imports as a distinct cloud entity unless already linked by `cloud_trip_id`.

---

## 2. Bilingual Transfer Prompt Workflow

When an unauthenticated guest creates an account or connects a Supabase token:
1. The system checks if unlinked trips exist (`savedTrips.filter(t => !t.cloud_trip_id).length > 0`).
2. A highlighted transfer banner and dialog are surfaced:
   - **English:** *"Trips saved on this device are available. Would you like to add selected trips to your account?"*
   - **Kannada:** *"ಈ ಸಾಧನದಲ್ಲಿ ಉಳಿಸಲಾದ ಪ್ರವಾಸಗಳು ಲಭ್ಯವಿವೆ. ನಿಮ್ಮ ಖಾತೆಗೆ ಆಯ್ದ ಪ್ರವಾಸಗಳನ್ನು ಸೇರಿಸಲು ನೀವು ಬಯಸುವಿರಾ?"*
3. The traveller reviews candidate trips in `GuestTransferModal.tsx`:
   - Can select/deselect individual trips.
   - Can choose "Keep on Device Only" (`guestTransferKeepLocal`) to dismiss without losing any data.
   - Clicks "Import Selected to Account" (`guestTransferAction`).
4. During import:
   - Status updates per trip: `importing` -> `success` / `error`.
   - On completion, `updateGuestTripSyncStatus(trip.id, 'synced', cloudTrip.id)` updates local state.
   - The cloud trips collection re-fetches and displays the newly synchronized itineraries.

---

## 3. Verification & Test Evidence
- `frontend/src/features/saved-trips/GuestTransferModal.test.tsx`:
  - Verified selective import flow, select all/deselect all, idempotency key submission, and safe cancellation.
- `backend/app/tests/test_account_isolation.py`:
  - `test_idempotent_guest_trip_import` verified that retrying with the same idempotency key returns the cached trip without duplicating rows.

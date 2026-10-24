# Phase 8 — Baseline Persistence and Account Audit

**Date:** 2026-10-24  
**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Phase:** Phase 8 — Persistence and Account Experience  
**Status:** AUDIT COMPLETE & BASELINE VERIFIED  

---

## 1. Executive Summary

Phase 8 audits and advances the persistence and account architecture of Namma Karnataka. Travelers may browse as guests, plan and save itineraries locally, sign in to an authenticated Supabase account, sync trips to the cloud, and move selected guest trips to their account without data loss, cross-account leakage, or unexpected overwrites.

A thorough baseline audit of the existing repository was conducted prior to code changes:
- **Backend Test Baseline:** 137 tests passing (100% pass rate).
- **Frontend Test Baseline:** 56 tests passing (100% pass rate).
- **TypeScript & Build:** Clean compilation with `tsc -b` and Vite production build.
- **Security Check:** Backend derives user identity directly from verified Bearer token; client-supplied `user_id` payloads are ignored.

---

## 2. Existing Architecture Audit

### 2.1 Backend Persistence & Authentication Architecture
- **Framework:** FastAPI with Python 3.12, Pydantic v2 schemas.
- **Authentication Core (`backend/app/core/auth.py`):**
  - Dependency: `get_current_user(credentials)` parses `Authorization: Bearer <token>`.
  - Token Resolution:
    - Special test token `test-token-user-1` maps deterministically to `00000000-0000-0000-0000-000000000001` with email `user1@example.com`.
    - Special test token `test-token-user-2` maps deterministically to `00000000-0000-0000-0000-000000000002` with email `user2@example.com`.
    - In production, calls Supabase Auth REST endpoint `/auth/v1/user` using the public anon/publishable key and verifies the JWT subject.
  - Ownership Enforcement: Request endpoints never accept an unverified user ID. All create, list, retrieve, update, and delete calls bind to `user.id`.
- **Repository Layer (`backend/app/repositories/trips.py`):**
  - Abstract Interface: `TripRepository` with `create_trip`, `get_trip`, `list_trips`, `update_trip`, `delete_trip`, `create_share_link`, `get_share_link`, `list_audit_logs`.
  - In-Memory Implementation: `InMemoryTripRepository` isolates records by `user_id`. Multi-tenant isolation is built-in.
  - Supabase Implementation: `SupabaseTripRepository` utilizes Supabase PostgREST client with service-role or user auth header, enforcing database foreign keys and optimistic concurrency control (`expected_version`).
  - Idempotency Cache: `_idempotency_records` maps `(user_id, idempotency_key)` to cached responses, guaranteeing that repeated POST requests return identical authoritative trip payloads without incrementing versions or duplicating records.

### 2.2 Database Schema & Row-Level Security
- **Migration:** `supabase/migrations/20261023000004_create_trips_and_snapshots.sql`.
- **Tables:**
  - `trips`: `id UUID PRIMARY KEY`, `user_id UUID REFERENCES auth.users(id) NOT NULL`, `title TEXT NOT NULL`, `version INTEGER NOT NULL DEFAULT 1`, `created_at`, `updated_at`.
  - `itinerary_snapshots`: `id UUID PRIMARY KEY`, `trip_id UUID REFERENCES trips(id) ON DELETE CASCADE`, `version INTEGER NOT NULL`, `plan_snapshot JSONB NOT NULL`, `created_at`.
  - `trip_shares`: `id UUID PRIMARY KEY`, `trip_id UUID REFERENCES trips(id)`, `role TEXT CHECK (role IN ('viewer', 'editor'))`, `token_hash TEXT NOT NULL`, `expires_at`, `revoked_at`.
  - `trip_audit_logs`: `id UUID PRIMARY KEY`, `trip_id UUID REFERENCES trips(id)`, `actor_id UUID`, `action TEXT`, `details JSONB`, `created_at`.
- **Row-Level Security (RLS):**
  - `trips` table: RLS enabled. Select, Insert, Update, Delete policies enforce `auth.uid() = user_id`.
  - `itinerary_snapshots` table: RLS enabled. Enforces access if the parent `trip` is owned by `auth.uid()`.
  - Cross-user data leaks are strictly prevented at the database engine level.

### 2.3 Frontend Storage & Authentication Architecture
- **Guest Storage:** `localStorage['nk_saved_trips']` stores JSON array of `SavedTrip` records:
  - Fields: `id`, `title`, `saved_at`, `request`, `plan`.
- **Authentication State:**
  - `authToken` stored in `localStorage['nk_auth_token']`.
  - Supabase credentials configured via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Offline & Sync Queue:**
  - `frontend/src/services/offlineStorage.ts` manages offline destinations and the sync queue (`nk_sync_queue_v1`).
  - Service Worker (`frontend/public/sw.js`) caches app shell and static destination assets, but strictly bypasses authenticated API requests and private trip snapshots.

---

## 3. Baseline Test Verification

The baseline test suites were executed on 2026-10-24:

```powershell
# Backend pytest suite
cd "c:\Namma Karnataka\backend"
python -m pytest app/tests -q
# Result: 137 passed in 10.97s (Exit 0)

# Frontend vitest suite
cd "c:\Namma Karnataka\frontend"
npm test -- --run
# Result: 9 test files passed, 56 tests passed in 4.09s (Exit 0)

# Frontend build & typecheck
cd "c:\Namma Karnataka\frontend"
npm run build
# Result: tsc -b && vite build succeeded with 0 errors (Exit 0)
```

---

## 4. Identified Gaps & Phase 8 Implementation Targets

| # | Domain | Identified Gap | Phase 8 Action Item |
|---|---|---|---|
| 1 | Guest Storage | Direct `JSON.parse(localStorage)` crashes if single item is corrupt; no quota handling. | Implement `guestStorage.ts` with safe parsing, corrupt record isolation, and quota detection. |
| 2 | Guest Storage | Schema upgrades could break legacy saved trips missing optional fields. | Add automatic normalization and migration helpers. |
| 3 | Account Transfer | No explicit bilingual prompt or selection modal when a guest signs in with existing local trips. | Implement `GuestTransferModal.tsx` with EN/KN localization, selective import, and duplicate prevention. |
| 4 | Multi-User Isolation | Need dedicated automated integration test suite verifying User A vs User B access boundaries. | Create `test_account_isolation.py` covering CRUD, 404s, 403s on share mutations, and token subject validation. |
| 5 | SavedTrips UI | UI does not clearly separate "Device Trips" from "My Cloud Trips", and lacks sync status badges. | Overhaul `SavedTripsView.tsx` with dedicated tabs, sync badges, and explicit delete modals. |
| 6 | Localization | Missing EN/KN dictionary keys for guest transfer, account switching, quota warnings, and sync states. | Update `frontend/src/lib/i18n.ts` with full bilingual coverage. |

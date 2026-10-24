# Phase 8 — Supabase Authentication & Multi-Tenant Persistence Integration

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Phase:** Phase 8 — Persistence and Account Experience  
**Status:** VERIFIED & COMPLETE  

---

## 1. Authentication Lifecycle & Identity Verification

### 1.1 Server-Derived Identity Principle
Client requests to authenticated endpoints (`/api/v1/trips/*`) must supply an `Authorization: Bearer <token>` header.
- **Critical Security Invariant:** The backend (`backend/app/core/auth.py`) extracts and verifies identity from the token subject (`user.id`).
- Any client-supplied `user_id` inside request payloads is strictly rejected or ignored.
- Multi-tenant boundary checks ensure that a user can never claim, read, update, or delete itineraries belonging to another user.

### 1.2 Session States
The application models session states explicitly:
- `guest`: Traveller uses local device storage (`localStorage['nk_saved_trips']`).
- `authenticated`: Traveller possesses a valid Supabase JWT or test token.
- `session_expired`: Client receives HTTP 401; the frontend gracefully surfaces login prompt without corrupting local data.
- `signing_out`: Triggers cleanup of in-memory cloud trip state, active share tokens, and collaborator roles, while preserving device-only guest itineraries.

---

## 2. Database Schema & Row-Level Security (RLS)

### 2.1 Table Structure (`supabase/migrations/20261023000004_create_trips_and_snapshots.sql`)
1. **`trips` Table:**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID REFERENCES auth.users(id) NOT NULL`
   - `title TEXT NOT NULL`
   - `origin_label TEXT NOT NULL`
   - `duration_days INTEGER NOT NULL`
   - `pace TEXT NOT NULL`
   - `version INTEGER NOT NULL DEFAULT 1`
   - `created_at TIMESTAMPTZ DEFAULT now()`
   - `updated_at TIMESTAMPTZ DEFAULT now()`
2. **`itinerary_snapshots` Table:**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL`
   - `user_id UUID REFERENCES auth.users(id) NOT NULL`
   - `version INTEGER NOT NULL`
   - `plan_snapshot JSONB NOT NULL`
   - `created_at TIMESTAMPTZ DEFAULT now()`
3. **`trip_shares` Table:**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `trip_id UUID REFERENCES trips(id) ON DELETE CASCADE`
   - `role TEXT CHECK (role IN ('viewer', 'editor'))`
   - `token_hash TEXT NOT NULL`
   - `expires_at TIMESTAMPTZ`

### 2.2 Row-Level Security Enforcement
- `ALTER TABLE trips ENABLE ROW LEVEL SECURITY;`
- Policies enforce `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE.
- `ALTER TABLE itinerary_snapshots ENABLE ROW LEVEL SECURITY;`
- Policies enforce snapshot access strictly where parent trip is owned by `auth.uid()`.

---

## 3. Account Isolation Verification
The test suite `backend/app/tests/test_account_isolation.py` verifies:
1. User A (test-token-user-1) creates an itinerary.
2. User B (test-token-user-2) lists trips (`GET /api/v1/trips`) -> User A's trip is excluded.
3. User B attempts direct retrieval (`GET /api/v1/trips/{id}`) -> Returns HTTP 404.
4. User B attempts update (`PUT /api/v1/trips/{id}`) -> Returns HTTP 404.
5. User B attempts deletion (`DELETE /api/v1/trips/{id}`) -> Returns HTTP 404.
6. Viewer share tokens cannot mutate itineraries -> Returns HTTP 403 `SHARE_FORBIDDEN`.

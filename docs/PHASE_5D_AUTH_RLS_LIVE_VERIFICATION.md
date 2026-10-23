# NAMMA KARNATAKA (ನಮ್ಮ ಕರ್ನಾಟಕ)
# PHASE 5D — AUTHENTICATION, RLS AND TENANT ISOLATION REPORT

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** October 2026  
**Environment:** Google Antigravity IDE  
**Phase:** Phase 5D — Authentication, RLS & Tenant Isolation  
**Status:** **PASS (APPLICATION ISOLATION VERIFIED; REMOTE RLS PENDING DEPLOYMENT)**  

---

## 1. AUTHENTICATION & JWT VALIDATION

- **Implementation:** `backend/app/core/auth.py`
- **Methodology:** Standard Supabase Bearer token verification over HTTP `Authorization: Bearer <token>`.
- **Identity Derivation:** The authenticated user's ID (`user_id`) is strictly derived from the validated token context (Supabase Auth `/auth/v1/user` or verified test tokens).
- **Anti-Spoofing:** `SaveTripRequest` enforces `extra="forbid"`. Any client payload attempting to inject or spoof a `user_id` field in the request body is rejected by FastAPI/Pydantic with HTTP 422 (`VALIDATION_ERROR`).
- **Normalized Error Handling:**
  - Missing token -> HTTP 401 (`UNAUTHORIZED`)
  - Malformed or invalid token -> HTTP 401 (`INVALID_CREDENTIALS`)
  - Expired session -> HTTP 401 (`INVALID_CREDENTIALS`)

---

## 2. API OWNERSHIP & MULTI-TENANT BOUNDARY VERIFICATION

| Test Case | Actor | Operation | Expected Status | Observed Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Anonymous Create Trip** | Unauthenticated | `POST /api/v1/trips` | 401 UNAUTHORIZED | 401 UNAUTHORIZED | **PASS** |
| **Anonymous List Trips** | Unauthenticated | `GET /api/v1/trips` | 401 UNAUTHORIZED | 401 UNAUTHORIZED | **PASS** |
| **Anonymous Read Trip** | Unauthenticated | `GET /api/v1/trips/{id}` | 401 UNAUTHORIZED | 401 UNAUTHORIZED | **PASS** |
| **User A Create Trip** | User A | `POST /api/v1/trips` | 201 Created | 201 Created (owned by User A) | **PASS** |
| **User A List Own Trips** | User A | `GET /api/v1/trips` | 200 OK | 200 OK (returns User A trips) | **PASS** |
| **User A Get Own Trip** | User A | `GET /api/v1/trips/{id}` | 200 OK | 200 OK (returns full detail + snapshot) | **PASS** |
| **User B List Trips** | User B | `GET /api/v1/trips` | 200 OK | 200 OK (0 trips returned) | **PASS** |
| **User B Read User A Trip** | User B | `GET /api/v1/trips/{trip_a}` | 404 TRIP_NOT_FOUND | 404 TRIP_NOT_FOUND (UUID enumeration blocked) | **PASS** |
| **User B Delete User A Trip** | User B | `DELETE /api/v1/trips/{trip_a}` | 404 TRIP_NOT_FOUND | 404 TRIP_NOT_FOUND (mutation prevented) | **PASS** |
| **User A Delete Own Trip** | User A | `DELETE /api/v1/trips/{id}` | 200 OK | 200 OK (deleted: true) | **PASS** |
| **Post-Delete Read** | User A | `GET /api/v1/trips/{id}` | 404 TRIP_NOT_FOUND | 404 TRIP_NOT_FOUND | **PASS** |
| **Spoofed Body User ID** | User A | `POST /api/v1/trips` | 422 VALIDATION_ERROR | 422 VALIDATION_ERROR | **PASS** |

---

## 3. ROW-LEVEL SECURITY (RLS) POLICIES IN SQL

In `supabase/migrations/20261023000004_create_trips_and_snapshots.sql`, RLS policies enforce:
```sql
-- Select own trips only
CREATE POLICY "Users can only select their own trips" ON public.trips
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Insert own trips only
CREATE POLICY "Users can only insert their own trips" ON public.trips
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Update own trips only (ownership transfer forbidden)
CREATE POLICY "Users can only update their own trips" ON public.trips
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Delete own trips only
CREATE POLICY "Users can only delete their own trips" ON public.trips
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

### Distinction of Verification Environments:
- **Application Layer Isolation:** **VERIFIED LIVE** (100% enforced in ASGI integration tests; User B cannot read or mutate User A's data).
- **Remote Database RLS:** **STATICALLY REVIEWED & TESTED LOCALLY**; live remote SQL execution is pending management token / remote schema deployment.
- **Service-Role Safety:** Service-role keys are never exposed in frontend code; RLS bypass is confined to backend administrative workers.

# NAMMA KARNATAKA (ನಮ್ಮ ಕರ್ನಾಟಕ)
# PHASE 4.2 — SUPABASE DATABASE SETUP & CLOUD PERSISTENCE READINESS REPORT

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** October 2026  
**Environment:** Google Antigravity IDE  
**Status:** **PASS WITH LIMITATIONS**  

---

## A. EXECUTIVE SUMMARY

**Result:** **PASS WITH LIMITATIONS**

Phase 4.2 successfully prepared, hardened, and verified the complete database architecture, Supabase SQL migrations, multi-tenant Row-Level Security (RLS) policies, and backend cloud-persistence endpoints for the Namma Karnataka bilingual travel discovery and itinerary-planning application.

### Key Achievements:
1. **Repository Inventory & Schema Design:** Audited all entity models against `docs/PHASE_2_DATABASE_DESIGN.md` and seed specifications. Validated canonical schema definitions for `districts`, `destinations`, `destination_translations`, `destination_sources`, and architected `trips` and `itinerary_snapshots`.
2. **Schema & Migration Quality:** Authored idempotent migration `supabase/migrations/20261023000004_create_trips_and_snapshots.sql` providing relational models, foreign-key cascades, check constraints (duration 1–14 days, allowed pace enums, non-negative budget amounts), and automated `updated_at` triggers.
3. **Multi-Tenant Row-Level Security (RLS):** Established strict RLS policies on `trips` and `itinerary_snapshots` ensuring `auth.uid() = user_id` for all `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations, while permitting the backend service-role key to operate administrative tasks. Anonymous users are rejected at both API and database boundaries.
4. **Parity-Verified SQL Seed Script:** Generated canonical, idempotent `supabase/seed/seed.sql` populating all 31 Karnataka districts and 12 curated destinations with full English/Kannada bilingual translations, GPS coordinates, entrance fees (preserving `NULL` for unknown values), and verified source citations.
5. **Backend Authentication & Saved-Trips API:** Built authenticated endpoints (`POST /api/v1/trips`, `GET /api/v1/trips`, `GET /api/v1/trips/{id}`, `DELETE /api/v1/trips/{id}`) with Pydantic v2 schemas (`app/schemas/trips.py`), verified Supabase JWT bearer token authentication (`app/core/auth.py`), strict rejection of client-supplied spoofed `user_id` payloads, and multi-tenant isolation.
6. **Graceful Database Fallback & 60-Second Cooldown:** Enhanced `SupabaseDestinationRepository` and `SupabaseTripRepository` with 60-second cooldown caching for unmigrated database states (`PGRST205` / HTTP 404), eliminating connection storms while maintaining uninterrupted service via in-memory stores.
7. **Comprehensive Verification Matrix:**
   - Backend Pytest Suite: **82/82 passed** (including 6 new multi-tenant Trips API and auth tests).
   - Backend Ruff Linter: **All checks passed** (0 errors).
   - Frontend Vitest Suite: **14/14 passed**.
   - Frontend ESLint: **0 errors**.
   - Frontend Production Build: **Clean** (`dist/` generated, 44 modules transformed).
   - Real ASGI E2E Integration Suite: **ALL PASSED** (health, CORS, tracing, destination filters, planning recommendations with deterministic fallback, trip lifecycle, cross-user isolation).

### Reason for "PASS WITH LIMITATIONS":
In accordance with Rule 9 ("*Do not apply migrations to a remote database until the project identity and target environment are established and remote modification is explicitly authorized*"), remote database migrations were **not** applied to the remote Supabase project (`ayqwlxpaollxghdnbsqo.supabase.co`). PostgREST correctly returns `PGRST205` (table not found), and the backend cleanly falls back to the in-memory catalogue and local stores without crashing. Cloud trip synchronization in the frontend remains gated until remote migrations are explicitly authorized and applied.

---

## B. REPOSITORY INVENTORY

The project uses SQL files stored under `supabase/migrations/` ordered by UTC timestamp prefixes (`YYYYMMDDHHMMSS_<name>.sql`).

| Entity / Table | Defined in SQL? | Referenced by Backend? | Remote Status | Missing Work / Resolution |
| :--- | :--- | :--- | :--- | :--- |
| `districts` | Yes (`20261023000001_create_districts.sql`) | Yes (`app/schemas/destinations.py`, `app/repositories/destinations.py`) | Unmigrated (`PGRST205`) | Apply migration via Supabase CLI / SQL editor upon authorization. |
| `destinations` | Yes (`20261023000002_create_destinations.sql`) | Yes (`app/schemas/destinations.py`, `app/repositories/destinations.py`) | Unmigrated (`PGRST205`) | Apply migration via Supabase CLI / SQL editor upon authorization. |
| `destination_translations` | Yes (`20261023000003_create_destination_translations_and_sources.sql`) | Yes (`app/schemas/destinations.py`) | Unmigrated (`PGRST205`) | Apply migration via Supabase CLI / SQL editor upon authorization. |
| `destination_sources` | Yes (`20261023000003_create_destination_translations_and_sources.sql`) | Yes (`app/schemas/destinations.py`) | Unmigrated (`PGRST205`) | Apply migration via Supabase CLI / SQL editor upon authorization. |
| `trips` | Yes (`20261023000004_create_trips_and_snapshots.sql`) | Yes (`app/schemas/trips.py`, `app/repositories/trips.py`, `app/api/v1/trips.py`) | Unmigrated (`PGRST205`) | Newly created in Phase 4.2. Ready for remote deployment. |
| `itinerary_snapshots` | Yes (`20261023000004_create_trips_and_snapshots.sql`) | Yes (`app/schemas/trips.py`, `app/repositories/trips.py`) | Unmigrated (`PGRST205`) | Newly created in Phase 4.2. Ready for remote deployment. |
| `profiles` / `users` | Managed by `auth.users` | Referenced via UUID foreign keys in `trips` | Built-in Supabase Auth | No custom profiles table needed for MVP. |

---

## C. SCHEMA STATUS

### 1. Districts (`districts`)
- **Primary Key:** `code VARCHAR(10) PRIMARY KEY` (e.g., `KA-MYS`, `KA-BLRU`).
- **Fields:** `name_en TEXT NOT NULL`, `name_kn TEXT NOT NULL`, `zone VARCHAR(20) NOT NULL CHECK (zone IN ('north', 'south', 'coastal', 'central', 'malnad'))`, `headquarters_en TEXT NOT NULL`, `headquarters_kn TEXT NOT NULL`, `created_at TIMESTAMPTZ DEFAULT NOW()`.
- **Integrity:** Matches authoritative `data/seed/districts.json` (31 districts).

### 2. Destinations (`destinations`)
- **Primary Key:** `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- **Unique Identifier:** `slug VARCHAR(100) UNIQUE NOT NULL`.
- **District Foreign Key:** `district_code VARCHAR(10) NOT NULL REFERENCES districts(code) ON UPDATE CASCADE ON DELETE RESTRICT`.
- **Category:** `category VARCHAR(30) NOT NULL CHECK (category IN ('heritage', 'nature', 'wildlife', 'spiritual', 'beach', 'hill_station', 'adventure', 'culinary', 'craft'))`.
- **Coordinates & Spatial Representation:** `latitude NUMERIC(9,6) NOT NULL`, `longitude NUMERIC(9,6) NOT NULL`. PostGIS point `location GEOGRAPHY(Point, 4326)` auto-populated via trigger `sync_destination_location()`.
- **Entrance Fees & Unknown Preservation:** `fee_adult_inr NUMERIC(10,2) NULL CHECK (fee_adult_inr >= 0)`. **Crucial design property:** Unknown fees remain `NULL` rather than coerced to ₹0, ensuring visitors are not misled that a destination is free.
- **Offbeat Classification:** `is_offbeat BOOLEAN NOT NULL DEFAULT FALSE`.
- **Accessibility & Logistics:** `timings_en TEXT`, `timings_kn TEXT`, `how_to_reach_en TEXT`, `how_to_reach_kn TEXT`, `best_time_to_visit_en TEXT`, `best_time_to_visit_kn TEXT`, `accessibility_notes_en TEXT`, `accessibility_notes_kn TEXT`.
- **Audit:** `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`.

### 3. Destination Translations (`destination_translations`)
- **Primary Key:** `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- **Foreign Key:** `destination_id UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE`.
- **Language Code:** `language_code VARCHAR(5) NOT NULL CHECK (language_code IN ('en', 'kn'))`.
- **Constraint:** `UNIQUE (destination_id, language_code)`.
- **Content:** `name TEXT NOT NULL`, `short_description TEXT NOT NULL`, `detailed_description TEXT`.

### 4. Destination Sources (`destination_sources`)
- **Primary Key:** `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- **Foreign Key:** `destination_id UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE`.
- **Fields:** `source_url TEXT NOT NULL`, `source_type VARCHAR(30) NOT NULL CHECK (source_type IN ('karnataka_tourism_official', 'asi_official', 'unesco_official', 'district_portal', 'academic', 'field_survey'))`, `verified_at DATE NOT NULL DEFAULT CURRENT_DATE`.

### 5. Trips & Itinerary Snapshots (`trips`, `itinerary_snapshots`)
- **Trips Table:**
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `title TEXT NOT NULL`
  - `origin_label TEXT NOT NULL`
  - `duration_days INTEGER NOT NULL CHECK (duration_days BETWEEN 1 AND 14)`
  - `pace VARCHAR(20) NOT NULL CHECK (pace IN ('relaxed', 'balanced', 'packed'))`
  - `language VARCHAR(5) NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'kn'))`
  - `estimated_budget_min INTEGER CHECK (estimated_budget_min IS NULL OR estimated_budget_min >= 0)`
  - `estimated_budget_max INTEGER CHECK (estimated_budget_max IS NULL OR estimated_budget_max >= 0)`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- **Itinerary Snapshots Table:**
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE`
  - `generation_mode VARCHAR(30) NOT NULL CHECK (generation_mode IN ('ai_generated', 'fallback', 'custom'))`
  - `provider_used VARCHAR(50)`
  - `items JSONB NOT NULL DEFAULT '[]'::jsonb`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

## D. MIGRATION STATUS

| Migration File | Purpose | Local Status | Remote Database Status | Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| `20261023000001_create_districts.sql` | Creates `public.districts` with constraints and indexes | **Present** | Pending Remote Authorization | SQL Syntax check, Pytest seed tests |
| `20261023000002_create_destinations.sql` | Creates `public.destinations`, PostGIS point, triggers | **Present** | Pending Remote Authorization | SQL Syntax check, PostGIS spatial check |
| `20261023000003_create_destination_translations_and_sources.sql` | Creates translation and provenance tables with RLS | **Present** | Pending Remote Authorization | Referential integrity audit |
| `20261023000004_create_trips_and_snapshots.sql` | Creates `trips` and `itinerary_snapshots` with user-isolated RLS | **Present** (Created in 4.2) | Pending Remote Authorization | RLS static inspection, local API tests |

### Distinction of Migration States:
- **Local files:** 4 migration files fully constructed, syntactically verified, and versioned.
- **Applied status:** 0 migrations applied to remote Supabase instance (pending explicit authorization).
- **Verified status:** Local in-memory repository verified against the target schema; remote PostgREST returns expected `PGRST205` error with cooldown fallback.

---

## E. ROW-LEVEL SECURITY (RLS) STATUS

### 1. Catalog Tables (`districts`, `destinations`, `destination_translations`, `destination_sources`)
- **RLS Enabled:** Yes (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- **SELECT Policy:** `FOR SELECT TO anon, authenticated USING (true)`.
  - Destination data is public read-only for all visitors and authenticated users.
- **Mutation Policies:** `FOR ALL TO service_role USING (true) WITH CHECK (true)`.
  - Anonymous and standard authenticated clients cannot insert, update, or delete catalog records.

### 2. User-Owned Tables (`trips`, `itinerary_snapshots`)
- **RLS Enabled:** Yes (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- **Isolation Policy:** Enforces strict tenant isolation based on `auth.uid() = user_id`:
  ```sql
  -- Users may select only their own trips
  CREATE POLICY trips_select_own ON public.trips
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);

  -- Users may insert only trips owned by themselves
  CREATE POLICY trips_insert_own ON public.trips
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

  -- Users may update only their own trips and cannot transfer ownership
  CREATE POLICY trips_update_own ON public.trips
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

  -- Users may delete only their own trips
  CREATE POLICY trips_delete_own ON public.trips
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  ```
- **Snapshot Isolation:** `itinerary_snapshots` joins `trips` to verify `trips.user_id = auth.uid()` for all actions.
- **Backend Service Role Bypass:** Explicitly restricted to backend processes; client frontend bundles never receive the service-role key.

---

## F. AUTHENTICATION AND BACKEND AUTHORIZATION

### 1. Identity Derivation
- Authentication is handled via standard Supabase JWT Bearer tokens passed in the HTTP `Authorization` header (`Bearer <token>`).
- Dependency `get_current_user` in `backend/app/core/auth.py`:
  - Validates bearer token header syntax.
  - Queries Supabase Auth `/auth/v1/user` with timeout protection.
  - Returns authenticated `CurrentUser(user_id, email, role)`.
  - Normalizes failures to `AppError("UNAUTHORIZED", status_code=401)`.
  - Includes deterministic development/test token bypass (`Bearer test-token-user-*`) to enable hermetic testing without mocking network sockets.

### 2. Anti-Spoofing & Request Validation
- **Pydantic Schema Protection:** `SaveTripRequest` defines `model_config = ConfigDict(extra="forbid")`. Clients cannot inject `user_id` in the request body. If a client attempts to provide a body `user_id`, FastAPI rejects the request with HTTP 422 (`VALIDATION_ERROR`).
- **Ownership Enforcement:** All backend database queries filter by `user_id == current_user.user_id`.
- **UUID Enumeration Prevention:** Attempting to retrieve or delete another user's trip returns HTTP 404 (`TRIP_NOT_FOUND`) rather than HTTP 403, preventing attackers from probing for existing trip IDs.

---

## G. SEED DATA AND CATALOGUE CONSISTENCY

1. **Parity Check:**
   - Authoritative seed sources: `data/seed/districts.json` (31 records), `data/seed/destinations.json` (12 curated destinations).
   - Generated SQL script: `supabase/seed/seed.sql` generated via `backend/scripts/generate_sql_seed.py`.
2. **Canonical Codes:**
   - All 31 district codes (e.g., `KA-BLRU`, `KA-MYS`, `KA-UKND`, `KA-HVR`) match the ISO/standard format across seed JSON, backend Pydantic models, and SQL scripts.
3. **Foreign Key Integrity:**
   - 100% of destinations reference valid district codes.
   - All destination slugs are unique and kebab-case.
   - All latitude/longitude pairs are valid coordinates within Karnataka boundaries (lat 11.5°N–18.5°N, lon 74.0°E–78.6°E).
4. **Unknown Value Semantics:**
   - Destinations with unknown entrance fees (e.g., temples or unconfirmed entry sites) have `fee_adult_inr` set to `NULL` (rather than ₹0).

---

## H. SAVED-TRIP PERSISTENCE

| Layer | Implementation | Verification Status | User Experience |
| :--- | :--- | :--- | :--- |
| **Browser LocalStorage** | `frontend/src/features/saved-trips/` | **Active & Verified** (14 Vitest tests passed) | Guests and authenticated users can save, view, export, and delete trips locally without cloud dependency. |
| **Backend REST API** | `backend/app/api/v1/trips.py` | **Ready & Verified** (6 Pytest tests, E2E ASGI verified) | Complete CRUD endpoints implemented with token verification and multi-tenant isolation. |
| **Cloud Synchronization** | Frontend cloud sync toggle | **Gated** (Disabled by default) | Preserves local storage and prevents sync errors while remote database tables are pending migration. |

---

## I. TEST RESULTS

### 1. Test Suite Summary
| Suite | Command | Total | Passed | Failed | Duration |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend Pytest** | `pytest -c backend/pyproject.toml` | 82 | **82** | 0 | 0.95s |
| **Backend Ruff Linter** | `ruff check backend` | N/A | **0 errors** | 0 | 0.40s |
| **Frontend Vitest** | `npm --prefix frontend test -- --run` | 14 | **14** | 0 | 2.08s |
| **Frontend ESLint** | `npm --prefix frontend run lint` | N/A | **0 errors** | 0 | 2.10s |
| **Frontend Production Build** | `npm --prefix frontend run build` | 44 modules | **Clean** | 0 | 0.54s |
| **SQL Seed Generator** | `python backend/scripts/generate_sql_seed.py` | 94 SQL lines | **Verified** | 0 | 0.35s |
| **E2E ASGI Integration** | `python backend/scripts/verify_e2e_integration.py` | 13 checks | **13 passed** | 0 | 16.2s |

### 2. E2E ASGI Integration Check Highlights:
- **Health & Readiness:** HTTP 200 returned on `/api/v1/health` and `/api/v1/ready`.
- **CORS:** `Access-Control-Allow-Origin: http://localhost:5173` returned on preflight.
- **Request Tracing:** `X-Request-ID` propagated through ASGI middleware stack.
- **Destination Filtering:** Verified total count (12), district filter (`KA-BLRU`), category filter (`heritage`), offbeat filter, slug resolution (`mysore-palace`), and missing destination (normalized HTTP 404).
- **Planning Orchestrator:** Tested failover and deterministic fallback when remote AI models are unreachable.
- **Trips API Security:**
  - Anonymous GET `/api/v1/trips` -> **HTTP 401 UNAUTHORIZED**.
  - User A creates trip -> **HTTP 201 Created**.
  - User B attempts to read User A's trip -> **HTTP 404 Not Found** (tenant boundary enforced).
  - User A retrieves own trip -> **HTTP 200 OK**.
  - User A deletes own trip -> **HTTP 200 OK**.

---

## J. SECURITY FINDINGS

1. **Zero Secret Leakage:** Audited all frontend assets and backend logs. No Supabase service-role keys, JWT secrets, Groq keys, or Gemini keys are exposed in frontend bundles or application logs.
2. **CORS Boundary:** Allowed origins are restricted to configured localhost origins (`http://localhost:5173`, `http://127.0.0.1:5173`).
3. **SQL Injection Immunity:** All repository interactions utilize parameterized queries or structured PostgREST query builders.
4. **Service-Role Key Protection:** The service-role key is loaded strictly within the backend process via `pydantic-settings` from `backend/.env`.
5. **Multi-Tenant Data Isolation:** Even if RLS were bypassed at the database layer, the backend application layer independently filters and asserts ownership on every read, write, and delete query.

---

## K. REMAINING BLOCKERS

| Priority | Issue / Blocker | Impact | Action Required |
| :--- | :--- | :--- | :--- |
| **P1** | Remote Supabase project unmigrated | Remote PostgREST returns `PGRST205` (fallback active). | User authorization to apply migrations `001` through `004` to project `ayqwlxpaollxghdnbsqo`. |
| **P2** | Groq remote model HTTP 404 | Configured model `llama-3.3-70b-versatile` returned 404 on live endpoint. | Verify model access or update model name in `backend/.env` (deterministic fallback handles this gracefully). |
| **P3** | Frontend Cloud Sync UI Toggle | Cloud synchronization disabled in frontend UI. | Enable cloud sync in frontend after remote Supabase migrations are verified. |

---

## L. DEPLOYMENT PROCEDURE (RUNBOOK)

Once explicit authorization is granted, execute the following steps to apply migrations and load seed data to Supabase:

### Method 1: Via Supabase CLI (Recommended)
1. **Link Supabase Project:**
   ```bash
   npx supabase link --project-ref ayqwlxpaollxghdnbsqo
   ```
2. **Apply Migrations:**
   ```bash
   npx supabase db push
   ```
3. **Execute Seed Data:**
   ```bash
   npx supabase db execute --file supabase/seed/seed.sql
   ```

### Method 2: Via Supabase Web Dashboard SQL Editor
1. Navigate to `https://supabase.com/dashboard/project/ayqwlxpaollxghdnbsqo/sql`.
2. Run the SQL files in exact numerical order:
   - File 1: `supabase/migrations/20261023000001_create_districts.sql`
   - File 2: `supabase/migrations/20261023000002_create_destinations.sql`
   - File 3: `supabase/migrations/20261023000003_create_destination_translations_and_sources.sql`
   - File 4: `supabase/migrations/20261023000004_create_trips_and_snapshots.sql`
   - File 5: `supabase/seed/seed.sql`
3. Verify table presence in the Table Editor:
   - Check that `districts` has 31 rows.
   - Check that `destinations` has 12 rows.
   - Check that `trips` has RLS enabled with 4 active policies.
4. Execute `python backend/scripts/verify_e2e_integration.py` to confirm that live PostgREST endpoints replace the in-memory fallback.

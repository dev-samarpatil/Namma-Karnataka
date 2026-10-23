# NAMMA KARNATAKA (ನಮ್ಮ ಕರ್ನಾಟಕ)
# PHASE 5B — SUPABASE SCHEMA DEPLOYMENT REPORT

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** October 2026  
**Environment:** Google Antigravity IDE  
**Phase:** Phase 5B — Database & Supabase Integration  
**Status:** **PENDING REMOTE DEPLOYMENT (LOCAL READY)**  

---

## 1. TARGET ENVIRONMENT & CREDENTIAL INSPECTION

- **Supabase Project URL:** `https://ayqwlxpaollxghdnbsqo.supabase.co`
- **Project Reference:** `ayqwlxpaollxghdnbsqo`
- **Supabase CLI Version:** `2.121.0` (verified locally via `npx supabase`)
- **Remote DDL Status:** Blocked from CLI due to missing `SUPABASE_ACCESS_TOKEN` (`AccessTokenRequiredError`). Management API commands require an access token or manual execution via the Supabase Dashboard SQL Editor.
- **Remote Schema Probe:** Live read-only PostgREST probes confirmed that tables `districts`, `destinations`, `destination_translations`, `destination_sources`, `trips`, and `itinerary_snapshots` return `PGRST205` (unmigrated public schema).
- **Application Resilience:** The backend's verified 60-second cooldown in `SupabaseDestinationRepository` and `SupabaseTripRepository` protects against connection storms and provides continuous service using the in-memory fallback catalogue.

---

## 2. LOCAL MIGRATION INVENTORY & QUALITY REVIEW

All migration files are ordered by UTC timestamp prefixes and use idempotent, non-destructive SQL constructs (`IF NOT EXISTS`, `ON CONFLICT`, `OR REPLACE`):

### 1. `20261023000001_enable_postgis.sql`
- **Extension:** `CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;`
- **Grants:** Grants schema usage to `postgres`, `anon`, `authenticated`, and `service_role`.
- **Safety:** Safe and non-destructive.

### 2. `20261023000002_create_districts_and_destinations.sql`
- **Enums Created:** `destination_category` (14 values), `access_status` (5 values), `verification_status` (5 values), `content_status` (4 values), `source_type` (6 values), `translation_status` (4 values).
- **Tables Created:**
  - `public.districts`: Primary key `code VARCHAR(16)`, `name_en`, `name_kn`, `active`, timestamps.
  - `public.destinations`: Primary key `id UUID`, `slug VARCHAR(120) UNIQUE`, `district_code REFERENCES districts(code) ON UPDATE CASCADE ON DELETE RESTRICT`, `category`, `latitude`, `longitude`, `location geography(Point, 4326)`, `access_status`, `verification_status`, `content_status`, `is_offbeat`, `estimated_visit_minutes`, `entry_fee_min_inr`, `entry_fee_max_inr`, `currency_code = 'INR'`, timestamps.
  - `public.destination_translations`: Primary key `(destination_id, language_code)`, `name`, `summary`, `description`, `how_to_reach`, `accessibility_notes`, `translation_status`.
  - `public.destination_sources`: Primary key `id UUID`, `destination_id REFERENCES destinations(id) ON DELETE CASCADE`, `source_name`, `source_url`, `source_type`, `claim_scope`, `checked_at`.
- **Triggers:**
  - `trg_sync_destination_location`: Automatically populates spatial `location` point from coordinates.
  - `set_updated_at_timestamp`: Auto-updates `updated_at` on modification.
- **Indexes:** PostGIS spatial GiST index (`idx_destinations_location_gist`), btree indexes on district, category, and review status.

### 3. `20261023000003_destinations_rls_policies.sql`
- **RLS Enabled:** Enabled on all 4 catalog tables.
- **Policies:**
  - Public anonymous/authenticated read-only access for published active items (`content_status = 'published' AND active = TRUE`).
  - Full write/manage permissions restricted to `service_role`.

### 4. `20261023000004_create_trips_and_snapshots.sql`
- **Tables Created:**
  - `public.trips`: Primary key `id UUID`, `user_id UUID NOT NULL`, `title`, `origin_label`, `duration_days (1..14)`, `pace ('relaxed' | 'balanced' | 'packed')`, `is_offbeat_preferred`, `budget_min_inr`, `budget_max_inr`, `currency_code = 'INR'`, `status`.
  - `public.itinerary_snapshots`: Primary key `id UUID`, `trip_id REFERENCES trips(id) ON DELETE CASCADE`, `user_id UUID NOT NULL`, `generation_mode`, `provider_used`, `items JSONB`.
- **RLS Multi-Tenant Policies:**
  - Strict `auth.uid() = user_id` on SELECT, INSERT, UPDATE, and DELETE.
  - Anonymous access strictly denied for private trips.
  - `service_role` retained for server-side verified jobs.

---

## 3. DEPLOYMENT PLAN & RUNBOOK

To deploy these migrations to Supabase project `ayqwlxpaollxghdnbsqo`:

### Option A: Via Supabase Dashboard (Direct Web SQL Editor)
1. Open [https://supabase.com/dashboard/project/ayqwlxpaollxghdnbsqo/sql](https://supabase.com/dashboard/project/ayqwlxpaollxghdnbsqo/sql).
2. Execute each file in order:
   - `supabase/migrations/20261023000001_enable_postgis.sql`
   - `supabase/migrations/20261023000002_create_districts_and_destinations.sql`
   - `supabase/migrations/20261023000003_destinations_rls_policies.sql`
   - `supabase/migrations/20261023000004_create_trips_and_snapshots.sql`
3. Execute `supabase/seed/seed.sql` to populate canonical catalogue data.

### Option B: Via Supabase CLI (With Management Access Token)
```bash
export SUPABASE_ACCESS_TOKEN="<your-personal-access-token>"
npx supabase link --project-ref ayqwlxpaollxghdnbsqo
npx supabase db push
```

---

## 4. STATUS SUMMARY
- Local SQL Schemas: **VALIDATED & IDEMPOTENT**
- Remote Deployment: **PENDING MANAGEMENT AUTH TOKEN / DASHBOARD EXECUTION**
- Backend Cooldown Fallback: **ACTIVE & VERIFIED**

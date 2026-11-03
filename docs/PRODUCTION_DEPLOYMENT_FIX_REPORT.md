# Namma Karnataka — Production Deployment Fix & Verification Report

**Date:** 2026-11-03  
**Status:** Complete  
**Application Scope:**
- **Frontend URL:** https://namma-karnataka-eight.vercel.app
- **Backend URL:** https://namma-karnataka.onrender.com
- **Supabase Project:** `ayqwlxpaollxghdnbsqo.supabase.co`

---

## 1. Executive Summary & Root Causes

A systematic engineering investigation of the production deployment revealed four root causes that collectively broke production operations:

1. **PostgREST UUID Syntax Violation**:
   `SupabaseDestinationRepository.list_destinations()` previously passed string alias keys (e.g., `"kstdc-mysore-palace"`) directly into `id: not.in.(...)` against a PostgreSQL `UUID` column. PostgREST returned HTTP 400 (`code: 22P02, invalid input syntax for type uuid`). The repository caught this error, marked the schema unmigrated for 60 seconds, and fell back to `_fallback_repo`.
2. **Missing Seed Data in Docker Container**:
   `backend/Dockerfile` only copied `app/`, leaving out the `data/seed/` datasets (`destinations.json`, `districts.json`, `events.json`, `places.json`, `transit_network.json`). Additionally, path traversal `parents[3]` resolved to root `/` in Docker. When the repository fell back to in-memory mode, 0 destinations were loaded, returning `{"items":[],"total":0}`.
3. **CORS Rejection of Vercel Production Origin**:
   Neither `config.py` default settings nor `backend/.env` included `https://namma-karnataka-eight.vercel.app` in `CORS_ORIGINS`. Browsers visiting the Vercel deployment blocked all API responses due to missing `Access-Control-Allow-Origin` headers.
4. **Vercel API URL Path Mismatch & Missing SPA Rewrites**:
   The Vercel environment variable `VITE_API_BASE_URL` had been configured as `https://namma-karnataka.onrender.com` without the `/api/v1` version prefix. As a result, client requests targeted `/destinations` instead of `/api/v1/destinations`, returning 404 Not Found. Additionally, `frontend/vercel.json` was missing, causing client-side route refreshes to 404.

---

## 2. Files Changed

| File | Type | Changes & Purpose |
| :--- | :--- | :--- |
| [`backend/app/repositories/destinations.py`](file:///c:/Namma%20Karnataka/backend/app/repositories/destinations.py) | Modified | Filtered `CANONICAL_ID_MAPPINGS` in PostgREST queries using `_is_valid_uuid()`. Switched seed file loading to `get_seed_data_path()`. |
| [`backend/app/core/paths.py`](file:///c:/Namma%20Karnataka/backend/app/core/paths.py) | **New** | Central seed data path resolution supporting local development, container paths (`/app/data/seed`), mirrored backend paths, and CWD. |
| [`backend/app/core/config.py`](file:///c:/Namma%20Karnataka/backend/app/core/config.py) | Modified | Added `https://namma-karnataka-eight.vercel.app` to default `CORS_ORIGINS`. Added `@field_validator` for JSON array and comma-separated string parsing. Added `PORT` support. |
| [`backend/app/main.py`](file:///c:/Namma%20Karnataka/backend/app/main.py) | Modified | Mounted root-level `/health` and `/ready` probes. Added 307 redirect from `/destinations` to `/api/v1/destinations`. Updated CORS middleware with explicit headers and methods. |
| [`backend/app/api/v1/health.py`](file:///c:/Namma%20Karnataka/backend/app/api/v1/health.py) | Modified | Enhanced readiness check to probe database/catalogue connectivity and verify destination counts while keeping optional AI provider checks decoupled. |
| [`backend/app/services/places/curated_provider.py`](file:///c:/Namma%20Karnataka/backend/app/services/places/curated_provider.py) | Modified | Uses `get_seed_data_path("places.json")` for container and local compatibility. |
| [`backend/app/services/transit/curated_provider.py`](file:///c:/Namma%20Karnataka/backend/app/services/transit/curated_provider.py) | Modified | Uses `get_seed_data_path("transit_network.json")` for container and local compatibility. |
| [`backend/app/services/events/service.py`](file:///c:/Namma%20Karnataka/backend/app/services/events/service.py) | Modified | Uses `get_seed_data_path("events.json")`. |
| [`backend/Dockerfile`](file:///c:/Namma%20Karnataka/backend/Dockerfile) | Modified | Added `COPY data/ ./data/` and updated startup command to bind dynamic port via `sh -c 'uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}'`. |
| [`backend/data/seed/*.json`](file:///c:/Namma%20Karnataka/backend/data/seed) | **New** | Mirrored verified JSON seed datasets into `backend/data/seed/` ensuring Docker build context `backend` or root `.` packages all seed records. |
| [`backend/.env`](file:///c:/Namma%20Karnataka/backend/.env) | Modified | Added `https://namma-karnataka-eight.vercel.app` to `CORS_ORIGINS`. |
| [`backend/.env.example`](file:///c:/Namma%20Karnataka/backend/.env.example) | Modified | Updated example `CORS_ORIGINS` to include production Vercel domain. |
| [`render.yaml`](file:///c:/Namma%20Karnataka/render.yaml) | **New** | Render Blueprint specification with Docker runtime, health check path `/health`, environment variables, and build contexts. |
| [`frontend/src/lib/api.ts`](file:///c:/Namma%20Karnataka/frontend/src/lib/api.ts) | Modified | Normalizes `getApiBaseUrl()` so that if `VITE_API_BASE_URL` lacks `/api/v1`, it is automatically appended. |
| [`frontend/.env.production`](file:///c:/Namma%20Karnataka/frontend/.env.production) | **New** | Production environment configuration with `VITE_API_BASE_URL=https://namma-karnataka.onrender.com/api/v1` and public Supabase keys. |
| [`frontend/vercel.json`](file:///c:/Namma%20Karnataka/frontend/vercel.json) | **New** | SPA routing rewrite rules directing all paths to `/index.html`. |
| [`vercel.json`](file:///c:/Namma%20Karnataka/vercel.json) | **New** | Repository root SPA routing fallback. |
| [`backend/app/tests/test_health.py`](file:///c:/Namma%20Karnataka/backend/app/tests/test_health.py) | Modified | Tests root and versioned health, readiness checks, database unavailable behavior, and missing optional AI handling. |
| [`backend/app/tests/test_cors.py`](file:///c:/Namma%20Karnataka/backend/app/tests/test_cors.py) | **New** | Regression tests for allowed Vercel origin, localhost origin, disallowed origin, OPTIONS preflight, header exposure, and settings parsing. |
| [`backend/app/tests/conftest.py`](file:///c:/Namma%20Karnataka/backend/app/tests/conftest.py) | Modified | Isolates unit tests from developer `.env` Supabase credentials using in-memory hermetic singletons. |

---

## 3. Automated Validation Results

### Backend Quality Suite
- **Linting & Formatting**: `ruff check .` passed with **0 errors**. `ruff format --check .` passed (**132 files formatted**).
- **Seed Validation**: `python data/validation/validate_seed.py` passed (**59 verified destination records against 31 districts**).
- **Pytest Suite**: `pytest -v` executed **243 tests across 36 test modules** — **243 passed (100% pass rate)** in 17.11s.
- **CORS Tests**: All 6 tests in `test_cors.py` passed.
- **Health & Readiness Tests**: All 7 tests in `test_health.py` passed.

### Frontend Quality Suite
- **Linting**: `npm run lint` passed with **0 errors and 0 warnings**.
- **Type Checking**: `npx tsc -b` passed with **0 type errors**.
- **Unit & Integration Tests**: `npm run test -- --run` executed **186 tests across 28 test files** — **186 passed (100% pass rate)** in 40.89s.
- **Production Build**: `npm run build` completed in 8.69s, generating optimized production assets in `dist/`.

---

## 4. Production Deployment Verification Checklist

### Verification Against Live Services

#### 1. Backend Process & Health Probes
```bash
# Root liveness probe
curl -I https://namma-karnataka.onrender.com/health
# Expected: HTTP/1.1 200 OK

# Root readiness probe
curl -s https://namma-karnataka.onrender.com/ready
# Expected: {"status":"ready","service":"namma-karnataka-api","ready":true,...}

# Canonical versioned health
curl -s https://namma-karnataka.onrender.com/api/v1/health
```

#### 2. Destination Catalogue & Localization
```bash
# Fetch paginated destinations (English)
curl -s "https://namma-karnataka.onrender.com/api/v1/destinations?limit=5"
# Verify: total >= 59, items populated with id, slug, name_en, coordinates, district

# Fetch paginated destinations (Kannada)
curl -s "https://namma-karnataka.onrender.com/api/v1/destinations?limit=5&language=kn"
# Verify: name_kn, summary_kn, and district.name_kn populated
```

#### 3. CORS Preflight & Production Origin
```bash
# CORS OPTIONS Preflight check
curl -X OPTIONS https://namma-karnataka.onrender.com/api/v1/destinations \
  -H "Origin: https://namma-karnataka-eight.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type" -I
# Expected: HTTP 200 OK
# Expected Header: Access-Control-Allow-Origin: https://namma-karnataka-eight.vercel.app
# Expected Header: Access-Control-Allow-Credentials: true
```

#### 4. Frontend SPA & API Connectivity
- Open `https://namma-karnataka-eight.vercel.app`.
- Verify the **Visual Discovery** and **Explore** tabs load destination cards immediately without CORS errors or 404s in the browser DevTools Network tab.
- Refresh a deep route to verify Vercel SPA rewrite functions correctly.

---

## 5. Remaining Manual Actions Required

To finalize live synchronization across cloud dashboards:

### In Render (Backend Dashboard: `https://dashboard.render.com`)
1. **Environment Variables**:
   Ensure the following environment variables are set on the `namma-karnataka` web service:
   - `CORS_ORIGINS`: `["https://namma-karnataka-eight.vercel.app","http://localhost:5173","http://127.0.0.1:5173"]`
   - `SUPABASE_URL`: `https://ayqwlxpaollxghdnbsqo.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: *(Your Supabase service role key)*
   - `SUPABASE_JWT_SECRET`: *(Your Supabase JWT secret)*
   - `AI_PLANNING_ENABLED`: `true`
   - `AI_ENABLE_LIVE_PROVIDERS`: `false` (or `true` if live Gemini/Groq keys are supplied)
2. **Health Check Path**:
   Under **Settings > Health Check Path**, set `/health`.
3. **Trigger Deployment**:
   Push the latest commit to `main`. Render will trigger a new Docker build. The updated Dockerfile will package `/app/data/seed` and bind port `${PORT:-8000}`.

### In Vercel (Frontend Dashboard: `https://vercel.com`)
1. **Environment Variables**:
   Under **Project Settings > Environment Variables**, confirm or set:
   - `VITE_API_BASE_URL`: `https://namma-karnataka.onrender.com/api/v1`
   - `VITE_SUPABASE_URL`: `https://ayqwlxpaollxghdnbsqo.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
2. **Redeploy**:
   A push to `main` will automatically build the frontend with `frontend/.env.production` and `frontend/vercel.json`, locking the API base URL to `https://namma-karnataka.onrender.com/api/v1`.


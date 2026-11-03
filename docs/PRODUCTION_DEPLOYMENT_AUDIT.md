# Namma Karnataka — Production Deployment Audit Report

**Date:** 2026-11-03  
**Target Environments:**
- **Frontend:** https://namma-karnataka-eight.vercel.app
- **Backend:** https://namma-karnataka.onrender.com
- **Database / Auth:** Supabase PostgreSQL (`ayqwlxpaollxghdnbsqo.supabase.co`)

---

## Executive Summary

A comprehensive repository and live infrastructure audit revealed four critical root causes responsible for production failures:

1. **PostgREST UUID Syntax Error (Empty Destinations)**:
   The backend repository query passed string aliases (e.g. `"kstdc-mysore-palace"`) into `id: not.in.(...)` against a PostgreSQL `UUID` column. Supabase rejected this with HTTP 400 (`code: 22P02, invalid input syntax for type uuid`). The repository caught this error and fell back to `_fallback_repo`.
2. **Missing Seed Files in Container Image**:
   The Docker container image (`backend/Dockerfile`) copied only `app/`, omitting `data/seed/`. Furthermore, path resolution used `parents[3]` which resolved to `/` in the container. As a result, the in-memory fallback catalogue was empty (`total: 0`), returning `{"items":[],"total":0}`.
3. **Frontend API URL Mismatch & Missing SPA Rewrites**:
   The Vercel environment had configured `VITE_API_BASE_URL=https://namma-karnataka.onrender.com` without the `/api/v1` version prefix, causing client requests to target `/destinations` (which returned 404). In addition, no `vercel.json` SPA rewrite rule existed for client-side routing.
4. **Missing Production Origin in CORS Allowlist & Missing Root Health Probes**:
   The backend's default and `.env` CORS allowlists omitted `https://namma-karnataka-eight.vercel.app`, leading to browser CORS rejections. Root-level probes (`/health`, `/ready`) were unmounted, returning 404 to uptime monitors and Render health checks.

---

## Phase 1 — Detailed Audit Findings

### 1. Backend Application Entrypoint & Lifespan
- **File**: `backend/app/main.py`
- **Application**: FastAPI application instance (`app.main:app`).
- **Findings**:
  - `RequestIdMiddleware` and `CORSMiddleware` were registered.
  - The API was mounted under `API_V1_STR` (`/api/v1`).
  - **Issue**: `/health` and `/ready` endpoints existed only under `/api/v1/health` and `/api/v1/ready`. Direct probes to `/health` or `/ready` (the default for Render and container orchestrators) returned 404 Not Found.
  - Root welcomed with JSON referencing `/api/v1/health`.

### 2. Docker & Container Runtime Configuration
- **File**: `backend/Dockerfile`
- **Original Content**:
  ```dockerfile
  FROM python:3.11-slim
  WORKDIR /app
  COPY pyproject.toml README.md ./
  RUN pip install --no-cache-dir .
  COPY app/ ./app/
  EXPOSE 8000
  CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
  ```
- **Findings**:
  - **Port Binding Defect**: Uvicorn hardcoded `--port 8000`. Render injects a dynamic `$PORT` environment variable (e.g. 10000). While Render has port autodetection, standard best practice requires binding to `${PORT:-8000}`.
  - **Missing Data Directory**: The Dockerfile never copied `data/`. Any file reads referencing `data/seed/destinations.json`, `districts.json`, `events.json`, `places.json`, or `transit_network.json` failed inside the container.
  - **Path Resolution Defect**: `Path(__file__).resolve().parent.parent.parent.parent` resolved to filesystem root `/` inside the container because `destinations.py` is at `/app/app/repositories/destinations.py`.

### 3. Database Connectivity & PostgREST Query Defect
- **File**: `backend/app/repositories/destinations.py`
- **Live Supabase Inspection**:
  - Live Supabase connection verified: `https://ayqwlxpaollxghdnbsqo.supabase.co`
  - All 61 rows in `destinations` table are present and healthy.
  - `districts` (31 rows), `destination_translations` (122 rows), and `destination_sources` are present and populated.
- **The Defect**:
  - In `SupabaseDestinationRepository.list_destinations()`:
    ```python
    deprecated_ids = ",".join(InMemoryDestinationRepository.CANONICAL_ID_MAPPINGS.keys())
    query_params["id"] = f"not.in.({deprecated_ids})"
    ```
  - `CANONICAL_ID_MAPPINGS` contains non-UUID strings (`"kstdc-mysore-palace"`, `"asi-pattadakal-group"`, etc.).
  - PostgreSQL returned:
    ```json
    {"code":"22P02","details":null,"hint":null,"message":"invalid input syntax for type uuid: \"kstdc-mysore-palace\""}
    ```
  - Because status code was 400, `SupabaseDestinationRepository` caught it, marked the schema unmigrated for 60 seconds, and called `_fallback_repo.list_destinations()`.
  - Since `_fallback_repo` could not find `destinations.json` inside Docker, it returned `[], 0`.
  - Result: Every request to `/api/v1/destinations` on Render returned:
    ```json
    {"items":[],"total":0,"limit":20,"offset":0,"has_more":false}
    ```

### 4. CORS Origins & Security Configuration
- **File**: `backend/app/core/config.py` and `backend/.env`
- **Findings**:
  - `CORS_ORIGINS` was configured as `["http://localhost:5173", "http://127.0.0.1:5173"]`.
  - The production Vercel frontend `https://namma-karnataka-eight.vercel.app` was completely omitted from the default allowlist and `.env`.
  - When the Vercel frontend attempted to fetch API endpoints, the browser blocked the response with a CORS violation because `Access-Control-Allow-Origin` was missing.
  - When unhandled OPTIONS preflight requests arrived from unlisted origins, Starlette's `CORSMiddleware` returned 400 Bad Request.

### 5. Frontend Production Configuration
- **Files**: `frontend/src/lib/api.ts`, `frontend/.env.production` (missing), `frontend/vercel.json` (missing)
- **Findings**:
  - The deployed Vercel JavaScript bundle had baked in `VITE_API_BASE_URL=https://namma-karnataka.onrender.com` without the `/api/v1` path suffix.
  - Calls to `fetchApi('/destinations')` constructed `https://namma-karnataka.onrender.com/destinations`, which returned 404 Not Found.
  - No `frontend/vercel.json` existed with SPA fallback rules (`"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]`), causing direct deep link refreshes on Vercel to fail with 404.

---

## Verification Matrix

| Component | Pre-Audit Status | Post-Audit Target |
| :--- | :--- | :--- |
| **`/health` (root)** | 404 Not Found | 200 OK (`{"status":"ok",...}`) |
| **`/ready` (root)** | 404 Not Found | 200 OK (`{"ready":true,"checks":{...}}`) |
| **`/api/v1/destinations`** | `{"items":[],"total":0}` | 200 OK (59 destinations returned) |
| **`/destinations` (root)** | 404 Not Found | 307 Redirect to `/api/v1/destinations` |
| **Vercel Origin CORS** | Blocked / Missing header | 200 OK + `Access-Control-Allow-Origin` |
| **OPTIONS Preflight** | 400 Bad Request | 200 OK + Allowed Methods/Headers |
| **Docker Seed Access** | Missing `/app/data/seed` | Fully packaged in `/app/data/seed` |


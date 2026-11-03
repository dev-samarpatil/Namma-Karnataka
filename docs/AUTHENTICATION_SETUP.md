# Namma Karnataka — Authentication Setup & Configuration Guide

## 1. Prerequisites

- Node.js >= 18.0.0
- Python >= 3.11 with virtual environment active
- A Supabase Project instance (or local Supabase CLI)

---

## 2. Environment Variables Configuration

### 2.1 Backend (`backend/.env`)
Create `backend/.env` copying from `backend/.env.example`:

```bash
# Application Environment (use 'development' locally, 'production' in deployed environments)
APP_ENV=development
LOG_LEVEL=INFO
API_V1_STR=/api/v1
PORT=8000
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]

# Supabase Auth & PostgreSQL (Server-side ONLY - Never expose to client!)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret
SUPABASE_JWT_SECRET=your_supabase_jwt_signing_secret
```

> [!IMPORTANT]
> In production environments (`APP_ENV=production`), `SUPABASE_JWT_SECRET` must be set to the project's actual JWT Secret (found in Supabase Dashboard > Project Settings > API > JWT Settings).

### 2.2 Frontend (`frontend/.env`)
Create `frontend/.env` copying from `frontend/.env.example`:

```bash
# Backend API Base URL
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1

# Supabase Client Configuration (Public/Anonymous ONLY)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_anon_key

# Default Locale
VITE_DEFAULT_LANGUAGE=en
```

> [!WARNING]
> NEVER place `SUPABASE_SERVICE_ROLE_KEY` in `frontend/.env`. Variables prefixed with `VITE_` are bundled into the client JavaScript build and viewable by any user.

---

## 3. Database Migrations

Apply the migration scripts in `supabase/migrations/` to your database using the Supabase CLI or SQL Editor:

1. `20261023000001_enable_postgis.sql` — PostGIS extensions.
2. `20261023000002_create_districts_and_destinations.sql` — Core catalogue tables.
3. `20261023000003_destinations_rls_policies.sql` — Public read policies for catalog.
4. `20261023000004_create_trips_and_snapshots.sql` — User trips, versioned snapshots & RLS.
5. `20261024000001_create_profiles_and_auth_triggers.sql` — User profiles and auto-provisioning trigger.

---

## 4. Supabase Auth Dashboard Settings

In your Supabase Dashboard:
1. **Email Auth**: Go to **Authentication > Providers > Email**, ensure **Enable Email provider** is turned ON.
2. **Confirm Email**: If enabled, users will receive a verification link before signing in (handled automatically by `AuthModal`'s Verification Pending view). If disabled, sign up immediately logs in.
3. **Redirect URLs**: Under **Authentication > URL Configuration**, add:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
   - Production domains

---

## 5. Development & Testing Workflow

### 5.1 Controlled Demo User (Development Only)
When `APP_ENV=development` and running Vite in dev mode (`import.meta.env.DEV`), clicking **Continue as Demo User** in the Sign In modal will generate a hermetic session with `user_id = 00000000-0000-0000-0000-000000000001` without requiring internet connectivity or active Supabase credentials.

### 5.2 Running the Full Verification Test Suite
```bash
# 1. Backend Authentication & Security tests
backend\venv\Scripts\pytest backend/app/tests/test_auth_security.py

# 2. Complete Backend suite (231 tests)
backend\venv\Scripts\pytest backend/app/tests/

# 3. Frontend Authentication tests
npm --prefix frontend test -- src/features/authentication/AuthModal.test.tsx

# 4. Complete Frontend suite (168 tests across 28 suites)
npm --prefix frontend test

# 5. Production build check
npm --prefix frontend run build
```


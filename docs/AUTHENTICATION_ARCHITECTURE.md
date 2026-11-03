# Namma Karnataka — Authentication & Authorization Architecture

## 1. Architectural Overview

Namma Karnataka implements an enterprise-grade, privacy-first authentication and multi-tenant authorization architecture combining **Supabase Auth** (identity provider & PostgreSQL session management), **FastAPI backend security** (stateless cryptographic JWT signature verification), and **React Auth Context** with full offline guest capabilities.

```mermaid
flowchart TD
    subgraph Frontend ["React 18 + TypeScript Client"]
        GuestUser["Guest User (Local Storage)"]
        AuthUI["AuthModal (Login / Register / Reset / Verify)"]
        AuthCtx["AuthContext & useAuth()"]
        SupaClient["Supabase JS Client (PKCE / Auto-Refresh)"]
        ApiClient["api.ts (Bearer Token Interceptor)"]
    end

    subgraph SupabaseCloud ["Supabase Auth & PostgreSQL"]
        SupaAuth["Supabase Auth Service (/auth/v1)"]
        UsersTable["auth.users"]
        ProfilesTable["public.profiles (RLS Enabled)"]
        TripsTable["public.trips (RLS Enabled)"]
        SnapshotsTable["public.itinerary_snapshots (RLS Enabled)"]
    end

    subgraph Backend ["FastAPI Backend (Port 8000)"]
        SecBearer["FastAPI HTTPBearer"]
        PyJWT["PyJWT Local Verification (HS256 Secret)"]
        SupaFallback["Supabase /auth/v1/user Fallback"]
        AuthDep["get_current_user Dependency"]
        TripsAPI["/api/v1/trips Router"]
    end

    AuthUI -->|Sign In / Sign Up| SupaClient
    SupaClient -->|HTTPS PKCE| SupaAuth
    SupaAuth -->|Triggers| UsersTable
    UsersTable -->|handle_new_user() trigger| ProfilesTable
    SupaClient -->|Session & Access Token| AuthCtx
    AuthCtx -->|Injects Bearer Token| ApiClient
    ApiClient -->|HTTP Authorization: Bearer JWT| SecBearer
    SecBearer --> AuthDep
    AuthDep --> PyJWT
    PyJWT -.->|Fallback if RS256/Rotated| SupaFallback
    SupaFallback --> SupaAuth
    AuthDep -->|AuthenticatedUser context| TripsAPI
    TripsAPI -->|Scoped user_id Queries| TripsTable
```

---

## 2. Key Subsystems

### 2.1 Identity Provider & User Registration
- **Provider**: Supabase Auth (OAuth 2.0 / OIDC / PKCE).
- **Credentials**: Email and Password.
- **Password Strength**: Real-time evaluation enforcing minimum length, mixed-case, numbers, and symbols with visual meter.
- **Verification Flow**: Configured for email confirmation with resend verification capability and user-friendly pending screen.
- **Password Recovery**: Secure password reset email link dispatching.

### 2.2 Profile Management & Automated Provisioning
- **Table**: `public.profiles` (`id UUID PRIMARY KEY REFERENCES auth.users(id)`).
- **Trigger**: `public.handle_new_user()` executes on `AFTER INSERT ON auth.users`, populating `full_name`, `avatar_url`, and `preferred_language` (`en` or `kn`) safely within PostgreSQL security definer context.
- **RLS**: Direct user self-isolation (`auth.uid() = id`).

### 2.3 FastAPI Backend Verification (`backend/app/core/security.py`)
- **Stateless Verification**:
  1. Validates standard JWT format.
  2. Cryptographically verifies signature using `SUPABASE_JWT_SECRET` (HS256).
  3. Enforces token expiration (`exp`) with 15-second clock drift leeway.
  4. Validates expected audience (`aud == 'authenticated'`).
  5. Derives identity strictly from `sub` claim.
- **Graceful Fallback**: If key algorithm differs (e.g. RS256 JWKS) or local secret verification fails, routes directly to Supabase `/auth/v1/user` using service credentials.
- **Demo Mode Isolation**: Controlled `test-token-user-*` development tokens are strictly gated to `APP_ENV in ("development", "test", "local")`. Attempting to present demo tokens in production generates an immediate HTTP 401 `UNAUTHORIZED`.

### 2.4 Multi-Tenant Row Level Security (RLS)
- Both PostgreSQL tables (`public.trips` and `public.itinerary_snapshots`) enforce:
  - `FOR SELECT USING (auth.uid() = user_id)`
  - `FOR INSERT WITH CHECK (auth.uid() = user_id)`
  - `FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
  - `FOR DELETE USING (auth.uid() = user_id)`
  - Administrative full access reserved for `service_role`.

### 2.5 Guest-to-User Trip Migration
- Guests can freely plan, customize, and save trips to local browser storage (`nk_guest_trips_v1`).
- Upon authentication, `SavedTripsView` detects unlinked guest trips and offers guided migration via `GuestTransferModal`.
- Uses deterministic idempotency keys (`import-${trip.id}`) preventing duplicate imports.
- Retains local guest records until server-side persistence succeeds.


# Supabase Authentication & Security Setup Guide

This guide details how to configure Supabase Authentication and database Row Level Security (RLS) for the **Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)** travel intelligence platform.

---

## 1. Overview & Architecture

Namma Karnataka operates with an **Honest Degradation / Tiered Auth** architecture:

```
+--------------------------------------------------------------------------+
|                        Namma Karnataka Frontend                          |
+--------------------------------------------------------------------------+
       |                                                    |
       | Supabase Configured?                               |
       |                                                    |
       v YES                                                v NO
+-----------------------------+                     +----------------------+
| State A: Live Supabase Auth |                     | State B: Safe Mode   |
| - Email / Password Login    |                     | - Guest Mode (Local) |
| - Password Recovery Flow    |                     | - Demo Mode (DEV)    |
| - Multi-Device Cloud Sync   |                     | - Honest Notice      |
+-----------------------------+                     +----------------------+
       |                                                    |
       v (Bearer JWT)                                       v (Local Only)
+--------------------------------------------------------------------------+
|                   FastAPI Backend / Supabase Postgres                    |
| - JWT Verification with Supabase JWKS / JWT Secret                       |
| - Row Level Security (RLS) enforcing strict user isolation               |
+--------------------------------------------------------------------------+
```

---

## 2. Setting Up a Supabase Project

1. Navigate to [Supabase Console](https://supabase.com/dashboard) and create a new project (e.g., `namma-karnataka-prod`).
2. Note your database password and choose a region close to your primary audience (e.g., `ap-south-1` Mumbai).
3. Once provisioned, open **Project Settings -> API**:
   - **Project URL**: `https://<project-ref>.supabase.co`
   - **anon / public key**: Safe for browser usage (`VITE_SUPABASE_ANON_KEY`).
   - **service_role key**: **SECRET** — backend server usage only; NEVER expose to frontend.

---

## 3. Configuring Authentication Settings in Supabase

In the Supabase Dashboard, navigate to **Authentication -> URL Configuration**:

1. **Site URL**:
   - Development: `http://localhost:5173`
   - Production: `https://your-domain.com`
2. **Redirect URLs**:
   - `http://localhost:5173/**`
   - `http://localhost:5173/#reset-password`
   - `https://your-domain.com/**`
   - `https://your-domain.com/#reset-password`
3. **Email Auth**:
   - Navigate to **Authentication -> Providers -> Email**.
   - Enable "Enable Email provider".
   - Toggle "Confirm email" based on your preference (enabled for production, optional in local dev).

---

## 4. Environment Variables Configuration

### Frontend Configuration (`frontend/.env`)

Copy the template from `frontend/.env.example`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Backend API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_ENABLE_DEV_DEMO_AUTH=false
```

> **Security Rule**: Never commit `.env` containing production keys to Git. `frontend/.env.example` contains blank templates.

### Backend Configuration (`backend/.env`)

```bash
# Supabase Integration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-supabase-service-role-key-or-anon-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
SUPABASE_ENABLE_CLOUD_SYNC=true
```

---

## 5. Database Schema & Row Level Security (RLS)

Execute the following SQL in Supabase **SQL Editor** to create user itineraries and enforce strict cross-tenant isolation:

```sql
-- 1. Create user_itineraries table
CREATE TABLE IF NOT EXISTS public.user_itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    origin_label TEXT NOT NULL,
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    pace TEXT NOT NULL,
    currency_code VARCHAR(3) DEFAULT 'INR',
    plan_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for high-performance retrieval by user
CREATE INDEX IF NOT EXISTS idx_user_itineraries_user_id ON public.user_itineraries(user_id);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.user_itineraries ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can only select their own itineraries
CREATE POLICY "Users can view own itineraries"
    ON public.user_itineraries
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert itineraries matching their authenticated UID
CREATE POLICY "Users can create own itineraries"
    ON public.user_itineraries
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own itineraries
CREATE POLICY "Users can update own itineraries"
    ON public.user_itineraries
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own itineraries
CREATE POLICY "Users can delete own itineraries"
    ON public.user_itineraries
    FOR DELETE
    USING (auth.uid() = user_id);
```

---

## 6. Password Recovery Flow

When a user initiates password recovery:
1. User clicks **"Forgot password?"** in the Sign In view.
2. User provides their email; Supabase sends a recovery link pointing to:
   `https://<your-domain>/#reset-password`
3. When the user opens the link, `AuthContext.tsx` detects the recovery hash / session event (`PASSWORD_RECOVERY`) and automatically activates State E (`reset_password` view).
4. The user sets a new password with client-side strength enforcement, invoking `authService.updatePassword(newPassword)`.

---

## 7. Verification Checklist

| Scenario | Expected Behavior | Status |
| :--- | :--- | :--- |
| **No Keys Configured** | Modal displays State B (Shield banner, guest exploration button, demo button in dev). Form inputs are hidden. | Verified |
| **Valid Keys Configured** | Modal displays State A (Email/Password, show/hide toggle, password meter, login/register). | Verified |
| **Guest Navigation** | Guest users can generate itineraries, inspect destinations, and save locally without signing in. | Verified |
| **Bad Credentials** | Sanitized error notice displayed; no stack traces leaked. | Verified |
| **Cross-Tenant Access** | Backend and RLS prevent User A from reading or modifying User B's itineraries. | Verified |

---

## 8. Troubleshooting

- **Error: "Authentication Unavailable"**:
  Check `frontend/.env`. If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing or blank, the app safely defaults to Guest Mode.
- **Error: "Invalid login credentials"**:
  Confirm user account exists in Supabase Dashboard -> Authentication -> Users. If email confirmation is enabled, ensure the user verified their email.
- **Password reset redirect failing**:
  Ensure `/#reset-password` is added to **Redirect URLs** in Supabase URL Configuration.


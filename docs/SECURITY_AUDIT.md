# Namma Karnataka — Security & Threat Model Audit

## 1. Audit Scope & Executive Summary

This security audit inspects the authentication and authorization implementation across the Namma Karnataka travel platform. Prior to this release, the application featured a temporary modal allowing manual entry of raw Supabase JWT Bearer strings or hardcoded demo credentials. 

The application now satisfies standard zero-trust multi-tenant isolation, cryptographic token validation, and complete elimination of raw credential exposure.

---

## 2. Threat Analysis & Mitigations

| Threat Vector | Severity | Vulnerability Description | Mitigation Implemented | Verification Test |
|---|---|---|---|---|
| **Raw JWT Pasting in UI** | Critical | Users were previously asked to manually paste Bearer tokens in an input box. | Replaced with modern `AuthModal.tsx` (email/password registration, password visibility toggle, forgot password flow). | Vitest `AuthModal.test.tsx` (7/7 passed) |
| **Demo User Token in Production** | Critical | Mock token `test-token-user-1` was accepted regardless of environment. | Gated demo tokens strictly to `settings.APP_ENV in ("development", "test", "local")`. Production returns HTTP 401 `UNAUTHORIZED`. | Pytest `test_demo_token_strictly_rejected_in_production` (passed) |
| **Tampered / Forged Tokens** | High | Unsigned or mis-keyed tokens could spoof user identities if unchecked. | Added PyJWT signature validation with `SUPABASE_JWT_SECRET` (HS256) and audience validation. | Pytest `test_reject_tampered_signature` (passed) |
| **Expired Token Reuse** | High | Expired session tokens could allow session replay attacks. | PyJWT verifies `exp` claim and returns standardized HTTP 401 `TOKEN_EXPIRED`. | Pytest `test_reject_expired_jwt` (passed) |
| **Client-Supplied User IDs** | High | Malicious users could pass `user_id` in request body to read or modify other users' trips. | Backend strictly ignores body `user_id` and derives identity strictly from verified token `sub` claim. | Pytest `test_reject_client_supplied_user_id_in_body` (passed) |
| **Cross-User Data Leakage** | High | User A could query User B's trip by guessable trip UUIDs. | Enforced PostgreSQL RLS policies (`auth.uid() = user_id`) and repository user-level scoping. Returns 404 to avoid leaking existence. | Pytest `test_cross_user_isolation_with_jwt` (passed) |
| **Service Role Secret Leakage** | High | Leaking Supabase `service_role` secret to frontend gives full admin bypass. | Audited all Vite environment variables. `SUPABASE_SERVICE_ROLE_KEY` is present only in backend `.env`. `frontend/.env` contains only public `VITE_SUPABASE_ANON_KEY`. | Frontend bundle audit (passed) |
| **Duplicate Guest Migration** | Medium | Retrying import could produce duplicated cloud trips. | Implemented idempotency header `Idempotency-Key: import-{trip.id}`. | Vitest `GuestTransferModal.test.tsx` (passed) |

---

## 3. Row Level Security Policy Verification

All catalog and user-owned tables were verified:
1. `public.districts`: Public SELECT (`active = true`), full access to `service_role`.
2. `public.destinations`: Public SELECT (`content_status = 'published' AND active = true`), full access to `service_role`.
3. `public.destination_translations`: Public SELECT on published destinations.
4. `public.destination_sources`: Public SELECT on published destinations.
5. `public.trips`: Isolated SELECT, INSERT, UPDATE, DELETE to `auth.uid() = user_id`.
6. `public.itinerary_snapshots`: Isolated SELECT, INSERT, UPDATE, DELETE to `auth.uid() = user_id`.
7. `public.profiles`: Isolated SELECT, INSERT, UPDATE to `auth.uid() = id`.

---

## 4. Test Suite Execution Summary
- **Backend Security Tests**: 10 unit tests in `backend/app/tests/test_auth_security.py` — **100% Passed**.
- **Backend Total Suite**: 231 tests in `backend/app/tests/` — **100% Passed**.
- **Frontend Authentication Tests**: 7 tests in `frontend/src/features/authentication/AuthModal.test.tsx` — **100% Passed**.
- **Frontend Total Suite**: 168 tests across 28 test files in `frontend/src/` — **100% Passed**.


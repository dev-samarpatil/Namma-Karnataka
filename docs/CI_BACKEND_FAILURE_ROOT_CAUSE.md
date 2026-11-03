# Root Cause Analysis: GitHub Actions Backend CI Failures

**Target Platform:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ) Backend  
**Date:** November 3, 2026  
**Status:** Forensic Diagnosis Completed  
**Impacted Suites:**  
- `backend/app/tests/test_account_isolation.py`
- `backend/app/tests/test_trips_api.py`
- `backend/app/tests/test_budget_planning.py`
- `backend/app/tests/test_destination_uniqueness.py`
- `backend/app/tests/test_geographic_planning.py`

---

## 1. Executive Summary

When running GitHub Actions CI or pytest in an isolated environment without a developer `.env` file, 7 tests fail across authentication and planning features:
1. Two tests in authentication isolation (`test_unauthenticated_requests_rejected`, `test_invalid_bearer_token_rejected`) return **HTTP 503 Service Unavailable** (`AUTH_UNCONFIGURED`) instead of the expected **HTTP 401 Unauthorized** with `WWW-Authenticate: Bearer`.
2. Two tests in budget planning (`test_flexible_preferences_uncapped_submission`, `test_budget_overrun_warning_generated`) return **HTTP 403 Forbidden** (`AI_PLANNING_DISABLED`) instead of **HTTP 200 OK**.
3. Three tests in AI orchestrator / destination uniqueness (`test_multi_day_itinerary_generation_uniqueness`, `test_day_regeneration_excludes_other_days`, `test_ai_orchestrator_grounded_in_corridor`) throw **AppException: AI trip planning feature is currently disabled (HTTP 403)**.

---

## 2. Failure Matrix & Forensic Breakdown

| # | Failing Test | Location | Failure Type | Root Cause |
|---|---|---|---|---|
| 1 | `test_unauthenticated_requests_rejected` | `app/tests/test_account_isolation.py:91` | Expected 401, got 503 | `verify_jwt_token` falls back to `verify_token_against_supabase_api` on malformed/invalid token strings, which raises `AUTH_UNCONFIGURED` (503) when `SUPABASE_URL` is unconfigured. |
| 2 | `test_invalid_bearer_token_rejected` | `app/tests/test_trips_api.py:116` | Expected 401, got 503 | Same as above: non-JWT string `"totally-invalid-random-token-xyz"` fails local decoding, triggering a fallback to remote Supabase verification instead of immediate 401 rejection. |
| 3 | `test_flexible_preferences_uncapped_submission` | `app/tests/test_budget_planning.py:54` | Expected 200, got 403 | `POST /api/v1/planning/recommendations` calls `orchestrator.recommend_itinerary(request)`. In CI, `settings.AI_PLANNING_ENABLED` defaults to `False`, rejecting all recommendation requests with HTTP 403. |
| 4 | `test_budget_overrun_warning_generated` | `app/tests/test_budget_planning.py:74` | Expected 200, got 403 | Same as above: planning recommendations route blocked by `AI_PLANNING_DISABLED` (403) before budget warning evaluation can occur. |
| 5 | `test_multi_day_itinerary_generation_uniqueness` | `app/tests/test_destination_uniqueness.py:207` | Throws `AppException` (403) | Directly invokes `AIOrchestrator.recommend_itinerary(req)`, which raises HTTP 403 when `AI_PLANNING_ENABLED` is `False`. |
| 6 | `test_day_regeneration_excludes_other_days` | `app/tests/test_destination_uniqueness.py:237` | Throws `AppException` (403) | Directly invokes `AIOrchestrator.recommend_itinerary(req)`, raising HTTP 403 when `AI_PLANNING_ENABLED` is `False`. |
| 7 | `test_ai_orchestrator_grounded_in_corridor` | `app/tests/test_geographic_planning.py:354` | Throws `AppException` (403) | Directly invokes `AIOrchestrator.recommend_itinerary(request)`, raising HTTP 403 when `AI_PLANNING_ENABLED` is `False`. |

---

## 3. Detailed Root Causes

### 3.1 Authentication & Token Verification (Failures 1 & 2)

#### Code Path:
1. Protected endpoints invoke `current_user: AuthenticatedUser = Depends(get_current_user)`.
2. In `app/api/dependencies/auth.py`:
   - If credentials are missing (`credentials is None`), it raises `AppError("UNAUTHORIZED", status_code=401)`.
   - If credentials are provided (`credentials.credentials = "totally-invalid-token"`), it calls `verify_jwt_token(credentials.credentials)`.
3. In `app/core/security.py`:
   - It checks demo token prefixes (`test-token-user-`).
   - If `settings.SUPABASE_JWT_SECRET` is set: it attempts `jwt.decode(...)`.
     - When decoding a malformed token (e.g. `"totally-invalid-random-token-xyz"`), PyJWT raises `jwt.InvalidTokenError`.
     - The catch block in `verify_jwt_token` logs a debug message and silently allows execution to fall through to line 192: `return await verify_token_against_supabase_api(clean_token)`.
   - If `settings.SUPABASE_JWT_SECRET` is NOT set (as in CI where no `.env` exists): execution immediately falls through to line 192: `return await verify_token_against_supabase_api(clean_token)`.
4. In `verify_token_against_supabase_api`:
   - It checks `if not settings.SUPABASE_URL or settings.SUPABASE_URL.startswith("placeholder"):`
   - In CI without `.env`, `settings.SUPABASE_URL` is `None`.
   - It raises `AppError(code="AUTH_UNCONFIGURED", message="Supabase authentication service is not configured.", status_code=503)`.
5. **The Flaw**:
   - An invalid or malformed token (e.g., non-JWT string, expired signature, or invalid token structure) is a client credential error, NOT an upstream service failure.
   - Non-JWT tokens (`token.count(".") != 2`) cannot be processed by Supabase and must be rejected immediately with `401 Unauthorized`.
   - In an environment without remote Supabase connectivity or keys, any token that fails local cryptographic verification must be rejected with `401 Unauthorized` (with `WWW-Authenticate: Bearer error="invalid_token"`), rather than throwing a `503 Service Unavailable`.
   - Only a genuine HTTP networking error during an attempted upstream check (`httpx.RequestError` when calling a configured URL) should yield `503 Service Unavailable`.

### 3.2 Planning Feature Flag & Test Isolation (Failures 3, 4, 5, 6, 7)

#### Code Path:
1. `app/core/config.py` sets `AI_PLANNING_ENABLED: bool = False` as the safe default for production when unconfigured.
2. In `app/services/ai/orchestrator.py`:
   ```python
   if not settings.AI_PLANNING_ENABLED:
       raise AppError(
           code="AI_PLANNING_DISABLED",
           message="AI trip planning feature is currently disabled.",
           status_code=403,
       )
   ```
3. In CI, no `.env` file exists, so `AI_PLANNING_ENABLED` remains `False`.
4. Tests in `test_budget_planning.py`, `test_destination_uniqueness.py`, and `test_geographic_planning.py` invoke either the `/api/v1/planning/recommendations` endpoint or `AIOrchestrator.recommend_itinerary` directly.
5. All five tests are rejected with HTTP 403 before executing planning, budget calculations, or destination deduplication.
6. **The Flaw**:
   - The test environment (`conftest.py`) failed to configure global test fixtures for testing planning.
   - Unit tests are intended to run deterministically using the existing deterministic fallback engine without calling live LLMs (Groq/Gemini).
   - In `conftest.py`, `settings.AI_PLANNING_ENABLED` must be active for test sessions, while preserving production defaults.

---

## 4. Proposed Remediation Plan

### 4.1 Security & Authentication Layer (`app/core/security.py` & `app/api/dependencies/auth.py`)
1. **Malformed Token Guard**: Immediately validate that candidate tokens have valid compact JWT format (`token.count(".") == 2`). If not, raise `401 Unauthorized` (`INVALID_CREDENTIALS`, `WWW-Authenticate: Bearer error="invalid_token"`).
2. **Local vs Remote Handling**:
   - If `SUPABASE_JWT_SECRET` is set: Validate HS256 locally. If signature is invalid or token is malformed, and `SUPABASE_URL` is not set or placeholder, immediately raise `401 Unauthorized`.
   - If `SUPABASE_URL` is not configured and `SUPABASE_JWT_SECRET` is not configured: Any non-demo token cannot be authenticated -> raise `401 Unauthorized`.
   - Genuine upstream connection failure (`httpx.RequestError`) continues to raise `503 Service Unavailable`.
3. **Response Headers**: Ensure all 401 exceptions include `WWW-Authenticate: Bearer`.

### 4.2 Pytest Environment & Fixture Configuration (`backend/app/tests/conftest.py` & `pyproject.toml`)
1. **Centralized Test Fixture**:
   - In `conftest.py`, define an autouse session/function fixture setting:
     - `settings.APP_ENV = "test"`
     - `settings.SUPABASE_JWT_SECRET = "test-secret-key-1234567890-test-secret-32bytes"`
     - `settings.AI_PLANNING_ENABLED = True`
     - `settings.AI_ENABLE_LIVE_PROVIDERS = False` (guarantees offline deterministic execution)
   - Resets repositories to in-memory instances to prevent state leakage.
2. **Pytest-Asyncio Configuration**:
   - In `pyproject.toml`, add `asyncio_default_fixture_loop_scope = "function"` to eliminate the deprecation warning.


# Resolution Report: GitHub Actions Backend CI Failures

**Target Platform:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ) Backend  
**Date:** November 3, 2026  
**Status:** Resolved & Verified  
**Related Documents:** [Root Cause Analysis](file:///c:/Namma%20Karnataka/docs/CI_BACKEND_FAILURE_ROOT_CAUSE.md)

---

## 1. Executive Summary

This deliverable resolves the 7 backend test failures observed in GitHub Actions CI during the execution of the backend quality and testing workflow. Forensic diagnosis proved that the failures were caused by two primary factors:
1. **Premature External Fallback for Malformed Tokens:** In environments without Supabase credentials (such as CI), passing malformed or invalid non-JWT tokens triggered a remote Supabase API fallback which raised HTTP 503 (`AUTH_UNCONFIGURED`) instead of returning the RFC 6750 standard HTTP 401 (`INVALID_CREDENTIALS`) with `WWW-Authenticate: Bearer`.
2. **Missing Centralized Test Environment Configuration:** In CI without a developer `.env` file, `settings.AI_PLANNING_ENABLED` defaulted to `False` and `settings.SUPABASE_JWT_SECRET` was `None`, causing planning and budget calculation routes to be rejected with HTTP 403 (`AI_PLANNING_DISABLED`).

Both root causes have been resolved cleanly with zero reduction in security guarantees, zero modification of API response schemas, and zero skipped tests.

---

## 2. Root Cause of Every Original Failure

| Test Identifier | Failure Mode | Root Cause |
| :--- | :--- | :--- |
| `app/tests/test_account_isolation.py::test_unauthenticated_requests_rejected` | Returned HTTP 503 instead of 401 | When presented with `"totally-invalid-token"`, `verify_jwt_token` caught `jwt.InvalidTokenError` and fell through to `verify_token_against_supabase_api`, which threw `AUTH_UNCONFIGURED` (503) because `SUPABASE_URL` is unset in CI. |
| `app/tests/test_trips_api.py::test_invalid_bearer_token_rejected` | Returned HTTP 503 instead of 401 | Identical to above: non-JWT string `"totally-invalid-random-token-xyz"` failed local parsing and fell through to unconfigured Supabase API instead of immediate 401 rejection. |
| `app/tests/test_budget_planning.py::test_flexible_preferences_uncapped_submission` | Returned HTTP 403 instead of 200 | Endpoint `/api/v1/planning/recommendations` invokes `AIOrchestrator.recommend_itinerary`, which checks `if not settings.AI_PLANNING_ENABLED: raise 403`. In CI without `.env`, this flag defaulted to `False`. |
| `app/tests/test_budget_planning.py::test_budget_overrun_warning_generated` | Returned HTTP 403 instead of 200 | Same as above: budget feasibility evaluation was blocked by the disabled feature flag prior to calculating budget overruns. |
| `app/tests/test_destination_uniqueness.py::test_multi_day_itinerary_generation_uniqueness` | Threw `AppException` (403) | Direct call to `orchestrator.recommend_itinerary(req)` raised HTTP 403 because `settings.AI_PLANNING_ENABLED` was `False`. |
| `app/tests/test_destination_uniqueness.py::test_day_regeneration_excludes_other_days` | Threw `AppException` (403) | Direct call to `orchestrator.recommend_itinerary(req)` raised HTTP 403 because `settings.AI_PLANNING_ENABLED` was `False`. |
| `app/tests/test_geographic_planning.py::test_ai_orchestrator_grounded_in_corridor` | Threw `AppException` (403) | Direct call to `orchestrator.recommend_itinerary(request)` raised HTTP 403 because `settings.AI_PLANNING_ENABLED` was `False`. |

---

## 3. Files Modified & Exact Implementation Changes

### 3.1 [`backend/app/core/security.py`](file:///c:/Namma%20Karnataka/backend/app/core/security.py)
- **Compact JWT Structural Validation:** Added immediate validation that tokens contain exactly 3 dot-separated segments (`clean_token.count(".") == 2`). Malformed strings (e.g. `"totally-invalid-token"`) are immediately rejected with `401 Unauthorized` and `WWW-Authenticate: Bearer error="invalid_token"`.
- **Header Parsing Guard:** Safely inspects the unverified JWT header (`alg`). If decoding the header fails, rejects with 401.
- **Strict Algorithm Separation:**
  - For `alg == "HS256"`: Verifies locally with `settings.SUPABASE_JWT_SECRET`. On expired tokens, raises 401 (`TOKEN_EXPIRED`). On invalid signatures, raises 401 (`INVALID_CREDENTIALS`).
  - Remote Supabase Auth (`/auth/v1/user`) is **only** contacted if `settings.SUPABASE_URL` is genuinely configured and non-placeholder.
  - If external Supabase connection fails (`httpx.RequestError`), raises 503 (`AUTH_UNAVAILABLE`).
  - If neither secret nor Supabase URL is configured, raises 503 (`AUTH_UNCONFIGURED`).

### 3.2 [`backend/app/core/errors.py`](file:///c:/Namma%20Karnataka/backend/app/core/errors.py)
- **Custom Headers Support:** Added `headers: dict[str, str] | None = None` to `AppException.__init__`.
- **Automatic `WWW-Authenticate: Bearer` on 401:** Updated `app_exception_handler` to guarantee that all HTTP 401 responses include `WWW-Authenticate: Bearer` in compliance with RFC 6750.

### 3.3 [`backend/app/api/dependencies/auth.py`](file:///c:/Namma%20Karnataka/backend/app/api/dependencies/auth.py)
- Added explicit `headers={"WWW-Authenticate": "Bearer"}` when `credentials` is missing or empty.

### 3.4 [`backend/app/tests/conftest.py`](file:///c:/Namma%20Karnataka/backend/app/tests/conftest.py)
- **Centralized Autouse Fixture:** Added `configure_test_environment(monkeypatch)`:
  - Configures `APP_ENV = "test"`
  - Configures `SUPABASE_JWT_SECRET = "test-secret-key-1234567890-test-secret-32bytes"`
  - Activates `AI_PLANNING_ENABLED = True` for testing
  - Forces `AI_ENABLE_LIVE_PROVIDERS = False` to ensure all tests execute deterministically offline without external API keys
  - Disables `GEMINI_ENABLED` and `GROQ_ENABLED` live calls during testing
  - Resets trip repository to a fresh `InMemoryTripRepository()` before each test

### 3.5 [`backend/pyproject.toml`](file:///c:/Namma%20Karnataka/backend/pyproject.toml)
- Added `asyncio_default_fixture_loop_scope = "function"` under `[tool.pytest.ini_options]` to resolve the pytest-asyncio warning.

### 3.6 [`backend/app/tests/test_auth_security.py`](file:///c:/Namma%20Karnataka/backend/app/tests/test_auth_security.py)
- Strengthened security assertions: `wrong_key_token` strictly asserts `res.status_code == 401` (removed `502, 503` ambiguity).
- Added test for `WWW-Authenticate: Bearer` presence on 401 unauthenticated requests.
- Added test for malformed non-JWT token rejection with 401.
- Added test for upstream connection failure producing 503 (`AUTH_UNAVAILABLE`).
- Added test for unconfigured environment producing 503 (`AUTH_UNCONFIGURED`).

---

## 4. Security & Architecture Analysis

1. **RFC 6750 / OAuth2 Conformance:** All protected endpoint rejections for missing or invalid tokens return HTTP 401 with `WWW-Authenticate: Bearer`.
2. **Denial of Service / Leak Prevention:** Non-JWT strings and malformed bearer headers are rejected instantly at the edge before initiating any outbound network connections or touching databases.
3. **Multi-Tenant Account Isolation:** User context derivation remains strictly cryptographic (`sub` claim extraction). Tests prove that User B cannot read or delete User A's trips (HTTP 404).
4. **Offline Deterministic Fallback:** Planning endpoints under test condition run via `DeterministicFallbackEngine`, verifying full multi-day itinerary generation, destination deduplication, and corridor grounding with zero network dependency.
5. **No Production Leaks:** `conftest.py` settings are strictly scoped to pytest test executions and do not impact runtime `config.py` defaults.

---

## 5. Before vs. After Test Verification

### Before Fix (CI / Isolated Environment without `.env`)
```
FAILED app/tests/test_trips_api.py::test_invalid_bearer_token_rejected (assert 503 == 401)
FAILED app/tests/test_account_isolation.py::test_unauthenticated_requests_rejected (assert 503 == 401)
FAILED app/tests/test_budget_planning.py::test_flexible_preferences_uncapped_submission (assert 403 == 200)
FAILED app/tests/test_budget_planning.py::test_budget_overrun_warning_generated (assert 403 == 200)
FAILED app/tests/test_destination_uniqueness.py::test_multi_day_itinerary_generation_uniqueness (AI_PLANNING_DISABLED 403)
FAILED app/tests/test_destination_uniqueness.py::test_day_regeneration_excludes_other_days (AI_PLANNING_DISABLED 403)
FAILED app/tests/test_geographic_planning.py::test_ai_orchestrator_grounded_in_corridor (AI_PLANNING_DISABLED 403)
Total: 7 failed, 224 passed
```

### After Fix (Tested Individually & Full Suite without `.env`)
```bash
$ pytest app/tests/test_account_isolation.py -k test_unauthenticated_requests_rejected
1 passed, 3 deselected in 0.44s

$ pytest app/tests/test_trips_api.py -k test_invalid_bearer_token_rejected
1 passed, 6 deselected in 0.33s

$ pytest app/tests/test_budget_planning.py -k test_flexible_preferences_uncapped_submission
1 passed, 1 deselected in 0.34s

$ pytest app/tests/test_budget_planning.py -k test_budget_overrun_warning_generated
1 passed, 1 deselected in 0.36s

$ pytest app/tests/test_destination_uniqueness.py -k test_multi_day_itinerary_generation_uniqueness
1 passed, 5 deselected in 0.11s

$ pytest app/tests/test_destination_uniqueness.py -k test_day_regeneration_excludes_other_days
1 passed, 5 deselected in 0.11s

$ pytest app/tests/test_geographic_planning.py -k test_ai_orchestrator_grounded_in_corridor
1 passed, 10 deselected in 0.10s
```

### Full Pytest Suite Result:
```
====================== 234 passed, 30 warnings in 14.40s ======================
```
- **Total Tests Passed:** 234 / 234 (100%)
- **Test Failures:** 0
- **Collection Errors:** 0

---

## 6. Linter & Formatter Verification

```powershell
cd backend
ruff check .
ruff format --check .
```
- **`ruff check .`**: `All checks passed!` (0 errors)
- **`ruff format --check .`**: `128 files already formatted` (0 formatting discrepancies)

---

## 7. Remaining Warnings & Observations

1. **FastAPI TestClient Warning:** `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead.` (Non-fatal, from Starlette 0.40+).
2. **Pillow Deprecation Warning:** `Image.getdata is deprecated and will be removed in Pillow 14 (2027-10-15)` (Forward deprecation scheduled for late 2027 in visual discovery service).
3. **Pytest-Asyncio:** Warning resolved via `asyncio_default_fixture_loop_scope = "function"`.


# Namma Karnataka — Backend API

FastAPI backend service for **Namma Karnataka**, providing AI provider orchestration, schema validation, deterministic budget calculations, destination querying, and authenticated trip persistence.

---

## Prerequisites

- **Python:** v3.11 or higher
- **Virtual Environment:** `venv` recommended

---

## Local Development Setup

1. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\activate
   # On Linux / macOS:
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -e ".[dev]"
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

4. **Start the development server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

5. **Access API Documentation:**
   - Interactive Swagger UI: `http://localhost:8000/docs`
   - ReDoc alternative: `http://localhost:8000/redoc`
   - OpenAPI JSON Schema: `http://localhost:8000/api/v1/openapi.json`

---

## API Endpoints (v1)

| Endpoint | Method | Purpose | Response Schema |
|---|---|---|---|
| `/` | `GET` | Root welcome & scaffold status | `{"service": "...", "message": "..."}` |
| `/api/v1/health` | `GET` | Process liveness probe | `HealthResponse` (`status`, `service`, `version`, `timestamp`) |
| `/api/v1/ready` | `GET` | Service operational readiness probe | `ReadinessResponse` (`status`, `ready`, `checks`, `timestamp`) |
| `/api/v1/destinations` | `GET` | List published destinations with filtering & bounded pagination | `DestinationListResponse` (`items`, `total`, `limit`, `offset`, `has_more`) |
| `/api/v1/destinations/{id_or_slug}` | `GET` | Retrieve destination by stable UUID or URL slug | `DestinationRead` |
| `/api/v1/planning/recommendations` | `POST` | Generate grounded travel recommendations via AI or deterministic fallback | `PlanningRecommendationResponse` (`items`, `generation_mode`, `provider_used`, `duration_days`) |

---

## Seed Data & Validation Commands

From repository root:
```bash
# Validate seed data against business rules and geographic bounds
python data/validation/validate_seed.py

# Simulate idempotent seed loader (dry-run mode)
python data/seed/load_seed.py --dry-run
```

## Quality & Testing Commands

| Command | Purpose |
|---|---|
| `pytest` | Execute full automated test suite |
| `pytest -v` | Execute tests with verbose output |
| `ruff check .` | Run linting checks across all Python modules |
| `ruff check --fix .` | Automatically fix import sorting and formatting issues |

---

## AI Provider Orchestration & Reliability

The itinerary recommendation engine uses a resilient, asynchronous multi-provider architecture:

- **Provider Priority:** **Groq** (`llama-3.3-70b-versatile`) is the primary provider; **Gemini** (`gemini-2.5-flash`) is the secondary provider (configurable via `AI_PREFERRED_PROVIDER`).
- **Async Execution:** Network calls use non-blocking `httpx.AsyncClient` throughout the request path (`api -> orchestrator -> adapters`).
- **Global Deadline Budgeting:** Enforces a 28-second monotonic timeout across provider attempts, failover, catalog hydration, and validation. Remaining time is calculated and passed to each attempt; no secondary attempts are started if remaining budget $\le 2.0$s.
- **Catalogue Grounding:** Model outputs are strictly filtered against curated destination UUIDs. Unrecognized IDs are discarded. If zero recognized stops remain, failover or deterministic fallback is triggered.
- **Deterministic Fallback:** If both providers fail or time out, a rule-based pace-allocated itinerary is generated from curated destinations.
- **Provider Smoke Testing:**
  ```bash
  # Run live sanitized smoke test (requires valid API keys in .env)
  python scripts/smoke_test_ai_providers.py
  ```

---

## Error Handling Conventions

All non-2xx API responses return a normalized JSON envelope conforming to `ErrorResponse`:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable error description",
    "request_id": "req-uuid-or-incoming",
    "details": [
      {
        "location": "body -> duration",
        "message": "Must be between 1 and 7",
        "type": "value_error"
      }
    ]
  }
}
```

---

## Security Guidelines

- **Zero Client Secrets:** Privileged credentials (`GROQ_API_KEY`, `GEMINI_API_KEY`, `SARVAM_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`) are server-only.
- **Request Tracing:** The `RequestIdMiddleware` assigns or propagates an unpredictable `X-Request-ID` across all logs, error envelopes, and response headers.
- **Traceback Sanitization:** Unhandled exceptions (HTTP 500) log full stack traces internally alongside the request ID, but return a sanitized, safe error message to external callers.

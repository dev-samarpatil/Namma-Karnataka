# Namma Karnataka — Backend API

FastAPI backend service for **Namma Karnataka**, providing AI provider orchestration, schema validation, deterministic budget calculations, destination querying, and authenticated trip persistence.

---

## Architecture Overview

```text
HTTP Request
    │
    ▼
FastAPI Router (/api/v1)
    │
    ├── Security / Auth Middleware (Supabase JWT verification)
    ├── Pydantic v2 Request Validation
    │
    ▼
Domain Services
    ├── Destination Service (queries repository with PostGIS filters)
    ├── Itinerary Service (coordinates AI & deterministic fallback)
    ├── Budget Service (pure Python arithmetic calculations)
    └── Routing / Geocoding Adapter (OSRM & Haversine fallback)
    │
    ▼
Adapters / Repositories
    ├── Groq Adapter (Llama 3.3 70B)
    ├── Gemini Adapter (Gemini 1.5 Flash)
    └── Supabase Repository (PostgreSQL client)
    │
    ▼
Pydantic v2 Response Mapping & Serialization
```

---

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Create and activate a Python virtual environment (Python 3.11+):
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -e .
   ```
4. Run the development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
5. Verify the health check endpoint:
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

---

## Testing

Run unit and integration test suites:
```bash
pytest tests/ -v
```

---

## Security Guidelines

- **Zero Client Secrets:** `GROQ_API_KEY`, `GEMINI_API_KEY`, `SARVAM_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are server-only secrets. Never commit them or expose them via API responses.

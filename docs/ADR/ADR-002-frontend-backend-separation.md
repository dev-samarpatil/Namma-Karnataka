# ADR-002: Frontend-Backend Boundary and Technology Stack

* **Status:** `ACCEPTED`
* **Date:** October 2026
* **Deciders:** Lead Architect, Frontend Lead, Backend Lead

## Context
The application needs rich, dynamic client-side interactions (interactive maps, multilingual UI toggles, multi-day itinerary timelines, responsive budget sliders) alongside heavy backend processing (external LLM orchestration, structured output validation, database queries with PostGIS spatial constraints, and deterministic financial calculations).

## Options Considered
1. **Full-Stack Next.js (Node.js/TypeScript):** Single runtime for frontend and API routes.
2. **Decoupled React SPA (Vite + TypeScript) + FastAPI (Python):** Dedicated Python backend with async FastAPI for LLM orchestration and Pydantic validation, paired with a lightweight, high-performance static React frontend.

## Decision
Adopt **Decoupled React (Vite) + FastAPI (Python)**:
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, `react-router-dom`, `react-i18next`, `react-leaflet`, and TanStack Query.
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, `httpx`, and `pytest`.
- **API Boundary:** Strict REST API at `/api/v1/` with auto-generated OpenAPI documentation.

## Reasoning
- Python provides the most mature ecosystem for AI provider integration, schema validation, data wrangling, and future offline NLP/translation tasks.
- FastAPI delivers asynchronous non-blocking I/O ideal for concurrent or fallback HTTP calls to external AI providers.
- Pydantic v2 offers unmatched schema validation speed and strict type enforcement for untrusted LLM outputs.
- React + Vite yields an ultra-fast developer feedback loop and compiles to static assets easily hosted on any CDN with zero server-side rendering latency.

## Consequences & Mitigations
- **Pros:** Clear separation of concerns; server secrets (`GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are physically isolated from frontend bundles.
- **Cons:** Requires running two development servers locally.
- **Mitigation:** Documented startup scripts and containerized development targets in Phase 1.

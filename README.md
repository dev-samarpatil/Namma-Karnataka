# Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)

> **Discover the Karnataka You Haven't Seen**  
> AI-assisted, culturally grounded, and transparent travel discovery and itinerary-planning platform for Karnataka, India.

---

## 1. Product Overview

**Namma Karnataka** helps travelers discover Karnataka's famous landmarks and editorially curated lesser-known ("offbeat") destinations. Based on user-provided preferences—such as origin, travel duration (1–7 days), group size, budget, pace, interests, and transport mode—it generates feasible, structured day-by-day itineraries, interactive route maps, and deterministic budget estimates.

### Core Capabilities
- **Curated Destination Discovery:** Explore verified attractions categorized by districts, themes, and editorial offbeat status.
- **Dual AI Orchestration:** Independent adapters for Groq and Google Gemini with bounded primary-then-secondary failover.
- **Strict Grounding & Anti-Hallucination:** AI recommendations are validated against the database catalog; unregistered destinations are rejected.
- **Deterministic Budget Arithmetic:** Authoritative Python engine calculates costs from structured data, never trusting LLM arithmetic.
- **Honest Route & Uncertainty Display:** Clear distinction between verified facts, estimates, and unknown data. Straight-line distances are never misrepresented as driving routes.
- **Bilingual Parity:** Seamless, persistent support for English (`en`) and Kannada (`kn`) across the entire user experience.
- **Guest-First Planning:** Anonymous users can plan and explore immediately; authentication is required only to save and manage trips.

---

## 2. Technology Stack Overview

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, `react-router-dom`, `react-i18next`, Leaflet, TanStack Query, Vitest.
- **Backend:** Python 3.11+, FastAPI (REST API at `/api/v1/`), Pydantic v2, `httpx`, `pytest`, `ruff`.
- **Database & Auth:** Supabase PostgreSQL + PostGIS, Row Level Security (`auth.uid() = user_id`), Supabase Auth.
- **AI Integrations:** Groq (`llama-3.3-70b-versatile`), Google Gemini (`gemini-2.5-flash`), local deterministic rule-based fallback.
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`).

---

## 3. Current Implementation Status

| Component | Status | Details |
|---|---|---|
| **Phase 0: Scope & Architecture Lock** | `COMPLETED` | PRD, TRD, Schemas, Acceptance Criteria, and 7 ADRs established. |
| **Phase 1: Foundation & Health Probes** | `COMPLETED` | Monorepo scaffold, FastAPI + React/Vite, typed API client, health/ready probes, error envelopes, and automated tests passing. |
| **Phase 2: Database Schema & Seeds** | `COMPLETED` | Supabase PostGIS migrations, destination schemas, curated seed data with provenance, repository layer, and seed validation suite. |
| **Phase 3: AI Orchestrator & Fallback** | `COMPLETED` | Dual Groq/Gemini adapters, 28s global deadline, catalog grounding, offline deterministic fallback engine, and recommendations API. |
| **Phase 4: Bilingual Planner & UI** | `COMPLETED` | Responsive planner forms, interactive SVG map, budget summary, saved trips, and instant English/Kannada toggle verified. |
| **Phase 5: Quality, Cloud & Security** | `COMPLETED` | Live Supabase Cloud PostgreSQL + PostGIS, GoTrue Auth, native PostgreSQL RLS verified, 99 automated tests passing. |
| **Phase 6: Controlled Pilot & Rollout** | `PLANNED NEXT` | Target: Closed beta user cohort testing (10–20 bilingual users), usability feedback, and production release sign-off. |

---

## 4. Repository Structure

```text
namma-karnataka/
├── README.md                      # Project root documentation
├── .gitignore                     # Git ignore rules for Node, Python, OS, Secrets
├── .editorconfig                  # Formatting and indentation rules
├── .gitattributes                 # Line-ending normalisation
├── .github/workflows/ci.yml       # Automated GitHub Actions CI pipeline
├── Namma_Karnataka_*.md           # Original Phase 0 specification documents
├── docs/                          # Architecture blueprints, ADRs, matrices, phase reports
├── frontend/                      # React + Vite + TypeScript web application
├── backend/                       # FastAPI + Pydantic backend service
├── supabase/                      # Supabase configuration, migrations, seeds
└── data/                          # Seed datasets, schemas, and validation scripts
```

---

## 5. Quickstart Developer Setup

### Frontend Setup
```bash
cd frontend
npm install
npm run dev        # Starts Vite dev server on http://localhost:5173
npm run test       # Runs Vitest unit tests
npm run build      # Verifies TypeScript and builds production bundle
npm run lint       # Runs ESLint checks
```

### Backend Setup
```bash
cd backend
python -m venv venv
# On Windows: .\venv\Scripts\activate | On Linux/macOS: source venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000   # Starts API on http://localhost:8000
pytest -v          # Runs Pytest test suite (36 tests passing)
ruff check .       # Runs Ruff linter
```

### Database & Seed Commands
```bash
# Validate seed data integrity and geographic bounds
python data/validation/validate_seed.py

# Idempotent seed loading dry-run audit
python data/seed/load_seed.py --dry-run
```

---

## 6. Documentation Index

### Core Specifications (Root)
- [`Namma_Karnataka_PRD.md`](./Namma_Karnataka_PRD.md): Product Requirements Document
- [`Namma_Karnataka_TRD.md`](./Namma_Karnataka_TRD.md): Technical Requirements Document
- [`Namma_Karnataka_Backend_Schema.md`](./Namma_Karnataka_Backend_Schema.md): Database and API Schema Specification
- [`Namma_Karnataka_App_Flow.md`](./Namma_Karnataka_App_Flow.md): End-to-End User Experience and Application Flow
- [`Namma_Karnataka_Complete_Documentation.md`](./Namma_Karnataka_Complete_Documentation.md): Comprehensive Project Reference

### Phase Documentation (`docs/`)
- [`docs/IMPLEMENTATION_DECISIONS.md`](./docs/IMPLEMENTATION_DECISIONS.md): Architectural Decisions & Scope Lock
- [`docs/MVP_ACCEPTANCE_CRITERIA.md`](./docs/MVP_ACCEPTANCE_CRITERIA.md): Testable MVP Acceptance Criteria
- [`docs/PHASE_0_RISK_REGISTER.md`](./docs/PHASE_0_RISK_REGISTER.md): Prioritized Project Risk Matrix
- [`docs/PHASE_0_TRACEABILITY_MATRIX.md`](./docs/PHASE_0_TRACEABILITY_MATRIX.md): Requirements Traceability Matrix
- [`docs/PHASE_1_COMPLETION_REPORT.md`](./docs/PHASE_1_COMPLETION_REPORT.md): Phase 1 Implementation & Quality Report
- [`docs/PHASE_2_DATABASE_DESIGN.md`](./docs/PHASE_2_DATABASE_DESIGN.md): Phase 2 Database & PostGIS Specification
- [`docs/PHASE_2_COMPLETION_REPORT.md`](./docs/PHASE_2_COMPLETION_REPORT.md): Phase 2 Completion Report
- [`docs/ADR/`](./docs/ADR/): Architecture Decision Records (ADR-001 through ADR-007)

---

## 7. Security Policy

- Server credentials (`GROQ_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) must **NEVER** be committed or exposed to the frontend.
- Frontend bundles only receive public, client-safe variables prefixed with `VITE_`.
- Request IDs (`X-Request-ID`) correlate all backend logs and error responses without exposing sensitive internal stack traces.

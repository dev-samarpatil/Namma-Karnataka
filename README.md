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

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, `react-router-dom`, `react-i18next`, Leaflet, TanStack Query.
- **Backend:** Python 3.11+, FastAPI (REST API at `/api/v1/`), Pydantic v2, `httpx`, `pytest`.
- **Database & Auth:** Supabase PostgreSQL + PostGIS, Row Level Security (`auth.uid() = user_id`), Supabase Auth.
- **AI Integrations:** Groq (`llama-3.3-70b-versatile`), Google Gemini (`gemini-1.5-flash`), local deterministic rule-based fallback.

---

## 3. Repository Structure

```text
namma-karnataka/
├── README.md                      # Project root documentation
├── .gitignore                     # Git ignore rules for Node, Python, OS
├── .editorconfig                  # Formatting and indentation rules
├── .gitattributes                 # Line-ending normalisation
├── Namma_Karnataka_*.md           # Original Phase 0 specification documents
├── docs/                          # Architecture blueprints, ADRs, matrices
├── frontend/                      # React + Vite + TypeScript web application
├── backend/                       # FastAPI + Pydantic backend service
├── supabase/                      # Supabase configuration, migrations, seeds
├── data/                          # Seed datasets, schemas, and validation scripts
└── .github/                       # CI/CD workflows
```

---

## 4. Documentation Index

The repository maintains comprehensive specifications and architectural decision records:

### Core Specifications (Root)
- [`Namma_Karnataka_PRD.md`](./Namma_Karnataka_PRD.md): Product Requirements Document
- [`Namma_Karnataka_TRD.md`](./Namma_Karnataka_TRD.md): Technical Requirements Document
- [`Namma_Karnataka_Backend_Schema.md`](./Namma_Karnataka_Backend_Schema.md): Database and API Schema Specification
- [`Namma_Karnataka_App_Flow.md`](./Namma_Karnataka_App_Flow.md): End-to-End User Experience and Application Flow
- [`Namma_Karnataka_Complete_Documentation.md`](./Namma_Karnataka_Complete_Documentation.md): Comprehensive Project Reference

### Phase 0 Implementation Blueprints (`docs/`)
- [`docs/IMPLEMENTATION_DECISIONS.md`](./docs/IMPLEMENTATION_DECISIONS.md): Architectural Decisions & Scope Lock
- [`docs/MVP_ACCEPTANCE_CRITERIA.md`](./docs/MVP_ACCEPTANCE_CRITERIA.md): Testable MVP Acceptance Criteria
- [`docs/PHASE_0_RISK_REGISTER.md`](./docs/PHASE_0_RISK_REGISTER.md): Prioritized Project Risk Matrix
- [`docs/PHASE_0_TRACEABILITY_MATRIX.md`](./docs/PHASE_0_TRACEABILITY_MATRIX.md): Requirements Traceability Matrix
- [`docs/PHASE_1_READINESS.md`](./docs/PHASE_1_READINESS.md): Phase 1 Implementation Plan & Inventory
- [`docs/ADR/`](./docs/ADR/): Architecture Decision Records (ADR-001 through ADR-007)

---

## 5. Prerequisites

- **Node.js:** v18.0.0 or higher (v24 LTS recommended)
- **Python:** v3.11 or higher
- **Git:** v2.30 or higher

---

## 6. Implementation Status

- **Current State:** **Phase 1A — Scaffold and Repository Layout Established.**
- The repository structure, environment templates, minimal frontend starter, and minimal FastAPI health endpoint have been initialized.
- Core business logic, database migrations, and live AI integrations will be implemented in subsequent phases.

---

## 7. Security Note

- Server credentials (`GROQ_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) must **NEVER** be committed or exposed to the frontend.
- Frontend bundles only receive public, client-safe variables prefixed with `VITE_`.

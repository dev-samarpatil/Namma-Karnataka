# NAMMA KARNATAKA
## Phase 1 Readiness Assessment and Implementation Plan

**Product:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Document ID:** NK-RDY-001  
**Version:** 1.0  
**Phase:** Phase 0 Exit / Phase 1 Entry Gate  
**Target Environment:** Google Antigravity IDE  
**Status:** READY_WITH_ASSUMPTIONS  
**Date:** October 2026  

---

## 1. Executive Summary of Phase 0 Findings

Phase 0 has completed a comprehensive repository reconnaissance, requirements analysis, contradiction resolution, and architectural specification for **Namma Karnataka**.

The project currently consists of five comprehensive specification documents at the root of the workspace. No frontend code, backend services, database migrations, or test suites have been prematurely created. The requirements and architecture are now formally locked with testable acceptance criteria, clear data-provenance rules, isolated AI provider failover policies, and deterministic fallback calculations.

---

## 2. Current Repository State Inventory

| Item | Status | Verified Evidence | Gap / Required Phase 1 Action |
|---|---|---|---|
| **Root Specification Docs** | `VERIFIED` | 5 Markdown files (`Namma_Karnataka_PRD.md`, `Namma_Karnataka_TRD.md`, `Namma_Karnataka_Backend_Schema.md`, `Namma_Karnataka_App_Flow.md`, `Namma_Karnataka_Complete_Documentation.md`). Total size ~303 KB. | None. Must be preserved untouched. |
| **Documentation Suite** | `VERIFIED` | `docs/` containing `IMPLEMENTATION_DECISIONS.md`, `MVP_ACCEPTANCE_CRITERIA.md`, `PHASE_0_RISK_REGISTER.md`, `PHASE_0_TRACEABILITY_MATRIX.md`, `docs/ADR/`. | Maintain and reference during implementation. |
| **Git Version Control** | `MISSING` | `git status` returned code 1 (`not a git repository`). | Initialize git repository (`git init`), create `.gitignore`, make initial commit of Phase 0 baseline. |
| **Frontend Shell** | `MISSING` | No `frontend/` directory, no `package.json`. | Initialize Vite + React + TypeScript + Tailwind + shadcn/ui in Phase 1. |
| **Backend Shell** | `MISSING` | No `backend/` directory, no `pyproject.toml` or `requirements.txt`. | Initialize Python 3.11+ FastAPI project with Pydantic in Phase 1. |
| **Database & Migrations** | `PROPOSED` | Logical schema documented in `Namma_Karnataka_Backend_Schema.md`. | Setup Supabase project and write initial migration files in Phase 2. |
| **Environment Configuration** | `MISSING` | No `.env` or `.env.example`. | Create documented `.env.example` templates in root, frontend, and backend in Phase 1. |
| **Automated Tests** | `MISSING` | No test harnesses configured yet. | Setup Vitest (frontend) and pytest (backend) in Phase 1. |

---

## 3. Preserved Assets and Documentation

The following pre-existing files provide rich context, domain research, and UX wireframe descriptions and **MUST NOT BE OVERWRITTEN OR DELETED**:
- `c:\Namma Karnataka\Namma_Karnataka_PRD.md`
- `c:\Namma Karnataka\Namma_Karnataka_TRD.md`
- `c:\Namma Karnataka\Namma_Karnataka_Backend_Schema.md`
- `c:\Namma Karnataka\Namma_Karnataka_App_Flow.md`
- `c:\Namma Karnataka\Namma_Karnataka_Complete_Documentation.md`

All architectural decisions in `docs/` build directly upon these foundations without contradicting their core domain rules.

---

## 4. Locked Decisions for Phase 1

1. **Repository Layout:** Monorepo with two top-level directories: `frontend/` and `backend/`, plus shared `docs/` and `supabase/`.
2. **Frontend Foundation:** React 18+ with TypeScript, Vite, Tailwind CSS, shadcn/ui, `react-router-dom`, `react-i18next`, and `leaflet`.
3. **Backend Foundation:** Python 3.11+ with FastAPI, Pydantic v2, `httpx`, and `pytest`.
4. **AI Failover Strategy:** Primary-then-fallback order (`Groq` $\rightarrow$ `Gemini` $\rightarrow$ `Deterministic Fallback`) within a strict 28s total deadline.
5. **Budget Authority:** 100% deterministic calculation in backend Python service (`app/services/budget.py`); LLM arithmetic is ignored.
6. **Data Grounding:** AI output validator strictly enforces that all destination IDs exist in the curated database catalog.
7. **Guest Experience:** "Plan first, sign in later." In-memory generation for anonymous users; authentication required only for persisting trips.

---

## 5. Working Assumptions

The following assumptions are temporarily accepted for Phase 1 execution:
1. **Mocked Provider Execution for Tests:** All unit and integration tests in CI will run against deterministic mocks and fixtures; real API keys for Groq/Gemini/Supabase are not required to complete Phase 1 test suites.
2. **Developer Credentials Available:** The user or developer will supply test credentials (`GROQ_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) when verifying live staging environments.
3. **OSRM Routing Default:** Standard free OSRM demo API is acceptable for dev/staging routing calculations; a local Haversine fallback is implemented if OSRM is unreachable.

---

## 6. Proposed Repository Structure

```text
/
├── .gitignore
├── README.md
├── docs/
│   ├── IMPLEMENTATION_DECISIONS.md
│   ├── MVP_ACCEPTANCE_CRITERIA.md
│   ├── PHASE_0_RISK_REGISTER.md
│   ├── PHASE_0_TRACEABILITY_MATRIX.md
│   ├── PHASE_0_SUMMARY.md
│   ├── PHASE_1_READINESS.md
│   └── ADR/
│       ├── ADR-001-monorepo-structure.md
│       ├── ADR-002-frontend-backend-separation.md
│       ├── ADR-003-supabase-persistence-and-auth.md
│       ├── ADR-004-ai-provider-orchestration-and-fallback.md
│       ├── ADR-005-destination-provenance-and-curation.md
│       ├── ADR-006-deterministic-budget-and-route-uncertainty.md
│       └── ADR-007-guest-planning-and-trip-persistence.md
├── frontend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/       # shadcn/ui & shared components
│   │   ├── features/         # discovery, planner, itinerary, map
│   │   ├── locales/          # en/common.json, kn/common.json
│   │   ├── services/         # typed API client
│   │   └── types/
│   └── tests/
├── backend/
│   ├── .env.example
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint
│   │   ├── core/             # config, security, logging
│   │   ├── schemas/          # Pydantic models & enums
│   │   ├── api/v1/           # route handlers
│   │   ├── services/         # planner, budget, destination
│   │   ├── adapters/         # groq, gemini, osrm, sarvam
│   │   └── repositories/     # supabase/postgres queries
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── fixtures/
└── supabase/
    └── migrations/
```

---

## 7. Initial Environment-Variable Inventory

### 7.1 Backend Environment (`backend/.env.example`)
```bash
# Server Configuration
ENVIRONMENT=development
PORT=8000
LOG_LEVEL=info
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]

# AI Providers (Server-side ONLY)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
AI_EXECUTION_MODE=primary_then_fallback
AI_PRIMARY_TIMEOUT_SECONDS=12
AI_SECONDARY_TIMEOUT_SECONDS=15
AI_GLOBAL_TIMEOUT_SECONDS=28
AI_ENABLE_LIVE_PROVIDERS=true

# Optional Translation & Routing
SARVAM_API_KEY=your_sarvam_api_key_here
ENABLE_SARVAM_REPAIR=false
ROUTING_PROVIDER=osrm
OSRM_BASE_URL=https://router.project-osrm.org

# Database & Supabase (Server-side ONLY)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_JWT_SECRET=your_supabase_jwt_secret_here
```

### 7.2 Frontend Environment (`frontend/.env.example`)
```bash
# Public API and Supabase (Client-Safe ONLY - NEVER put service keys here)
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_DEFAULT_LANGUAGE=en
```

---

## 8. Phase 1 Implementation Sequence

Phase 1 establishes the skeleton of the project, package infrastructure, core schemas, configuration loaders, and basic health check endpoints:

1. **Step 1.1 — Git & Monorepo Initialization:** Initialize Git repo, configure `.gitignore` for Node/Python/OS files, create initial commit with Phase 0 baseline.
2. **Step 1.2 — Backend Scaffold:** Setup Python virtual environment, `pyproject.toml`, FastAPI app structure, Pydantic settings loader, and health endpoint (`GET /api/v1/health`).
3. **Step 1.3 — Core Pydantic Schemas:** Implement domain schemas (`schemas/destination.py`, `schemas/itinerary.py`, `schemas/budget.py`, `schemas/enums.py`).
4. **Step 1.4 — Frontend Scaffold:** Initialize Vite + React + TypeScript, Tailwind CSS, shadcn/ui configuration, and base layout.
5. **Step 1.5 — Bilingual i18n Skeleton:** Configure `react-i18next` with `en` and `kn` baseline catalogs for static app navigation and header.
6. **Step 1.6 — Test Harness Setup:** Configure pytest for backend with mock HTTP fixtures, and Vitest for frontend with React Testing Library.

---

## 9. Verification Commands for Phase 1 Validation

Once Phase 1 is executed, the following commands will verify implementation correctness:

```bash
# 1. Backend Verification
cd backend
python -m venv venv
venv\Scripts\activate
pip install -e .
pytest tests/ -v
curl -X GET http://localhost:8000/api/v1/health

# 2. Frontend Verification
cd ../frontend
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

---

## 10. Phase 1 Readiness Status

* **Status:** `READY_WITH_ASSUMPTIONS`
* **Justification:**
  - All architecture decisions, schemas, risk mitigations, and acceptance criteria are locked and traceable.
  - Zero code conflicts exist; existing documentation is preserved.
  - Working assumptions (mocked testing, standard OSRM routing) allow Phase 1 scaffolding to proceed without dependency on live external billing accounts or paid keys.
* **Blocker Assessment:** No blocking technical impediments exist. Implementation may begin immediately upon starting Phase 1.

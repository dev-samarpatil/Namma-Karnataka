# NAMMA KARNATAKA (ನಮ್ಮ ಕರ್ನಾಟಕ)
## PHASE 2 — BASELINE AUDIT AND ARCHITECTURAL RECONNAISSANCE REPORT

**Date:** 2026-10-23  
**Target Environment:** Google Antigravity IDE  
**Branch:** `main` (commit baseline: `5478063`)  
**Status:** AUDIT COMPLETE — BASELINE CONFIRMED  

---

### 1. Repository & Branch Information
- **Repository Root:** `c:\Namma Karnataka`
- **Active Git Branch:** `main`
- **Clean Baseline Check:** Verified with `git status`. Working tree contains completed Phase 1 enhancements (scheduler, budget calculator, shared planning schemas, frontend timeline/budget components, and validation script).
- **Active Processes:**
  - Vite Frontend Dev Server: Port 5173 (`http://127.0.0.1:5173`)
  - FastAPI Backend Server: Port 8000 (`http://127.0.0.1:8000`)

---

### 2. Actual System Architecture

```
+-------------------------------------------------------------+
|                      React 18 Frontend                      |
| (Vite + TypeScript + Tailwind CSS + Bilingual EN/KN UI)     |
+-------------------------------------------------------------+
                              | HTTP / JSON
                              v
+-------------------------------------------------------------+
|                      FastAPI Backend                        |
|  - Routers: Destinations, Planning, Trips, Auth, Health     |
|  - DeterministicScheduler (Meal, Transit, Rest, Lodging)   |
|  - BudgetCalculator (CostStatus: verified/estimated/etc.)  |
|  - AI Orchestrator (Gemini 2.5 Flash -> Deterministic Fallback)
+-------------------------------------------------------------+
                              |
       +----------------------+----------------------+
       |                                             |
       v                                             v
+-------------------------------+   +-------------------------------+
|  Supabase Cloud (PostgreSQL)  |   | Local Seed & Validation Data  |
|  - Auth, Profiles, Trips      |   | - 12 Pilot Destinations       |
|  - Saved Itineraries          |   | - 31 Districts (Karnataka)    |
|  - RLS Policies Configured    |   | - audit_destination_quality.py|
+-------------------------------+   +-------------------------------+
```

---

### 3. Verified Phase 1 Capabilities
1. **Curated Destination Catalogue:** 12 verified pilot destinations across 9 Karnataka districts with bilingual (EN/KN) metadata, geographic coordinates, visit duration, entrance fee statuses, and official government/KSTDC citations.
2. **Deterministic Itinerary Scheduler:** `DeterministicScheduler` creates structured day-wise plans with attraction visits, lunch/dinner meal stops, rest buffers, and travel legs based on user pace (relaxed, balanced, packed).
3. **Structured Budget Engine:** `BudgetCalculator` aggregates entry fees, meal estimates, accommodation estimates, transport expenses, and configurable contingency (10%) with explicit cost status labelling (`verified`, `estimated`, `unknown`, `user_provided`).
4. **Resilient AI Orchestration:** Gemini 2.5 Flash integration with immediate fallback to deterministic scheduling and zero hallucinated IDs.
5. **Interactive Bilingual UI:** Day-by-day timeline, meal/accommodation cards, budget breakdown with cost status badges, and instant English/Kannada toggling.
6. **Persistence & Guest Mode:** Saved trips in Supabase for authenticated users with seamless localStorage fallback for guest users.

---

### 4. Relevant Directory & File Map
- `backend/app/main.py`: Application entry point, CORS, routers.
- `backend/app/schemas/planning.py`: Schema definitions for `ItineraryStop`, `DayPlan`, `CompleteBudgetBreakdown`, `CostStatus`, `StopType`.
- `backend/app/services/scheduler.py`: `DeterministicScheduler` class handling scheduling logic.
- `backend/app/services/budget.py`: `BudgetCalculator` class handling budget math and cost statuses.
- `backend/app/services/ai/orchestrator.py`: AI recommendation and scheduling with deterministic fallback.
- `backend/app/api/v1/endpoints/`:
  - `destinations.py`: Querying destinations, filtering by district/category.
  - `planning.py`: Generating recommendations and itineraries.
  - `trips.py`: Trip persistence and retrieval.
- `data/seed/`:
  - `destinations.json`: 12 seed destinations.
  - `districts.json`: 31 Karnataka administrative districts.
- `data/validation/audit_destination_quality.py`: Automated destination data quality validation script.
- `frontend/src/features/itinerary/`:
  - `ItineraryView.tsx`: Bilingual timeline, transit stops, meal/stay cards.
  - `BudgetSummary.tsx`: Transparent budget breakdown with status indicators.
- `frontend/src/lib/api.ts`: Typed API client connecting frontend to backend.

---

### 5. Existing API Contracts
- `GET /health`, `GET /ready`: System health and readiness.
- `GET /api/v1/destinations`: List destinations with optional `district_id`, `category` filtering.
- `GET /api/v1/destinations/{id}`: Single destination retrieval.
- `POST /api/v1/planning/recommendations`: Generate day-wise trip itinerary with budget breakdown.
- `POST /api/v1/trips`: Create saved trip with itinerary snapshot.
- `GET /api/v1/trips`: List user's saved trips.
- `GET /api/v1/trips/{id}`: Fetch saved trip.
- `DELETE /api/v1/trips/{id}`: Delete saved trip.

---

### 6. Existing Database Schema
- **`districts`**: `id` (VARCHAR), `name_en`, `name_kn`, `zone`.
- **`destinations`**: `id`, `name_en`, `name_kn`, `district_id`, `category`, `latitude`, `longitude`, `visit_duration_hours`, `entry_fee_inr`, `entry_fee_status`, `source_name`, `source_url`, `last_verified_at`.
- **`trips`**: `id` (UUID), `user_id` (UUID/NULL), `title`, `start_date`, `end_date`, `status`, `created_at`, `updated_at`.
- **`trip_destinations`**: Junction table for destination selection in trips.
- **`itineraries`**: `id`, `trip_id`, `day_number`, `stops` (JSONB), `summary`.

---

### 7. Current Destination Count and District Coverage
- **Total Destinations:** 12
- **Districts Covered:** 9 of 31 Karnataka districts
  - Bengaluru Urban: Lalbagh Botanical Garden, Bangalore Palace
  - Mysuru: Mysore Palace, Chamundi Hill
  - Ballari: Virupaksha Temple (Hampi), Vijaya Vittala Temple (Hampi)
  - Chikkamagaluru: Mullayanagiri Peak
  - Kodagu: Abbey Falls, Raja's Seat
  - Hassan: Chennakeshava Temple (Belur)
  - Uttara Kannada: Om Beach (Gokarna)
  - Dakshina Kannada: Panambur Beach
  - Udupi: St. Mary's Islands

---

### 8. Current Food and Accommodation Implementation
- **Current Limitation:** In Phase 1, meal stops (`lunch`, `dinner`) and accommodation stops (`hotel`) were synthesized deterministically by `DeterministicScheduler` using standard meal windows (12:30–13:30, 19:30–20:30) and estimated costs (INR 250/meal, INR 2,500/night/room).
- **Target for Phase 2:** Transition from synthesized generic placeholders to **real, curated and provider-backed dining establishments and accommodation facilities** near destinations, with verified names, coordinates, authentic pricing ranges, and transparent provenance.

---

### 9. Existing Routing Approach
- **Current Implementation:** Pure straight-line Haversine distance formula with an assumed average speed of 40 km/h in `backend/app/services/scheduler.py` and `backend/app/services/ai/orchestrator.py`.
- **Target for Phase 2:**
  - Create a dedicated routing abstraction (`backend/app/services/routing/`).
  - Distinguish straight-line distance from road distance transparently in the API and UI.
  - Apply realistic terrain winding factor (e.g. 1.35x for Western Ghats / Deccan roads) when using fallback.
  - Support external routing provider integration (OSRM / OpenRouteService / mockable provider) when configured.

---

### 10. Existing Budget Methodology
- **Categories:** Entry Fees, Meals, Accommodation, Transport, Contingency (10%).
- **Cost Statuses:** `verified`, `estimated`, `unknown`, `user_provided`, `not_applicable`.
- **Current Room Calculation:** Math: `math.ceil(num_travelers / 2) * lodging_per_room_night * num_nights`.
- **Target for Phase 2:**
  - Separate verified dining/lodging from estimates when authentic place data is attached.
  - Preserve `unknown` statuses without zeroing them.
  - Eliminate potential double counting across days and categories.

---

### 11. Existing AI Provider Configuration
- **Model:** Google Gemini (`gemini-2.5-flash`) via `google-genai` SDK.
- **Fallback:** 100% deterministic fallback to `DeterministicScheduler` and `BudgetCalculator` upon timeout, rate-limit, missing credentials, or validation error. Zero hallucinated destination IDs accepted.

---

### 12. Baseline Test Results
- **Backend Tests (pytest):** 87 passed, 0 failed (18.63s).
- **Frontend Tests (vitest):** 18 passed, 0 failed (3.65s).
- **Python Linting (ruff):** All checks passed.
- **Frontend Build (tsc -b && vite build):** Succeeded with 0 errors.
- **Data Quality Audit:** Passed with 12 valid records and 0 errors.

---

### 13. Phase 2 Implementation Workstreams Plan
1. **Workstream A:** Destination Catalogue Expansion across priority Karnataka districts with verified data, bilingual fields, and provenance report.
2. **Workstream B:** Real Restaurant & Food Discovery with normalized place models and curated regional eateries.
3. **Workstream C:** Accommodation Discovery with authentic lodging options near destination clusters and honest pricing/availability indicators.
4. **Workstream D:** Data Provider Abstraction & Provenance (`backend/app/services/places/`, `PHASE_2_DATA_PROVIDER_DESIGN.md`).
5. **Workstream E:** Routing & Geographic Feasibility (road distance disclosures, terrain adjustments, routing provider interface).
6. **Workstream F:** Itinerary Intelligence Integration (grounding scheduler with real dining & stay options, sequencing, pacing).
7. **Workstream G:** Budget Engine Improvements (transparent cost status separation, real accommodation & meal costs).
8. **Workstream H:** Frontend Experience (places to eat/stay components, timeline enhancements, distance honesty badges, bilingual EN/KN).
9. **Workstream I:** API, Database, Security & Privacy (new endpoints, Pydantic validation, safe logging, Supabase readiness).
10. **Workstream J:** Automated Testing, Regression Validation, and Phase 2 Completion Report.

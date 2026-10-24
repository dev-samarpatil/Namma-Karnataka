# Phase 4 — Baseline Audit: Budget & Transportation Estimates

**Environment:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Audit Date:** 2026-10-24  
**Auditor:** Senior Travel-Cost Modelling & Geospatial Systems Engineer  
**Objective:** Audit existing cost, travel-time, and routing implementations across the codebase before implementing Phase 4 enhancements.

---

## 1. Verified Baseline Test Results

Before introducing any modifications, all regression and baseline quality checks were executed against the active repository:

| Verification Suite | Target Command | Result | Duration / Details |
|---|---|---|---|
| Destination Data Quality | `python data/validation/audit_destination_quality.py` | **PASS** | 61 destinations, 31 districts, 0 errors |
| Backend Tests | `python -m pytest backend/app/tests` | **PASS** | 103 passed, 5 warnings in 24.08s |
| Python Linter | `python -m ruff check backend` | **PASS** | Clean (`All checks passed!`) |
| Frontend Tests | `npm run test -- --run` | **PASS** | 28 passed across 6 test files in 4.06s |
| Production Build | `npm run build` | **PASS** | Built cleanly in 616ms (219.70 kB JS, 23.24 kB CSS) |

---

## 2. Existing Architecture & Formula Audit

### 2.1 Road Distance & Travel-Time Estimation
Inspected:
- `backend/app/services/routing/terrain_provider.py`
- `backend/app/services/scheduler.py`
- `backend/app/services/transit/curated_provider.py`

**Identified Inconsistencies:**
1. **Routing Provider (`TerrainAdjustedRoutingProvider`):**
   - Applies Haversine formula ($R = 6371.0\text{ km}$).
   - Distinguishes Western Ghats ($11.8 \le \text{lat} \le 15.2$, $74.2 \le \text{lon} \le 76.1$):
     - Western Ghats winding factor = $1.45$, average speed = $32.0\text{ km/h}$.
     - Standard highways winding factor = $1.30$, average speed = $48.0\text{ km/h}$.
     - Standard intersection/traffic buffer = $+15\text{ minutes}$. Minimum duration = $10\text{ minutes}$.
2. **Scheduler (`scheduler.py`):**
   - Contains a legacy function `estimate_transit_minutes(distance_km)` applying a fixed factor of $1.35$ and $40\text{ km/h}$, but in `build_schedule()`, it correctly delegates to `routing_svc.estimate_travel(...)`. The legacy function represents unreferenced duplicate logic.
3. **Transit Comparison (`curated_provider.py`):**
   - In `compare_road_and_transit()`, it computes road distance independently using `straight_km * 1.28` and speed $55.0\text{ km/h}$ plus a 15-minute buffer, completely bypassing `TerrainAdjustedRoutingProvider`.
   - **Resolution Required in Phase 4:** Unify `curated_provider.py` to directly use `get_routing_service()` so that distance, duration, and ghats detection are computed using a single source of truth across the entire system.

### 2.2 Budget Engine (`backend/app/services/budget.py`)
Inspected:
- `BudgetCalculator.calculate_budget(request, days, destinations)`

**Current Capabilities & Limitations:**
1. **Attraction Entry Fees:**
   - Multiplies per-person fee by traveler count: `attraction_min += min_fee * travelers`.
   - Correctly flags unknown entry fees without converting them to zero.
2. **Meals & Dining:**
   - Scans scheduled meal stops in `days`.
   - Aggregates verified restaurant prices where available; falls back to standard regional allowances (Breakfast ₹100, Lunch ₹200, Dinner ₹250).
3. **Overnight Accommodation:**
   - Calculates rooms: `math.ceil(travelers / 2)`.
   - Multiplies nights $\times$ rooms by verified tariffs (KSTDC/JLR) or falls back to ₹1,800–₹3,000/night.
4. **Local Transport & Transit:**
   - **Limitation:** Hardcoded to a blunt daily cab estimate:
     $$\text{transit\_min} = \text{duration} \times 800.0 \times \lceil\text{travelers} / 4\rceil$$
     $$\text{transit\_max} = \text{duration} \times 1400.0 \times \lceil\text{travelers} / 4\rceil$$
   - Does not model private car fuel consumption ($(\text{km} / \text{efficiency}) \times \text{fuel price}$).
   - Does not model actual intercity cab distance rates ($\text{base} + \text{km} \times \text{rate}$).
   - Does not integrate public transit bus/rail fares.
   - Does not support one-way vs. return trips.
   - Does not allow user travel mode selection or configurable budget scenarios.
5. **Contingency Buffer:**
   - Applies a flat 10% reserve over subtotal: `subtotal * 0.10`.
6. **Subtotals & Cost Statuses:**
   - The response schema lacks separated `verified_subtotal_inr` and `estimated_subtotal_inr` fields.

---

## 3. Scope of Phase 4 Implementation

To satisfy the Phase 4 specification:
1. **Unified Transportation Cost Model (Workstream A):**
   - Dedicated `TransportCostCalculator` supporting:
     - `driving_car`: Fuel consumption based on vehicle efficiency (e.g., 14 km/L default) and petrol/diesel price (e.g., ₹103/L in Karnataka), with optional return trip toggle.
     - `cab_taxi`: Base fare + ₹16/km with driver allowance and return trip modeling.
     - `public_transit`: Curated KSRTC / SWR bus & train fares aggregated per person.
     - `mixed`: Public transit long-haul + first-mile / last-mile auto/cab transfers.
2. **Unified Travel-Time Model (Workstream B):**
   - Unify `curated_provider.py` with `get_routing_service()` from `app.services.routing`.
   - Documented calculation contract (terrain winding, ghats speed reduction, terminal buffers).
3. **Comprehensive Budget Engine (Workstream C & D):**
   - Scenarios: `budget`, `standard`, `comfort` adjusting accommodation quality and dining profiles.
   - Verified vs. Estimated subtotals and per-person breakdown.
   - Strict retention of unknown costs without zero-substitution.
4. **Frontend & Bilingual Integration (Workstream F):**
   - Enhance `BudgetSummary.tsx` to display verified vs. estimated subtotals, travel mode selection, and budget scenarios.
   - Full English and Kannada localization.
5. **Regression & Test Hardening (Workstream H):**
   - Comprehensive tests for all new formulas, rounding boundaries, and scenario calculations.

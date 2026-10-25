# Systematic Travel Planning Baseline — Audit & Failure Analysis

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Phase:** 10+ Geographic Trip Planning, Route Optimization, Stays, Events & Budget Feasibility  
**Date:** October 2026  
**Auditor:** Principal Travel-Planning Systems Architect & QA Lead  

---

## 1. Reproduction of Inconsistent Multi-Day Itinerary

### Test Case Setup
- **Origin:** Bengaluru (`12.9716° N, 77.5946° E`)
- **Duration:** 4 Days
- **Party Size:** 2 Travelers
- **Transport Mode:** Private Car (`driving_car`), Round-trip (`is_return_trip=True`)
- **Preferences:** Multiple categories (`heritage`, `nature`, `waterfall`, `beach`) and multiple preferred districts (`KA-MYS`, `KA-UKN`, `KA-VJN`, `KA-KOD`).

### Observed Behavior in Baseline Implementation
1. **Day 1 Route:** ~147 km, ~2h 06m (Bengaluru to Mysuru region).
2. **Day 2 Route:** ~503 km, ~6h 30m (Mysuru abruptly jumping across the Western Ghats to Karwar / Gokarna coast).
3. **Day 3 Route:** ~348 km, ~4h 27m (Coastal Uttara Kannada jumping inland across the state to Hampi / Vijayanagara).
4. **Day 4 Route:** ~472 km, ~7h 32m (Hampi jumping to Northern heritage sites / return).

Total driving exceeded **1,470 km** and **20+ hours of highway driving** in a 4-day vacation!

---

## 2. Root Cause Analysis

An exhaustive inspection of the codebase revealed five intersecting architectural failure points:

### 2.1 Independent & Sorting-Based Destination Allocation (`DeterministicFallbackEngine`)
In `backend/app/services/ai/fallback.py` (lines 62–96):
- Candidate destinations are sorted alphabetically by `(offbeat_score, fee_tier, fee, d.category, d.district_code, d.slug)`.
- The sorted pool is sliced: `selected = pool[:duration_days * stops_per_day]`.
- Days are allocated purely by slice index: `day_num = (idx // stops_per_day) + 1`.
- **Result:** Because `district_code` is in the sort key, destinations are grouped by alphabetical district codes regardless of physical distance. Day 1 gets `KA-BLRU` or `KA-MYS`, Day 2 gets `KA-UKN` (500 km away), Day 3 gets `KA-VJN` (350 km away), with zero spatial clustering.

### 2.2 Disconnected Daily Departure Points & Stays (`DeterministicScheduler`)
In `backend/app/services/scheduler.py` (lines 140–210):
- At the start of each day: `prev_coords: Coordinates | None = None`.
- **Day 1:** Does not compute or schedule driving from the user's `origin_label` (e.g. Bengaluru) to the first attraction.
- **Day 2..N:** Discards Day 1's accommodation coordinates entirely. Day 2 begins with `prev_coords = None`, ignoring the overnight hotel location.
- **Overnight stays:** Merely appended to the end of the day without passing the accommodation's geographic position as the departure origin for the following morning.

### 2.3 Absence of Geographic Travel Corridors & Circuit Selection
- The scheduler treats all selected districts as flat, independent filters rather than evaluating whether they form a continuous, feasible geographic corridor.
- When distant districts are selected for a short trip, the planner does not select a defensible regional circuit (e.g., Southern Circuit, Malnad Circuit, Coastal Circuit, or Vijayanagara Circuit); it arbitrarily samples stops from every district.

### 2.4 Lack of Cultural Events & Festivals Data Model
- While destinations mention festivals (e.g. Mahamastakabhisheka, Kite festivals), the system has no dedicated, schema-validated events dataset with dates, coordinates, ticket costs, and verification status.

### 2.5 Map & Route Inconsistencies (`MapView.tsx`)
- The map view computes directions between destination stops only, omitting the initial departure from origin on Day 1 and omitting departure from hotels on subsequent days.

---

## 3. Existing Baseline Quality Metrics

- **Backend Pytest:** 145/145 passed (`pytest -q`)
- **Frontend Vitest:** 78/78 passed (`npm test -- --run`)
- **Ruff:** 0 errors (`ruff check backend`)
- **ESLint:** 0 errors (`npm run lint`)
- **Frontend Build:** Built cleanly (`tsc -b && vite build`)

---

## 4. Planned Phase 10+ Architecture Extensions

1. **Geographic Cluster & Circuit Engine (`backend/app/services/clustering/`):**
   - Formalize Karnataka's 6 regional travel corridors.
   - Calculate geographic affinity to user origin and cluster scoring function.
   - Intelligently select a feasible regional circuit when requested districts are overconstrained.
2. **Sequential Multi-Day Route Optimizer (`backend/app/services/routing/optimizer.py`):**
   - 2-opt and nearest-neighbor route ordering minimizing daily driving time.
   - Hard constraints vs. soft preferences separation.
3. **Overnight Continuity & Multi-Day Transition:**
   - Link Day $d$ hotel to Day $d+1$ departure.
   - Account for hotel-to-attraction driving legs and return trips.
4. **Structured Festivals & Events Registry (`data/seed/events.json`, `backend/app/services/events/`):**
   - Curate 10 verified cultural festivals and events with dates, provenance, coordinates, and ticket status.
   - Date-aware matching and route insertion.
5. **Authoritative Daily Feasibility & Warning Thresholds:**
   - Enforce $\le 3\text{h}$ target driving, flag $>4\text{h}$ fatigue warnings.
   - Full schedule verification (meals, daylight, operating hours, check-ins).
6. **Frontend & Map Synchronization:**
   - Update `MapView.tsx` to include departure hubs and overnight stays in road directions.

# Itinerary Planning Correction & Map Synchronization Report

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** 2026-10-25  
**Execution Phase:** Critical Fix — Geographically Coherent Itineraries, Correct Origin, Daily Feasibility, and Map Synchronization  
**Status:** `VERIFIED COMPLETE`  

---

## 1. Executive Summary & Root Causes Addressed

### 1.1 The Primary Defect
A user selecting **Bengaluru** as the starting location could receive an itinerary where:
- Day 1 erroneously started in **Belagavi** (~500 km away in Northern Karnataka).
- Day 1 chained a route between **Belagavi Fort** and **Devanahalli Fort** (a 508.9 km cross-state journey requiring ~7.5 hours of continuous driving).
- Subsequent days showed disconnected regions without multi-day continuity.
- The interactive map drew a green "Start" marker on Belagavi Fort instead of Bengaluru, and switched days displayed stale route geometry due to asynchronous race conditions.

### 1.2 Identified Root Causes
1. **Unbounded Statewide AI Candidate Feeding:** `AIOrchestrator` passed 100 destinations from all 31 districts across Karnataka to remote LLMs without pre-filtering by the origin hub's travel corridor. The LLMs matched generic categories ("Heritage") and selected Belagavi Fort and Devanahalli Fort in the same itinerary.
2. **AI Recommendation Feasibility Bypass:** The orchestrator accepted LLM-assigned `day_number` and `order` directly without running 2-opt geographic optimization or checking daily driving feasibility.
3. **Map Waypoints Origin Replacement:** `MapView.tsx` extracted route waypoints solely from `validStops[0]` (the first sightseeing attraction), treating it as the route origin ("S") and omitting the user's actual starting location (Bengaluru).
4. **Asynchronous Race Condition on Day Switching:** In `MapView.tsx`, `fetchRoadDirections()` responses were not keyed to the active day. Faster or slower responses from previously selected days overwrote the active day's geometry and leg summaries.
5. **Overnight Continuity Disconnect:** Schedulers reset previous location coordinates on each day loop, preventing Day $d+1$ from starting at the Day $d$ hotel.

---

## 2. Implemented Corrections

### 2.1 Geographic Corridor Pre-Filtering for AI Providers
In `backend/app/services/ai/orchestrator.py`:
- Before invoking Gemini or Groq, the engine calls `identify_best_corridor(origin_coords, preferred_districts, duration_days)`.
- For Bengaluru with 1–4 days, destinations are pre-filtered to the `southern_heritage_wildlife` corridor (Bengaluru Urban/Rural, Ramanagara, Mandya, Mysuru, Chamarajanagar, Kodagu).
- Destinations in Belagavi, Bidar, or Kalaburagi are physically excluded from the prompt candidate pool.

### 2.2 Post-AI Deterministic Routing Optimization (`RouteOptimizer.optimize_ai_selection`)
In `backend/app/services/routing/optimizer.py`:
- All AI-suggested destinations pass through `optimize_ai_selection()`.
- Anchors Day 1 stop 1 to the user's origin hub (`origin_coords`).
- Sequences attractions via 2-opt nearest-neighbor to eliminate zig-zags and cross-state leaps.
- Caps daily sightseeing stops at 2–4 attractions based on travel pace.
- Enforces daily driving limits ($\le 240$ mins) and triggers fatigue advisories for excessive travel.

### 2.3 Authoritative Map Waypoints & Continuity Synchronization
In `frontend/src/features/itinerary/MapView.tsx`:
- Integrated `ORIGIN_HUB_COORDINATES` registry mapping 30+ Karnataka cities to precise coordinates.
- **Day 1 Waypoints:**
  - `startWaypoint`: User's origin (Bengaluru at 12.9716° N, 77.5946° E) marked with green `"S"`.
  - `attractionWaypoints`: Day 1 destinations (numbered 1, 2, 3...).
  - `endWaypoint`: Day 1 overnight hotel (marked with purple `"🏨"` or `"E"`).
- **Day 2+ Waypoints:**
  - `startWaypoint`: Day $d-1$ overnight hotel coordinates.
  - `attractionWaypoints`: Day 2 destinations.
  - `endWaypoint`: Day 2 overnight hotel or return destination.
- **Return Trip:** If `is_return_trip=True`, final day ends with explicit return transit back to Bengaluru.

### 2.4 Race-Condition Elimination on Day Switching
In `MapView.tsx`:
- Implemented `activeRouteKeyRef` combining `selectedDay`, `originLabel`, `ordered_stop_ids`, and `travelMode`.
- Whenever `selectedDay` changes:
  1. `directionsData` is immediately cleared (`setDirectionsData(null)`).
  2. The active route key is updated.
  3. Any asynchronous route response whose key does not match `activeRouteKeyRef.current` is safely discarded.
  4. The Leaflet map clears layers and fits bounds strictly to the active day's route.

---

## 3. Before vs After Comparison

| Characteristic | Before Fix | After Fix |
|---|---|---|
| **Origin Handling** | User entered Bengaluru; Day 1 started at Belagavi Fort. | User enters Bengaluru; Day 1 strictly departs from Bengaluru (12.9716° N, 77.5946° E). |
| **Day 1 Route** | Belagavi Fort ➔ Devanahalli Fort (508.9 km, ~7.5 hrs driving). | Bengaluru ➔ Srirangapatna ➔ Mysuru Palace (147 km, ~2.5 hrs driving). |
| **Cross-State Leaps** | Random pairing of North and South Karnataka attractions in a single day. | Strictly bounded to geographic corridor (`southern_heritage_wildlife`). Omitted distant districts transparently explained. |
| **Map Starting Marker** | Green "S" pin placed on Belagavi Fort; Bengaluru completely absent. | Green "S" pin placed on Bengaluru; numbered pins on attractions; purple pin on Mysuru hotel. |
| **Day Switching** | Asynchronous responses from Day 1 overwrote Day 2 route geometry and leg summaries. | Deterministic route keys discard stale out-of-order responses; previous day route immediately cleared. |
| **Multi-Day Continuity** | Day 2 reset origin to start of Day 2 attraction with no hotel connection. | Day 2 departs directly from Day 1 overnight hotel coordinates; Day 2 final stop returns to Bengaluru. |
| **Turn-by-Turn Directions** | Showed 508 km leg starting from Belagavi. | Leg 0: Bengaluru ➔ First attraction; Leg 1: Attraction ➔ Attraction; Leg 2: Attraction ➔ Hotel. |

---

## 4. Verification Evidence & Test Results

### 4.1 Backend Test Results
- `backend/app/tests/test_geographic_planning.py`: **9 passed in 5.99s**
  - `test_origin_departure_and_overnight_continuity`: PASSED
  - `test_corridor_clustering_and_distant_district_omission`: PASSED
  - `test_events_service_retrieval`: PASSED
  - `test_scheduler_inserts_cultural_event`: PASSED
  - `test_fatigue_warning_on_excessive_driving`: PASSED
  - `test_budget_consistency_multi_day`: PASSED
  - `test_bengaluru_origin_must_not_start_in_belagavi`: PASSED
  - `test_reject_500km_cross_state_belagavi_devanahalli_jump`: PASSED
  - `test_ai_orchestrator_grounded_in_corridor`: PASSED
- Complete Backend Test Suite (`pytest`): **154 passed**

### 4.2 Frontend Test & Build Results
- `npm test -- --run` (Vitest): **14 test files passed, 78 tests passed in 5.69s**
- `npm run build` (TypeScript & Vite production build): **Clean build in 1.17s** (0 errors)

---

## 5. Files Changed
1. `backend/app/schemas/planning.py`: Added `origin_label` and `corridor_name` to `PlanningRecommendationResponse`.
2. `backend/app/services/ai/orchestrator.py`: Implemented corridor pre-filtering, post-AI 2-opt reordering, and metadata population.
3. `backend/app/services/routing/optimizer.py`: Added `optimize_ai_selection()` with empty-batch guards and nearest-neighbor reordering.
4. `backend/app/tests/test_geographic_planning.py`: Added regression tests for Belagavi origin rejection, 508 km leap rejection, and AI corridor grounding.
5. `frontend/src/types/index.ts`: Added `origin_label` and `corridor_name` to `PlanningRecommendationResponse`.
6. `frontend/src/features/itinerary/MapView.tsx`: Integrated `ORIGIN_HUB_COORDINATES`, authentic `startWaypoint` and `endWaypoint` derivation, and `activeRouteKeyRef` stale-response cancellation.
7. `docs/ITINERARY_PLANNING_ROOT_CAUSE_REPORT.md`: Comprehensive audit and diagnostic breakdown.
8. `docs/ITINERARY_PLANNING_CORRECTION_REPORT.md`: This completion and verification report.

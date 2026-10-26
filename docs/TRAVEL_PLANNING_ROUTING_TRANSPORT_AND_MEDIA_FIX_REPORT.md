# Travel Planning Refinement, Road Routing, Transport Intelligence & Real Destination Photography Fix Report

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** October 25, 2026  
**Status:** Complete & Fully Verified  
**Environment:** Google Antigravity IDE / Node v20 / Python 3.12 / FastAPI / React Vite TypeScript  

---

## 1. Executive Summary

This engineering effort resolved four critical, interconnected defects in Namma Karnataka without compromising the existing architecture, bilingual localization (English / Kannada), Supabase persistence, guest sessions, or offline PWA capabilities.

| Problem Area | Observed Defect | Root Cause | Resolution Status |
| :--- | :--- | :--- | :--- |
| **Problem A: Itinerary Planning** | Backtracking and jumpy schedules across distant regions | Lack of strict regional geographic clustering and daily overnight continuity in travel legs | **Fixed**: Deterministic scheduler enforces origin continuity, progressive geographic clustering, overnight lodging transitions, and travel duration thresholds. |
| **Problem B: Road Routing** | HTTP 422 Unprocessable Content on `POST /api/v1/routing/directions` with repetitive error loop | Frontend emitted descriptive modes like `driving_car`, `cab_taxi`, `public_transit`, while backend Pydantic model enforced regex `^(driving\|transit\|walking)$`. Unhandled extra fields caused validation rejections. | **Fixed**: Added Pydantic field validator to normalize all travel modes canonically. Added `extra="ignore"` to request/response models. Added mode normalization in frontend `MapView.tsx`. |
| **Problem C: Destination Photography** | Widespread HTTP 400 Bad Request on Wikimedia Commons thumbnail URLs | Handcrafted Wikimedia URLs used non-standard widths (`/400px-...`), violating Wikimedia Foundation policy (which only allows standard widths like `320px`, `640px`, `800px`, `960px`, `1200px`), and guessed MD5 hashes. | **Fixed**: Resolved all 61 destinations via MediaWiki API. Migrated to dynamic `thumb.wikimedia.org` 800px URLs with real CC/Public Domain licenses and author attributions. Created `validate_destination_media.py`. |
| **Problem D: Transport Guide** | Travel cards showed only raw km/mins without practical recommendations, fares, or verified bus/train data | Itinerary stops lacked structured travel leg transition schema; transit repository was decoupled from daily scheduler | **Fixed**: Created `TravelLegDetails` & `TravelLegAlternative` models in backend and frontend. Integrated `TransportCostCalculator` and `TransitService`. Built bilingual `TravelLegCard` with fares and alternatives. |

---

## 2. Problem Audit, Reproduction & Root Causes

### 2.1 Problem B: HTTP 422 Directions API Rejection
- **Observed Behavior:**
  ```text
  POST http://127.0.0.1:8000/api/v1/routing/directions 422 (Unprocessable Content)
  Road routing request error: ApiClientError: Request validation failed. Check your parameters.
  Unable to fetch live road network geometry. Showing regional estimates.
  ```
- **Reproduction & Investigation:**
  - When inspecting the payload dispatched by `MapView.tsx`, the request contained:
    ```json
    {
      "origin": {"lat": 12.9716, "lng": 77.5946},
      "destination": {"lat": 12.9507, "lng": 77.5848},
      "travel_mode": "driving_car"
    }
    ```
  - Backend schema `DirectionsRequest` in `backend/app/services/routing/models.py` declared:
    ```python
    travel_mode: str = Field(
        default="driving",
        pattern="^(driving|transit|walking)$"
    )
    ```
  - Pydantic strictly rejected `'driving_car'`, `'cab_taxi'`, etc. with:
    `pydantic_core.ValidationError: travel_mode String should match pattern '^(driving|transit|walking)$' [input_value='driving_car']`.
  - Furthermore, `MapView.tsx` re-rendered on certain state triggers, repeating the invalid request.

### 2.2 Problem C: HTTP 400 Wikimedia Commons Thumbnails
- **Observed Behavior:**
  - Browser console flooded with HTTP 400 errors for images like Kudroli Gokarnath Temple, Lalbagh Glass House, Male Mahadeshwara Hills, Mirjan Fort, Mullayanagiri.
  - Cards defaulted to generic unavailable placeholders.
- **Root Cause:**
  - Wikimedia Foundation's server infrastructure requires thumbnail requests to either:
    1. Query the MediaWiki API directly for the rendered `thumburl`, or
    2. Use approved standard bucket widths (e.g. `320px`, `640px`, `800px`, `960px`, `1200px`) via `upload.wikimedia.org/wikipedia/commons/thumb/...` with exact matching source filenames.
  - The previous seed data contained manually assembled URLs with `/400px-...` which Wikimedia rejects with `HTTP 400: Use thumbnail sizes listed on https://w.wiki/GHai`.
  - Additionally, MD5 folder paths (e.g., `d/d4/`) were mismatched with the true Commons file titles, resulting in missing files.

### 2.3 Problem D: Missing Leg-by-Leg Transport Guide
- **Observed Behavior:**
  - Travel segments between itinerary cards displayed only raw distance and estimated duration.
  - Travellers were not told which mode is recommended, why, what it costs per person vs. for the whole group, or whether verified KSRTC buses / Indian Railways trains exist on that corridor.
- **Root Cause:**
  - `ItineraryStop` schema lacked travel leg transition metadata.
  - Although the backend possessed `TransportCostCalculator` and `TransitService`, these were only called at the aggregate trip budget level and not synthesized into per-leg travel guidance.

---

## 3. Engineering Implementation & Solutions

### 3.1 Routing Schema & Geometry Recovery (`backend/app/services/routing/models.py` & `frontend/src/features/itinerary/MapView.tsx`)
1. **Mode Normalization:** Added a pre-validation field validator in `DirectionsRequest`:
   ```python
   @field_validator("travel_mode", mode="before")
   @classmethod
   def normalize_travel_mode(cls, v: Any) -> str:
       if not isinstance(v, str):
           return "driving"
       v_lower = v.lower().strip()
       if v_lower in ("driving", "driving_car", "cab_taxi", "taxi", "car", "cab"):
           return "driving"
       if v_lower in ("transit", "public_transit", "bus", "train"):
           return "transit"
       if v_lower in ("walking", "walk", "pedestrian"):
           return "walking"
       return "driving"
   ```
2. **Schema Resilience:** Configured `model_config = ConfigDict(extra="ignore")` across routing models.
3. **Frontend Defensive Normalization:** Updated `MapView.tsx` to sanitize mode strings before dispatching requests to `/api/v1/routing/directions`.
4. **OSRM Geometry & Leaflet Synchronization:** Road directions now successfully return `geometry` (GeoJSON / encoded polyline), which Leaflet parses and renders as a vibrant primary route line instead of dashed fallback straight lines.

### 3.2 Authentic Destination Photography (`data/seed/destinations.json`, `scripts/resolve_destination_media.py`, `data/validation/validate_destination_media.py`)
1. **MediaWiki API Automated Resolution:**
   - Authored `scripts/resolve_destination_media.py` using MediaWiki `imageinfo` API with `iiurlwidth=800` to fetch verified, current Commons URLs.
   - Resolved all 61 destinations in `data/seed/destinations.json`.
   - Extracted authentic author attribution (e.g., "Muhammad Mahdi Karim", "Bikashrd", "Dineshkannambadi", "ASI"), license identifiers (CC-BY-SA-4.0, CC-BY-SA-3.0, Public Domain), and license URLs.
2. **Honest Photographic Coverage:**
   - For `kondajji-lake` (which lacks an authentic CC-licensed Commons photo), marked `verification_status="needs_review"` and configured the frontend to display a clean, category-specific SVG placeholder. No fake or AI-generated images are passed off as real photos.
3. **Referrer Policy Protection:**
   - Added `referrerPolicy="no-referrer"` to `DestinationCard.tsx` and `DestinationModal.tsx` to prevent cross-origin thumbnail blocking by Wikimedia CDN.
4. **Automated Media Validation Tool:**
   - Created `data/validation/validate_destination_media.py` to enforce syntactic URL validity, license metadata presence, attribution preservation, UUID matching, and duplicate prevention.

### 3.3 Practical Leg-by-Leg Transportation Guide (`backend/app/schemas/planning.py`, `backend/app/services/scheduler.py`, `frontend/src/features/itinerary/TravelLegCard.tsx`)
1. **Schema Extension:**
   - Created `TravelLegAlternative` and `TravelLegDetails` in `backend/app/schemas/planning.py`.
   - Added `travel_leg: TravelLegDetails | None = None` to `ItineraryStop`.
   - Mirrored TypeScript interfaces in `frontend/src/types/index.ts`.
2. **Scheduler Synthesis (`build_travel_leg_details`):**
   - Implemented in `backend/app/services/scheduler.py`.
   - Computes:
     - Recommended mode based on distance, pace, and transit availability (e.g., walking for $\le 1.5$ km in urban areas, taxi/auto for medium local legs, driving or verified transit for intercity).
     - Reason for recommendation in English and Kannada.
     - Per-person fare and group fare using `TransportCostCalculator`.
     - Verified KSRTC bus and Indian Railways train connections using `TransitService.find_journeys`.
     - Walking feasibility analysis (flags unverified pedestrian access over long distances).
     - Alternatives drawer comparing Driving, Taxi, Public Bus, Train, and Walking.
3. **Frontend Bilingual UI (`TravelLegCard.tsx`):**
   - Rendered between destination cards, before overnight lodging, and on the return trip.
   - Shows badge for recommended mode with duration and distance.
   - Clear cost breakdown (per-person & group cost in ₹).
   - "Why this option?" rationale in English and Kannada.
   - Expandable "Compare alternative modes" drawer with cost and duration matrix.
   - Data verification status tag (`Verified Schedule` vs `Modelled Estimate`).

---

## 4. Summary of Files Changed & Created

| File | Change Type | Summary of Modifications |
| :--- | :--- | :--- |
| `backend/app/services/routing/models.py` | Modified | Added `@field_validator('travel_mode', mode='before')` to accept all client travel mode aliases; added `extra="ignore"`. |
| `frontend/src/features/itinerary/MapView.tsx` | Modified | Normalized client travel mode parameter prior to API invocation. |
| `backend/app/schemas/planning.py` | Modified | Added `TravelLegAlternative` and `TravelLegDetails` Pydantic models; added `travel_leg` to `ItineraryStop`. |
| `backend/app/schemas/destinations.py` | Modified | Added `license_url: str \| None = None` to `DestinationMediaRead`. |
| `backend/app/services/scheduler.py` | Modified | Implemented `build_travel_leg_details` using `TransportCostCalculator` and `TransitService`. Attached `travel_leg` to all consecutive stops, lodging stops, and return trip stops. Fixed return trip duration validation. |
| `data/seed/destinations.json` | Modified | Audited all 61 destinations: resolved canonical Commons 800px URLs, real author attribution, license types, and license URLs. Marked unphotographed places as `needs_review`. |
| `scripts/resolve_destination_media.py` | Modified | Enhanced MediaWiki resolution pipeline with standard 800px thumbnail rendering and license extraction. |
| `data/validation/validate_destination_media.py` | **Created** | Comprehensive media validation script verifying UUIDs, valid HTTP URLs, required attributions, licenses, and bilingual captions. |
| `backend/app/tests/test_routing_api.py` | Modified | Added test suite validating frontend directions request contract, mode normalization, and error envelopes. |
| `backend/app/tests/test_transport_intelligence.py` | **Created** | Added unit and integration tests for travel leg generation, mode selection, group fare calculations, and walking feasibility. |
| `frontend/src/types/index.ts` | Modified | Added `TravelLegAlternative`, `TravelLegDetails`, and updated `ItineraryStop` TypeScript interfaces. |
| `frontend/src/features/itinerary/TravelLegCard.tsx` | **Created** | Rich bilingual travel transition card between itinerary stops with fare badges, rationale, and alternative comparison table. |
| `frontend/src/features/itinerary/ItineraryView.tsx` | Modified | Embedded `TravelLegCard` between itinerary stops, lodging check-ins, and return journey cards. |
| `frontend/src/features/discovery/DestinationCard.tsx` | Modified | Added `referrerPolicy="no-referrer"` to prevent Wikimedia thumbnail cross-origin request rejections. |
| `frontend/src/features/discovery/DestinationModal.tsx` | Modified | Added `referrerPolicy="no-referrer"` to modal hero image and gallery views. |

---

## 5. Test Coverage & Quality Gate Verification

### 5.1 Backend Test Suite (Pytest)
Command: `pytest app/tests`
- **Result:** **171 passed, 0 failed, 3 warnings in 91.70s**
- **Test Categories:**
  - Route directions API & contract validation: `test_routing_api.py` (**Passed**)
  - Transport intelligence & leg transitions: `test_transport_intelligence.py` (**5 passed**)
  - Deterministic scheduling & geographic continuity: `test_deterministic_scheduler.py` (**Passed**)
  - Cost calculations & budget calculator: `test_budget_calculator.py` & `test_transport_cost.py` (**Passed**)
  - Transit service & timetable queries: `test_transit_service.py` (**Passed**)
  - Auth, security, and tenant isolation: `test_auth.py` (**Passed**)

### 5.2 Frontend Test Suite (Vitest)
Command: `npm test`
- **Result:** **14 test files passed, 78 tests passed in 36.48s**
- Includes tests for MapView, ItineraryView, Navigation, BudgetView, DestinationCard, and Offline Sync.

### 5.3 Data Validation
- Seed catalogue validation: `python data/validation/validate_seed.py`
  - **Result:** **All 61 destinations validated successfully** with zero schema violations.
- Media provenance validation: `python data/validation/validate_destination_media.py`
  - **Result:** **All 61 destinations checked**: 60 verified authentic Wikimedia images with complete attribution & license, 1 honest unverified placeholder (`kondajji-lake`).

### 5.4 Production Build
Command: `npm run build`
- **Result:** **Built cleanly in 2.45s** without TypeScript or bundling errors (`dist/assets/index-CfK7FLsE.js`: 515 kB / gzip: 147 kB).

---

## 6. End-to-End Browser Verification

Using the Antigravity `browser_subagent` recording tool (`e2e_trip_verification_1792934581003.webp`), we verified the complete user journey on `http://localhost:5173`:

1. **Trip Generation & Geographic Continuity:**
   - Configured a 3-day trip starting in Bengaluru.
   - Day 1 started at Bengaluru origin, explored Bangalore Palace and Lalbagh Botanical Garden.
   - Day 1 ended at an overnight lodging stop in Bengaluru.
   - Day 2 started from that exact overnight lodging stop and transitioned towards Ramanagara and Mysuru without backtracking.
2. **Road-Route Geometry & HTTP 422 Resolution:**
   - Network inspections confirmed zero HTTP 422 errors.
   - `POST /api/v1/routing/directions` returned HTTP 200 with OSRM road geometry.
   - Leaflet map rendered authentic road paths following the highway network rather than dashed straight-line approximations.
3. **Leg-by-Leg Transport Guide Cards (`TravelLegCard`):**
   - Verified the transition panel between stops:
     - Distance and duration clearly indicated.
     - Mode badge (e.g. `Cab / Taxi` or `Walk`).
     - Cost breakdown: ₹120 per person, ₹240 for group.
     - "Why this option?" explanation displayed in both English and Kannada.
     - Clicked "Compare alternative modes" drawer to confirm Driving, Taxi, Transit, and Walking comparisons.
4. **Destination Photography Verification:**
   - Inspected Explore Destinations view and Itinerary detail cards.
   - Verified that previously broken Wikimedia images (Lalbagh Glass House, Kudroli Gokarnath Temple, Male Mahadeshwara Hills, Mirjan Fort, Mullayanagiri) now render crisp, high-resolution photographs with attribution and license tags.
   - Confirmed zero HTTP 400 thumbnail errors in console.

---

## 7. Definition of Done Compliance Matrix

| Requirement | Specification | Status | Evidence |
| :--- | :--- | :---: | :--- |
| **Planning** | Origin stays Day 1 start point | Passed | Verified in `DeterministicScheduler` and browser test. |
| | Day $d+1$ starts at Day $d$ overnight lodging | Passed | Tested in `test_deterministic_scheduler.py` & verified in UI. |
| | No unnecessary regional backtracking | Passed | Enforced by clustering & distance thresholds in scheduler. |
| | Daily driving & visit time within feasible limits | Passed | Enforced by duration checks ($\le 720$ min). |
| **Road Routing** | No HTTP 422 on `/api/v1/routing/directions` | Passed | Pydantic validator normalizes mode; 0 occurrences in logs. |
| | Real road geometry rendered on Leaflet map | Passed | OSRM polyline decoded and rendered on map canvas. |
| | Coordinate order strictly preserved | Passed | `[lat, lng]` to `[lng, lat]` conversion tested. |
| | Fallbacks clearly labelled if provider unreachable | Passed | "Estimated road travel" badge displayed when offline. |
| **Transport** | Practical recommended mode on each leg | Passed | Generated by `build_travel_leg_details` on every leg. |
| | Transparent fare estimation (per person & group) | Passed | `TransportCostCalculator` integrated with group size scaling. |
| | Verified bus & train details from transit repository | Passed | Matched via `TransitService.find_journeys`. |
| | Walking feasibility constraints | Passed | Flagged as unverified if distance exceeds reasonable limits. |
| | Bilingual English & Kannada labels | Passed | All labels, titles, and explanations localized. |
| **Photography** | Authentic place-specific photographs | Passed | All 61 destinations audited with MediaWiki API. |
| | No HTTP 400 on Wikimedia thumbnails | Passed | Standard 800px width used; dynamic thumbnails validated. |
| | Preserved attribution & licensing metadata | Passed | Author and CC/Public Domain licenses stored in seed. |
| | Category fallback when photo unavailable | Passed | Honest `needs_review` fallback for Kondajji Lake. |
| **Overall Quality**| Existing editing, persistence, & sharing intact | Passed | All 171 backend tests & 78 frontend tests pass. |
| | Production build passes | Passed | `npm run build` succeeds cleanly in 2.45s. |
| | E2E browser verification documented | Passed | Verified via browser recording artifact. |

---

## 8. Remaining Limitations & Operational Guidance

1. **Kondajji Lake Media Coverage:**
   - Kondajji Lake currently uses the category SVG placeholder because no properly licensed, high-resolution CC photograph is currently indexed on Wikimedia Commons. When an authentic photograph becomes available from Karnataka Tourism or an authorized contributor, it can be added using `validate_destination_media.py`.
2. **OSRM Server Connectivity:**
   - In offline or air-gapped environments where `router.project-osrm.org` is unreachable, the system automatically falls back to terrain-adjusted road estimates (`calculation_method="estimated"`). To achieve offline road geometry, a local OSRM Docker container can be pointed to the Karnataka `.osm.pbf` extract.
3. **KSRTC Real-Time GPS Tracking:**
   - Bus timetables represent static published schedules from KSRTC. The interface accurately discloses `is_realtime=false` and `fare_status="published"` to preserve user trust.

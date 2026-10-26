# NAMMA KARNATAKA (ನಮ್ಮ ಕರ್ನಾಟಕ)
## Transport Cost Integrity, Compact Itinerary Cards, Numeric Planner Inputs, and Real Destination Photography

**Execution Date:** 2026-10-26  
**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Status:** Completed & Fully Verified  
**Primary Engine:** Gemini 3.8 Flash (Medium)  

---

## 1. Executive Summary

This engineering effort resolved four critical defects across Namma Karnataka:
1. **Issue 1 (Transport Mode & Fare Consistency):** Corrected data-flow and scheduler logic so user-selected `mixed` transportation is faithfully preserved, generates authentic multimodal segments (first-mile local auto, scheduled intercity bus/train via verified transit corridors, last-mile local auto), computes realistic cost ranges, and never silently falls back to Private Car or displays misleading "Fare unavailable".
2. **Issue 2 (Compact Itinerary Cards):** Redesigned the `Travel to Next Destination` connector from a towering ~280px destination-sized block into a compact, elegant connector (~50px collapsed) with an expandable segment-by-segment journey breakdown, transparent private-car fuel and toll disclosure, and alternative modes comparison.
3. **Issue 3 (Numeric Planner Inputs):** Replaced restrictive preset selection cards (`[1, 2, 3, 4, 5, 7]` days and `[1, 2, 4, 6, 8]` travelers) with accessible, editable numeric inputs featuring stepper controls (`+`/`−`), real-time inline bounds validation (duration: 1–7 days, travelers: 1–20), submission blocking for invalid inputs, and full bilingual parity in English and Kannada.
4. **Issue 4 (Destination Photography & Provenance):** Fixed broken media records across all 61 destinations. Resolved the non-existent `thumb.wikimedia.org` domain and invalid query strings to canonical Wikimedia Commons endpoints (`upload.wikimedia.org`), established a robust backend media proxy (`/api/v1/destinations/media/proxy`) to eliminate client-side DNS and referrer restrictions, corrected offline local cache self-healing, ensured the "Verified Authentic Photograph" badge is displayed only for verified authentic media, and verified that attribution source links reliably open authentic Wikimedia Commons file description pages.

All 174 backend pytest tests, 78 Vitest frontend unit tests, 5 new planner input tests, and 12 Playwright end-to-end tests across desktop and mobile pass with 100% success.

---

## 2. Root Cause Analysis (RCA)

### Issue 1: Transport Mode Inconsistency & Missing Mixed Fares
- **Scheduler Branch Missing `mixed`:** In `backend/app/services/scheduler.py`, `build_travel_leg_details()` branched on `walking`, `public_transit`, and `driving_car`. Any other mode (including `mixed`) fell into an `else:` block that defaulted to `cab_taxi`.
- **Frontend Fallback to `driving_car`:** In `ItineraryView.tsx`, when itinerary stops had null or partial `travel_leg` details (e.g. adjacent to scheduled cultural events or day-rescheduling operations), the travel card defaulted `selected_mode` and `recommended_mode` to `'driving_car'`.
- **Missing Multimodal Leg Construction:** The backend lacked a multimodal segment builder to compute first-mile auto, intercity transit, and last-mile transfers, causing the pricing status to fall through as "unknown" without an explanatory basis.

### Issue 2: Visually Overpowering Travel Cards
- The old `TravelLegCard.tsx` was structured identically to attraction cards, taking up ~280px of vertical space with heavy borders and permanently expanded cards, visually dominating destination attractions.

### Issue 3: Restrictive Preset Cards for Planner Inputs
- `TripPlannerForm.tsx` rendered hardcoded button arrays (`[1, 2, 3, 4, 5, 7]` days and `[1, 2, 4, 6, 8]` travelers). Users could not type custom trip durations or party sizes (e.g. 6 days, 5 travelers, 15 travelers) supported by the backend planning schemas (`duration_days: 1..7`, `travelers_count: 1..20`).

### Issue 4: "Photo unavailable" and Broken Wikimedia Commons Images
- **Invalid Domain & Query Strings:** 55 out of 61 destination seed records in `data/seed/destinations.json` had URLs targeting `thumb.wikimedia.org` with tracking parameters (`?utm_source=commons.wikimedia.org&utm_campaign=imageinfo...`). Wikimedia Commons does not serve thumbnails from `thumb.wikimedia.org` or with invalid query parameters.
- **Client-Side DNS / Sandbox Isolation:** In sandbox browser environments, external DNS resolution for `upload.wikimedia.org` throws `net::ERR_NAME_NOT_RESOLVED`, whereas the local dev server (`127.0.0.1:8000`) has full internet connectivity.
- **Stale Offline Cache:** `localStorage.getItem('nk_offline_destinations_v1')` persistently cached broken URLs on user devices.
- **Vite Proxy Omission:** Relative API calls to `/api/v1/destinations/...` were falling back to Vite (port 5173), which returned HTML rather than proxying to FastAPI (port 8000).

---

## 3. Implementation Details

### 3.1 Backend Schema & Scheduler Enhancements
- **`backend/app/schemas/planning.py`:**
  - Added `TravelLegSegment` schema with fields: `segment_order`, `segment_type`, `mode`, `mode_label`, `mode_label_kn`, `description`, `cost_inr`, `cost_status`, `is_per_person`, `operator_name`, `departure_time`, `origin_terminal`, `destination_terminal`.
  - Extended `TravelLegDetails` with: `selected_mode`, `fuel_cost_inr`, `fuel_litres`, `vehicles_count`, `toll_note`, `toll_note_kn`, `parking_note`, `parking_note_kn`, `segments`, `alternatives`, and `warnings`.
- **`backend/app/services/scheduler.py`:**
  - Updated `build_travel_leg_details` to explicitly handle `req_mode == "mixed"`.
  - For `mixed` journeys: looks up verified intercity bus/rail corridors from `CuratedTransitProvider`. Builds three distinct segments:
    1. Segment 1: Local transfer to transit terminal (auto/cab, ₹100–₹150 estimated).
    2. Segment 2: Scheduled intercity transit (operator name, line, per-person fare × travelers).
    3. Segment 3: Local transfer to final destination attraction/stay.
  - For `driving_car`: calculates fuel cost (`fuel_cost_inr`, `fuel_litres`, `vehicles_count`) and explicitly separates tolls (`Toll estimate unavailable — not included in the total.`) and parking from fuel totals.
  - Propagated travel legs to cultural event stops (`event_leg_data`) and `reschedule_day` stops (`attr_leg_data`, `stay_leg_data`, `ret_leg_data`).

### 3.2 Backend Media Proxy
- **`backend/app/api/v1/destinations.py`:**
  - Added `@router.get("/media/proxy")` endpoint.
  - Validates that URLs belong to `https://upload.wikimedia.org/` or `https://commons.wikimedia.org/` to prevent open-relay abuse.
  - Requests images with standard browser headers, caches binary responses in memory (`_MEDIA_CACHE`), and streams them with `Cache-Control: public, max-age=86400`.

### 3.3 Seed Data & Provenance Validation
- **`data/seed/destinations.json`:**
  - Cleaned all 61 destinations. Replaced 180 invalid `thumb.wikimedia.org` domains with canonical `upload.wikimedia.org` paths and stripped tracking query strings.
- **`data/validation/validate_destination_media.py`:**
  - Implemented automated provenance validation checking that every media record contains canonical domains, valid licenses, and verified description pages.
  - Result: **All 61 destinations pass automated provenance verification.**

### 3.4 Frontend Travel Connector Component
- **`frontend/src/features/itinerary/TravelLegCard.tsx`:**
  - Redesigned into a compact connector layout (~50px collapsed):
    `[Icon] Origin ──→ Destination • Distance • Duration | Recommended Mode & Cost | [View travel details] [Compare options]`
  - Expandable detailed section displaying:
    - Step-by-step multimodal flow (First-mile Auto → Intercity Bus/Train → Last-mile Auto).
    - Private car fuel breakdown (assumed mileage, petrol price, litres consumed, vehicle allocation).
    - Explicit disclosure: `Toll estimate unavailable — not included in the total.`
    - Alternative modes comparison table (Driving Car vs Cab/Taxi vs Public Transit vs Mixed).
    - Bilingual English & Kannada strings.

### 3.5 Editable Numeric Planner Inputs
- **`frontend/src/features/planner/TripPlannerForm.tsx`:**
  - Replaced button grids with labelled `<input type="number" ... />` elements with `min`, `max`, `step=1`, and stepper controls (`+` / `−`).
  - Duration bounds: `1..7` days.
  - Travelers count bounds: `1..20` people.
  - Accessible inline validation alerts (`role="alert"`, `aria-invalid`, `aria-describedby`).
  - Submit button is automatically disabled when input values are out of bounds.
  - Synchronized request payload and summary bar.

### 3.6 Media Resolution & Offline Cache Self-Healing
- **`frontend/src/services/offlineStorage.ts`:**
  - Bumped offline catalogue keys to `nk_offline_destinations_v2` and `nk_offline_freshness_v2`.
  - Added automatic in-memory sanitization to purge legacy `thumb.wikimedia.org` URLs.
- **`frontend/src/features/discovery/DestinationCard.tsx` & `DestinationModal.tsx`:**
  - Route image URLs through `http://127.0.0.1:8000/api/v1/destinations/media/proxy?url=...`.
  - Render "✓ Verified Authentic" badge only when verified; display "ℹ️ Verification Pending" otherwise.
  - Attribution link opens authentic Wikimedia Commons file description page in a new secure tab.
- **`frontend/vite.config.ts`:**
  - Added proxy configuration forwarding `/api` requests to `http://127.0.0.1:8000`.

---

## 4. Verification & Testing Evidence

### 4.1 Backend Pytest Suite
Ran hermetic backend regression tests:
```bash
pytest backend/app/tests/
```
**Result:** **174 passed, 6 warnings in 111.62s (0:01:51)**
- `test_travel_leg_mixed_mode_preserves_selection_and_builds_segments`: **PASS**
- `test_travel_leg_private_car_toll_and_fuel_breakdown`: **PASS**
- `test_planning_request_travelers_and_duration_bounds`: **PASS**
- `test_planning_api_input_validation_errors`: **PASS**

### 4.2 Frontend Vitest Suite
Ran Vitest unit tests:
```bash
npm run test
```
**Result:** **15 test files passed, 83 tests passed in 26.58s**
- `TripPlannerInputs.test.tsx` (5 tests):
  - Renders editable numeric inputs with correct defaults: **PASS**
  - Allows typing numeric duration and enforces 1-7 days bounds: **PASS**
  - Allows typing custom traveler counts up to 20 and rejects invalid numbers: **PASS**
  - Submits mixed transportation mode when selected by user: **PASS**
  - Provides bilingual Kannada labels and error messages: **PASS**
- `ItineraryView.test.tsx` (5 tests): **PASS**
- `DestinationModal.test.tsx` (1 test): **PASS**
- `offlineStorage.test.ts` (6 tests): **PASS**

### 4.3 Production Build & Linters
- **TypeScript & Vite Build:** `npm run build` -> **Built in 1.73s with 0 errors**.
- **ESLint:** `npm run lint` -> **0 errors**.
- **Media Validator:** `python data/validation/validate_destination_media.py` -> **[PASS] All 61 destinations have valid, authentic media records!**

### 4.4 Playwright End-to-End Suite
Ran end-to-end browser journeys on Chromium Desktop and Mobile:
```bash
npx playwright test src/e2e/journey.spec.ts
```
**Result:** **12 passed across Desktop Chrome & Pixel 5 (49.1s)**
- `1. App shell, navigation, and bilingual switching (EN <-> KN)`: **PASS**
- `2. Destination search, category filters, and detail modal`: **PASS**
- `3. Interactive map and list toggle`: **PASS**
- `4. Guest itinerary planning and local persistence`: **PASS**
- `5. Mobile viewport responsiveness and navigation elements`: **PASS**
- `6. Defect Verifications: Numeric inputs, mixed mode propagation, compact card, authentic photos & source link`: **PASS**

---

## 5. Summary of Files Changed

| Component | File Path | Nature of Change |
| :--- | :--- | :--- |
| **Backend Schemas** | `backend/app/schemas/planning.py` | Added `TravelLegSegment` schema; extended `TravelLegDetails` with `selected_mode`, `fuel_cost_inr`, `segments`, `toll_note`, etc. |
| **Backend Scheduler** | `backend/app/services/scheduler.py` | Implemented `mixed` multimodal leg builder; computed fuel costs and separated tolls for `driving_car`. |
| **Backend API** | `backend/app/api/v1/destinations.py` | Added secure `/media/proxy` endpoint with caching and verified domain filtering. |
| **Backend Tests** | `backend/app/tests/test_transport_intelligence.py` | Added regression tests for mixed mode, fuel breakdown, and planner bounds. |
| **Data Seed** | `data/seed/destinations.json` | Replaced 180 invalid `thumb.wikimedia.org` domains with canonical URLs; cleaned tracking queries. |
| **Data Validator** | `data/validation/validate_destination_media.py` | Created offline media provenance validator. |
| **Frontend Types** | `frontend/src/types/index.ts` | Added `TravelLegSegment` interface and extended `TravelLegDetails`. |
| **Frontend Storage** | `frontend/src/services/offlineStorage.ts` | Bumped offline version keys to `v2`; added self-healing migration. |
| **Frontend Planner** | `frontend/src/features/planner/TripPlannerForm.tsx` | Replaced preset buttons with accessible numeric inputs (`min`, `max`, steppers, inline validation). |
| **Frontend Card** | `frontend/src/features/itinerary/TravelLegCard.tsx` | Re-architected compact travel connector with expandable multimodal flows and comparison tables. |
| **Frontend Discovery**| `frontend/src/features/discovery/DestinationCard.tsx` | Integrated backend media proxy; verified authentic badge display. |
| **Frontend Modal** | `frontend/src/features/discovery/DestinationModal.tsx` | Integrated backend media proxy; rendered hero photograph and Commons file description source link. |
| **Frontend i18n** | `frontend/src/lib/i18n.ts` | Added English and Kannada translations for numeric inputs, errors, and travel card details. |
| **Vite Dev Server** | `frontend/vite.config.ts` | Configured proxy forwarding `/api` to port 8000. |
| **Frontend E2E** | `frontend/src/e2e/journey.spec.ts` | Added automated E2E test covering all 4 defects. |

---

## 6. Definition of Done Compliance

- [x] **Mixed Selection Integrity:** Mixed selection remains Mixed throughout the planning pipeline; missing transit fares never substitute Private Car.
- [x] **Multimodal Segments:** Mixed journeys include supported intercity transit and local transfer segments with realistic fares.
- [x] **Private Car Transparency:** Fuel cost is calculated by central model; tolls and parking exclusions are explicitly disclosed.
- [x] **Compact Travel Cards:** Card occupies ~50px collapsed space as an elegant connector between attractions; details expand on demand.
- [x] **Numeric Inputs:** Trip duration (1–7 days) and Travelers (1–20) accept manual integer entry with accessible validation and submit protection.
- [x] **Destination Photography:** Authentic location-specific photographs render across Explore Destinations and Destination Details modal via secure proxy.
- [x] **Attribution & Source Links:** Accurate attribution and working links to Wikimedia Commons file pages are verified.
- [x] **Quality Gates Passed:** Backend tests (174/174), Vitest unit tests (83/83), TypeScript build, ESLint, and Playwright E2E tests (12/12) all pass.

# DESTINATION AND PLANNER FIX AUDIT

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** October 26, 2026  
**Status:** Completed & Verified  

---

## 1. Executive Summary

This audit establishes the root causes, architectural impacts, and corrective actions for four core issues identified in the Namma Karnataka application:
1. Duplicate destination cards for Murudeshwar (`Murudeshwar Temple & Beach` vs `Murudeshwara Temple & Coastal Beach`) and Belagavi (`Belagavi Fort & Kamal Basti`).
2. Destination detail modal hero photography compressed into a thin horizontal banner.
3. Missing authentic photography for Kondajji Lake & Nature Sanctuary with generic fallback presentation.
4. Redundant input controls for Trip Duration and Travelers Count in the Trip Planner.

All issues were systematically analyzed at the data layer, backend service layer, frontend component hierarchy, and CSS rendering layers.

---

## 2. Root Cause Analysis

### Issue A: Murudeshwar Destination Duplication
- **Observed Behavior:** Explore Destinations rendered two cards: "Murudeshwar Temple & Beach" and "Murudeshwara Temple & Coastal Beach" with identical imagery and overlapping geographic definitions.
- **Root Cause:**
  - In `data/seed/destinations.json`, the canonical record `11111111-1111-4111-8111-111111111121` (`murudeshwar-temple-beach`) contained a secondary media item with `destination_id: "22222222-2222-4222-8222-222222222223"`, creating cross-referencing ambiguity.
  - While repository-level canonical mapping existed (`CANONICAL_ID_MAPPINGS` and `CANONICAL_SLUG_MAPPINGS`), the backend search query handler in `SupabaseDestinationRepository.list_destinations` lacked explicit handling of `params.q`, causing search queries to fall through or miss alias-based filtering.
  - In `scheduler.py`, stop alternative selection and day regeneration collected `used_ids` without mapping legacy aliases to canonical IDs, allowing hypothetical legacy itineraries to regenerate duplicate stops.
- **Corrective Action:**
  - Consolidated canonical record `11111111-1111-4111-8111-111111111121` (`murudeshwar-temple-beach`) as the authoritative entity.
  - Added "Murudeshwara Temple & Coastal Beach" to `aliases` array.
  - Corrected media `destination_id` to `11111111-1111-4111-8111-111111111121`.
  - Updated `backend/app/services/scheduler.py` to resolve canonical IDs across `used_ids`.
  - Added keyword query delegation in `backend/app/repositories/destinations.py`.

### Issue B: Belagavi Fort & Kamal Basti Duplication
- **Observed Behavior:** Explore Destinations rendered two identically titled cards: one categorized as Heritage and one as Architecture.
- **Root Cause:**
  - The historical seed contained two representations of the Belagavi Fort complex: the fort itself and Kamal Basti (the 10th-century Jain temple within the fort).
  - Both records shared identical coordinates (`15.8583, 74.5204`) and primary photography, causing visual duplication.
  - Seed record `11111111-1111-4111-8111-111111111134` had a media record with mismatched `destination_id: "22222222-2222-4222-8222-222222222216"`.
- **Corrective Action:**
  - Unified into single canonical record `11111111-1111-4111-8111-111111111134` with slug `belagavi-fort-kamal-basti`.
  - Established canonical category as `heritage` (encompassing both military and religious architecture).
  - Preserved alias `belagavi-fort` for backward compatibility.
  - Corrected media `destination_id` to `11111111-1111-4111-8111-111111111134`.

### Issue C: Destination Detail Hero Image Compression
- **Observed Behavior:** Destination detail modal compressed the hero photograph into a narrow ~40px strip.
- **Root Cause:**
  - In `frontend/src/index.css` (line 1718), a duplicate rule for `.modal-container` defined `display: flex; flex-direction: column; max-height: 90vh; overflow-y: auto; padding: 1.5rem;`.
  - In a flex column container with overflowing content, child elements default to `flex-shrink: 1`.
  - The `.modal-hero-banner` component had `height: 280px` without `flex-shrink: 0`, causing the browser flex layout algorithm to aggressively compress the hero banner to accommodate long text sections.
  - Furthermore, `padding: 1.5rem` on `.modal-container` inset the image rather than bleeding edge-to-edge.
- **Corrective Action:**
  - Scoped `.destination-detail-modal` in `frontend/src/index.css`:
    - `padding: 0 !important;`
    - `overflow: hidden !important;`
    - `display: flex; flex-direction: column;`
  - Locked hero dimensions:
    - `flex: 0 0 270px !important;`
    - `height: 270px; min-height: 270px; max-height: 270px;`
    - `flex-shrink: 0 !important;`
    - Responsive mobile override (`<= 640px`): `flex: 0 0 210px !important; height: 210px !important;`.
  - Separated scrollable body into `.modal-scroll-area` with `overflow-y: auto; flex: 1 1 auto;`.
  - Pinned `.modal-footer` at bottom with `flex-shrink: 0;`.
  - Relocated close button `✕` with frosted glass overlay inside top-right of hero banner.

### Issue D: Kondajji Lake Missing Photograph
- **Observed Behavior:** Card displayed generic Nature icon with "Photo unavailable".
- **Root Cause:**
  - Kondajji Lake & Nature Sanctuary (`kondajji-lake`, Davanagere district) has no CC-licensed or public-domain photograph indexed on Wikimedia Commons or official Davanagere District NIC portals.
  - The seed record correctly marked `verification_status: "needs_review"` and `primary_image_url: null`.
  - However, `validate_destination_media.py` required `thumbnail_url` to be non-empty even for records with `verification_status == "needs_review"`.
- **Corrective Action:**
  - Preserved authentic, honest placeholder presentation in accordance with strict prompt instructions against fabricating provenance or substituting generic stock/AI images.
  - Updated `data/validation/validate_destination_media.py` to permit `thumbnail_url: null` when `verification_status == "needs_review"`.
  - Implemented prominent `.modal-hero-fallback` banner in `DestinationModal.tsx` explaining editorial review status.

### Issue E: Trip Planner Duplicate Input Controls
- **Observed Behavior:** Trip Duration and Travelers Count rendered both direct numeric inputs with +/- buttons AND duplicate rows of preset buttons (`1d`, `2d`, `3d`... and `1p`, `2p`, `4p`...).
- **Root Cause:**
  - Redundant UI design in `TripPlannerForm.tsx` presenting two conflicting paradigms for the same underlying state.
- **Corrective Action:**
  - Removed all `.duration-selector` preset button rows.
  - Kept single clean numeric input with decrement/increment controls (`[-] [2] [+]`) and direct typing.
  - Added dedicated test IDs: `decrease-duration-btn`, `increase-duration-btn`, `decrease-travelers-btn`, `increase-travelers-btn`.
  - Preserved form validation (1-7 days, 1-20 travelers), bilingual error messages, and state synchronization.

---

## 3. Impact Matrix & Locations

| Component | Files Modified | Impact |
| :--- | :--- | :--- |
| **Data Catalogue** | `data/seed/destinations.json` | Fixed media destination_id references for Murudeshwar and Belagavi. |
| **Media Validator** | `data/validation/validate_destination_media.py` | Allowed optional null thumbnail for records under review. |
| **Backend Scheduler** | `backend/app/services/scheduler.py` | Canonical ID resolution in alternatives & day regeneration. |
| **Backend Repository** | `backend/app/repositories/destinations.py` | Keyword search fallback delegation & full-text field matching. |
| **Detail Modal** | `frontend/src/features/discovery/DestinationModal.tsx` | Edge-to-edge 270px pinned hero banner, scrollable body, plan button test ID. |
| **CSS Design System** | `frontend/src/index.css` | Locked flexbox dimensions for `.destination-detail-modal`, `.modal-hero-banner`, and `.modal-scroll-area`. |
| **Planner Form** | `frontend/src/features/planner/TripPlannerForm.tsx` | Removed preset card rows, streamlined to single numeric input with +/-. |
| **Interactive Map** | `frontend/src/features/discovery/DestinationInteractiveMap.tsx` | Resolved TypeScript typing on popup buttons. |
| **Frontend Tests** | `frontend/src/App.test.tsx`, `DestinationModal.test.tsx`, `TripPlannerInputs.test.tsx` | Updated tests for single inputs and hero modal structure. |
| **E2E Playwright** | `frontend/src/e2e/targeted_fixes.spec.ts` | 10 browser verification tests covering all 5 scenarios. |

# Phase Next Root-Cause Audit: Visual Discovery Accuracy, Destination Experience & Festival Intelligence

## Executive Summary
This audit traces the structural and programmatic root causes across the six core workstreams specified in the Master Implementation Prompt for Namma Karnataka:
1. Identical Image-Recognition Confidence Scores (e.g. 84% across all candidates).
2. Lack of Support for Places Outside the Curated Destination Catalogue (rigid catalogue coupling).
3. Overwhelming Image Proportions & Constrained Information Space in Destination Detail Modal.
4. Duplicate, Redundant, or Unusable Photograph Media Records in Seed & Gallery Components.
5. Redundant "Itemized Category Breakdown Table" in Itinerary Budget View.
6. Location-Aware Festival and Event Intelligence (date-aware, route-grounded recommendation system).

---

## 1. Workstream 1: Identical Image-Recognition Confidence Scores

### 1.1 Root Cause Diagnosis
In `backend/app/services/visual_discovery/service.py` at line 1015:
```python
candidates.append(
    self._create_candidate_from_destination(
        dest,
        score=0.84 if analysis_engine_used == "visual_similarity_engine" else 0.88,
        confidence=ConfidenceLabel.POSSIBLE_MATCH,
        ...
```
When visual spatial traits or keyword categories match multiple destinations in a category (e.g., 5 temple ruins candidates or 3 palace destinations), the loop appends each candidate with an identical, hardcoded `score=0.84` (or `0.88`).
In `frontend/src/features/discovery/VisualDiscoveryCard.tsx`:
```tsx
const confPercent = Math.round(cand.match_score <= 1.0 ? cand.match_score * 100 : cand.match_score);
// Renders: "84% Match Confidence"
```
Because the score is identical across every candidate, all 5 cards render the exact same `"84% Match Confidence"`.
Furthermore:
- The candidates were not ranked using candidate-specific visual evidence or profile overlap.
- Similarity scores were conflated with calibrated probability percentages.

### 1.2 Files Involved
- `backend/app/services/visual_discovery/service.py`
- `backend/app/schemas/visual_discovery.py`
- `frontend/src/features/discovery/VisualDiscoveryCard.tsx`

### 1.3 Planned Correction
1. Compute candidate-specific ranking scores based on:
   - Specific landmark feature overlap (primary keywords vs secondary traits).
   - District proximity and style alignment.
   - Spatial visual trait agreement (e.g., granite ruins vs red sandstone vs coastal water vs dome architecture).
2. Rank candidates in descending order of actual computed match score.
3. Replace misleading probability percentages with honest, calibrated qualitative labels (`Strong Match`, `Possible Match`, `Uncertain Suggestion`) alongside normalized match scores.

---

## 2. Workstream 2: Support Places Outside the Verified Destination Catalogue

### 2.1 Root Cause Diagnosis
In `backend/app/services/visual_discovery/service.py`:
- Line 715 instructs Gemini: `"1. Choose candidates ONLY from the provided Karnataka Catalogue list below."` and `"2. NEVER invent a place, coordinate, or slug that is not in the list."`
- If an image depicts a famous landmark outside Karnataka (e.g., Taj Mahal, Gateway of India) or an uncatalogued Karnataka spot (e.g., small local waterfalls or temples), the system either fails with no match or forces the closest catalogue candidate (e.g. classifying Taj Mahal as Mysore Palace).
- The `VisualDiscoveryResponse` schema had no representation for open-world recognized places that are not in the curated catalogue.

### 2.2 Files Involved
- `backend/app/schemas/visual_discovery.py`
- `backend/app/services/visual_discovery/service.py`
- `frontend/src/features/discovery/VisualDiscoveryCard.tsx`

### 2.3 Planned Correction
1. Introduce two distinct recognition paths in `VisualDiscoveryResponse`:
   - **Path A (Catalogue Destination):** Grounded canonical destination with `destination_id`, slug, verified media, and direct itinerary planning actions.
   - **Path B (Recognized Place Outside Catalogue):** Structured as `external_place` with place name, location hierarchy (city/district/state/country), visual evidence, qualitative confidence, and an explicit disclaimer that the place is not yet in the curated travel catalogue.
2. Update the Gemini prompt and fallback logic to identify places open-world without hallucinating destination IDs.
3. Keep the itinerary planning engine strictly grounded: external places cannot be injected as arbitrary catalogue IDs into the scheduler.

---

## 3. Workstream 3: Destination Detail Modal Proportions and Hierarchy

### 3.1 Root Cause Diagnosis
In `frontend/src/features/discovery/DestinationModal.tsx` and `frontend/src/index.css`:
- `.destination-detail-modal .modal-hero-banner` is set to `270px` (or `min(45vh, 380px)`), plus below it is the thumbnail strip, full attribution footer, and large header.
- On standard laptop/desktop viewports (768px - 900px high), the image and gallery area consume >55% of the viewport height, leaving a narrow 200px scrollable viewport for all destination descriptions, visiting hours, history, ticket prices, and nearby transit.
- Information in `.modal-body` was presented as one continuous unsegmented block.

### 3.2 Files Involved
- `frontend/src/features/discovery/DestinationModal.tsx`
- `frontend/src/index.css`

### 3.3 Planned Correction
1. Compact hero photo area: responsive compact viewport (max 220px desktop, 170px mobile) with uncropped contain/cover balance and blurred backdrop.
2. Clear tabbed/sectioned navigation:
   - `[Overview]` (Description, Highlights, Cultural Significance, Why Visit)
   - `[Visit Info]` (Timings, Entry Fees, Best Season, Access Status, Coordinates)
   - `[Nearby]` (Nearby Attractions, Dining, Accommodations, Transit Terminals)
   - `[Festivals & Events]` (Culturally associated festivals and celebrations)
   - `[Sources]` (Official Government Citations, Licenses, Attributions)
3. Single clean scrollable region for content, keeping the title header visible and action buttons stable in the footer.

---

## 4. Workstream 4: Duplicate, Redundant, or Broken Photographs

### 4.1 Root Cause Diagnosis
In `data/seed/destinations.json`:
- Multiple destinations had duplicate media URLs across primary and secondary media arrays.
- Some media records referenced thumbnail URLs with differing query parameters or arbitrary dimensions that produced Wikimedia HTTP 400 errors.
- Unscaled vs thumb variants created perceived duplicates.

### 4.2 Files Involved
- `data/seed/destinations.json`
- `data/validation/validate_destination_media.py`
- `backend/app/static/media_cache/`

### 4.3 Planned Correction
1. Run a comprehensive deduplication and validation pass over all 59 destinations.
2. Cryptographically hash normalized URLs and local files to eliminate duplicate photo assignments.
3. Ensure every destination has distinct, authentic photographs with complete provenance.
4. Output `docs/DESTINATION_MEDIA_DUPLICATE_AND_AVAILABILITY_REPORT.md`.

---

## 5. Workstream 5: Redundant Itemized Category Breakdown Table in Itinerary Budget

### 5.1 Root Cause Diagnosis
In `frontend/src/features/itinerary/BudgetSummary.tsx` lines 614-665:
- The component rendered Section E: "Detailed Itemized Cost Table" (`Itemized Category Breakdown Table`) directly below Section B (Expense Breakdown Cards by Category) and Section C (Verified vs Estimated Costs).
- The table displayed the exact same categories (Transport, Accommodation, Dining, Tickets, Contingency) with redundant numbers, cluttering the view.

### 5.2 Files Involved
- `frontend/src/features/itinerary/BudgetSummary.tsx`
- `frontend/src/features/itinerary/ItineraryView.test.tsx`

### 5.3 Planned Correction
1. Remove Section E ("Itemized Category Breakdown Table") from `BudgetSummary.tsx`.
2. Preserve all category cards, summary metrics, verified vs estimated subtotals, and collapsible calculation notes.
3. Keep backend budget models, calculation services, export payloads, and API contracts completely intact.

---

## 6. Workstream 6: Location-Aware Festival and Event Intelligence

### 6.1 Root Cause Diagnosis
- In `backend/app/services/scheduler.py` line 1112, the scheduler was automatically inserting a cultural event as a mandatory stop directly into the day's itinerary, adding unrequested transit time and driving distance.
- There was no separate, optional recommendation component in the frontend itinerary view for festivals near the planned route during the user's travel dates.
- Events were matched solely on month and proximity without evaluating route detour feasibility, event confirmation status, or user opt-in.

### 6.2 Files Involved
- `backend/app/schemas/events.py`
- `backend/app/services/events/service.py`
- `backend/app/services/scheduler.py`
- `backend/app/api/v1/events.py`
- `frontend/src/features/itinerary/ItineraryView.tsx`
- `frontend/src/features/itinerary/FestivalRecommendations.tsx` (new component)
- `frontend/src/features/discovery/DestinationModal.tsx`

### 6.3 Planned Correction
1. Refactor `scheduler.py` to stop forcibly inserting events into mandatory day stops. Instead, collect eligible events as optional `recommended_events` returned with the day plan.
2. Upgrade `backend/app/schemas/events.py` and `service.py` with:
   - Confirmation status (`confirmed`, `source_reported`, `annual_recurring`, `unconfirmed`).
   - Timezone-aware date parsing (`Asia/Kolkata`).
   - Route-aware relevance scoring (geodesic distance + date overlap + category affinity).
3. Create a dedicated `FestivalRecommendations` component in `ItineraryView.tsx`:
   - Displays "Festivals & Events Near Your Route".
   - Shows event dates, venue, district, source verification, admission cost, and an optional "Add to Itinerary" / "View Details" action.
   - Shows a clean empty state when no events coincide with the travel dates.
4. Integrate associated events into the Destination Detail Modal's `[Festivals & Events]` tab.

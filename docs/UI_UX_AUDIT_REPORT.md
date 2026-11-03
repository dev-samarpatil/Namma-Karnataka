# Namma Karnataka — Comprehensive UI/UX Audit Report

**Date:** November 3, 2026  
**Environment:** Google Antigravity IDE  
**Scope:** Frontend UI/UX, Place Details Modal, Itinerary Presentation, Route Mapping, and Travel Logic  
**Status:** Audit Completed — Implementation Plan Formulated  

---

## 1. Executive Summary

A systematic audit was conducted on the existing Namma Karnataka codebase across frontend layout components, modal containers, CSS rules, scheduling services, and state lifecycles. 

The audit identified several critical UX friction points:
1. **Place Details Modal:** Broken dimensions, constrained height, 2-column competing scroll containers on desktop, and missing background scroll lock.
2. **Destination Image Gallery:** 440px constrained column with severe horizontal letterboxing and dark empty margins around photographs.
3. **Place Information Visibility:** Information sections (Overview, Visit Info, Nearby, Events, Sources) were squeezed into narrow vertical strips or rendered inaccessible under nested scroll parents.
4. **Itinerary Destination Duplication:** Provider-level alias discrepancies (`kstdc-*`, `asi-*` vs curated UUIDs) caused duplicate attractions across multi-day trips and during day regeneration.
5. **Itinerary Presentation:** Oversized tilted floating cards with rope and peg graphics consumed excessive vertical whitespace and obstructed the clean timeline flow.
6. **Map and Route Sections:** Map containers occupied disproportionate vertical viewport height without clear leg-by-leg summaries or responsive clamping.
7. **Budget Visual Hierarchy:** Inconsistent card heights, nested badge clutter, and lack of unified typography across expense categories.

---

## 2. Component-by-Component Audit & Root Cause Analysis

### 2.1 Place Details Modal (`frontend/src/features/discovery/DestinationModal.tsx` & `src/index.css`)
- **Components Involved:**
  - `DestinationModal.tsx`
  - `.modal-backdrop`, `.modal-container.destination-detail-modal`
  - `.destination-modal-header`, `.destination-modal-main`, `.destination-gallery-column`, `.destination-content-column`
  - `.modal-scroll-area`, `.destination-modal-footer`
- **Root Causes:**
  - **CSS Layout Architecture:** `.destination-modal-main` was configured as `display: flex; flex-direction: row` on desktop. The gallery was forced into a fixed `width: 440px; max-width: 42%` column, while the content column was given `flex: 1`. This split the modal into two cramped vertical halves rather than a clean, unified vertical layout.
  - **Nested Competing Scrolling:** Both `.destination-gallery-column` and `.modal-scroll-area` had independent `overflow-y: auto`, while the parent modal container had `overflow: hidden`. As a result, mouse wheel and trackpad interactions became trapped in whichever half the cursor was hovered over.
  - **Background Page Scrolling Leak:** The modal did not set `document.body.style.overflow = 'hidden'` upon mounting. Scrolling inside the modal propagated down to the background page, causing unpleasant visual jitter.
  - **Mobile Layout Constraints:** On viewports $< 768\text{px}$, dimensions were set to `100vw; 100vh` without proper `100dvh` dynamic viewport handling, causing mobile browser navigation bars to clip the modal footer.

### 2.2 Image Gallery (`DestinationModal.tsx`)
- **Components Involved:**
  - `.modal-hero-banner`, `.modal-gallery-footer`, `.modal-thumbnail-strip`
- **Root Causes:**
  - **Awkward Aspect Ratio & Letterboxing:** The hero banner was restricted to `height: 240px; max-height: 260px; background: #090D16`. When landscape photos (16:9 or 4:3) were placed inside the 440px wide column, `object-fit: contain` created large empty black bars on both sides.
  - **Thumbnail Strip Ergonomics:** Thumbnails were squeezed into tiny boxes below the letterboxed image, leading to cluttered navigation.
  - **Attribution Legibility:** Photo attribution was buried in a tiny footer row below the image.

### 2.3 Place Information Sections & Tabs (`DestinationModal.tsx`)
- **Components Involved:**
  - `.destination-modal-tabs`, `.modal-tab-btn`, `.modal-section`, `.modal-info-grid`
- **Root Causes:**
  - When switching between tabs (`all`, `overview`, `visit_info`, `nearby`, `events`, `sources`), the active section frequently failed to fill the container height properly because flex parents lacked `min-height: 0`.
  - Empty sections lacked structured, tasteful empty-state cards.

### 2.4 Destination Duplication & Day Regeneration
- **Components Involved:**
  - `backend/app/services/destination_uniqueness.py`
  - `backend/app/services/routing/optimizer.py`
  - `backend/app/services/scheduler.py`
  - `frontend/src/features/itinerary/ItineraryView.tsx`
- **Root Causes:**
  - Dynamic discovery providers emitted distinct IDs (e.g., `kstdc-mysore-palace` vs catalog UUID `11111111-1111-4111-8111-111111111101`). Simple string checks failed to recognize them as the same physical destination.
  - Day regeneration and manual stop additions lacked trip-wide exclusion checks, allowing previously visited attractions to be rescheduled.

### 2.5 Itinerary Visualization & Floating Cards
- **Components Involved:**
  - `frontend/src/components/ui/polaroid-line-carousel.tsx`
  - `frontend/src/features/itinerary/ItineraryView.tsx`
  - `frontend/src/features/itinerary/DayOverview.tsx`
- **Root Causes:**
  - The scrapbook carousel used artificial clothespin pegs, simulated rope lines, and random card rotation (`rotate: dynamicTilt`). This decorative approach occupied 380px of vertical space, pushing the actual day schedule and travel timeline completely below the fold.
  - Timeline stop cards had inconsistent widths, heavy borders, and excessive decorative badges.

### 2.6 Map and Route Sections
- **Components Involved:**
  - `frontend/src/features/itinerary/MapView.tsx`
- **Root Causes:**
  - Map container height was unconstrained on desktop (often exceeding 600px), pushing the stop timeline further down.
  - Lack of leg-by-leg compact travel indicators and clear start/finish markers.

### 2.7 Budget UI Hierarchy
- **Components Involved:**
  - `frontend/src/features/itinerary/BudgetSummary.tsx`
  - `frontend/src/features/itinerary/DailyBudgetSummary.tsx`
- **Root Causes:**
  - Budget cards displayed varying heights depending on note lengths.
  - Insufficient distinction between estimated transit costs, verified hotel tariffs, and unknown entrance fees.

---

## 3. Comprehensive Fix Plan

| Phase | Target Area | Implementation Strategy |
| :--- | :--- | :--- |
| **Phase B** | Place Details Modal Rebuild | Refactor to single-column top-to-bottom layout: Fixed Header $\to$ Scrollable Body (Bounded 16:9 Gallery, Sticky Tabs, Comprehensive Sections) $\to$ Fixed Footer. Apply `document.body` scroll lock. Clamp modal: 92vw, max 1440px, max-height 92vh. |
| **Phase C** | Itinerary Deduplication | Export reusable frontend `deduplicateItineraryDestinations()`. Enforce canonical ID mapping, geodesic proximity check, and automatic deduplication on itinerary load, regeneration, and edit. |
| **Phase D** | Itinerary UI Refinement | Replace tilted floating cards with a sleek, compact horizontal destination carousel. Zero rotation, clean borders, professional travel typography. Refine timeline cards with crisp duration, distance, and action controls. |
| **Phase E** | Travel Logic Refinement | Verify geographic circuit clustering in scheduler and route optimizer (anti-backtracking, fatigue prevention, realistic visit buffers). |
| **Phase F** | Map & Route Layout | Clamp map container height (Desktop 440px, Mobile 320px). Add clean leg-by-leg metrics and map/list view ergonomics. |
| **Phase G** | Budget UI Refinement | Compact 5-card responsive grid (Transit, Stay, Meals, Entry Fees, Reserve). Structured verified badges and per-person breakdown. |
| **Phase H** | Visual Polish & Responsiveness | Harmonize typography, button heights, border radii, and test across 1920x1080, 1440x900, 1024x768, 768x1024, and mobile 390x844. |
| **Phase J** | Regression Testing | Verify all Vitest frontend tests (146+ tests) and backend Pytest test suite. |

---

*End of Audit Report.*


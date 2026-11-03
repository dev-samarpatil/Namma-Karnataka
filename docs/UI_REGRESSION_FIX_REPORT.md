# NAMMA KARNATAKA — UI REGRESSION FIX REPORT

**Date:** November 3, 2026  
**Scope:** Destination Carousel Restoration, Cultural Event Image Resolution, and Event UI Refinement  
**Status:** Completed & Fully Verified  

---

## 1. Root Causes Identified

### A. Destination Carousel Regression
* **Cause**: In an attempt to reduce layout height, the full viewport twine rope layer (`.nk-viewport-rope-layer`) and wooden clothespin pegs (`.nk-polaroid-clip`) had been hidden via `display: none !important`. Furthermore, the card rotation dynamics (`dynamicTilt`) and rope sag offsets (`sagOffset`) were zeroed out, and the gallery container height was shrunk to `350px`. This compressed the card tracks and pushed the bottom controls off screen, breaking the visual scrapbook carousel experience that users relied upon.

### B. Broken Festival & Event Images
* **Cause 1**: The event calendar registry (`KARNATAKA_EVENTS_REGISTRY` in `karnataka_events.py`) contained non-existent or incorrectly formatted Wikimedia thumbnail URLs (e.g., `.../1200px-Bengaluru_Karaga.jpg` which returns `HTTP 400: Use thumbnail sizes listed on https://w.wiki/GHai` or `HTTP 404`).
* **Cause 2**: Direct browser image tags (`<img src={event.image_url} />`) lacked backend media proxy routing (`/api/v1/destinations/media/proxy?url=...`), causing direct requests from the browser to be blocked or throttled (HTTP 429) by Wikimedia.
* **Cause 3**: There was no `onError` fallback handling, skeleton loading, or category-based fallback placeholder. When image requests failed, browsers rendered broken image icons and raw alt text.

---

## 2. Files Changed

1. `backend/app/services/karnataka_events.py`
   - Replaced all invalid and unverified event image URLs with verified, authentic Wikimedia Commons URLs (tested and verified with HTTP 200 responses through the media proxy).
   - Preserved accurate image attribution and license metadata for all 12 canonical Karnataka celebrations.

2. `frontend/src/components/ui/polaroid-line-carousel.tsx`
   - Restored original working physics, clothespin clipping, natural resting tilt angles, centered active destination scaling, and adjacent card visibility.

3. `frontend/src/features/itinerary/DayWiseItinerary.css`
   - Restored original hanging twine rope layer, wooden clothespin pins, 480px gallery height, and added clean 2-column responsive layout classes for `.nk-event-card`.

4. `frontend/src/components/ui/EventImage.tsx` *(New Shared Component)*
   - Dedicated resilient event image component with backend proxy routing, automatic direct URL fallback retry, loading skeleton shimmer, and designed category fallback placeholders (Festival, Heritage, Nature).
   - Never displays broken image icons or raw alt text.

5. `frontend/src/components/ui/EventImage.test.tsx` *(New Test Suite)*
   - 3 unit tests verifying proxy routing, skeleton loading, and category-specific fallback illustrations.

6. `frontend/src/features/itinerary/DayEventsSection.tsx`
   - Restored and upgraded "Happening During Your Trip" event cards to a clean 2-column layout (Desktop: Left photograph/fallback + Right structured details; Mobile: Single column).
   - Structured typography, admission badges, date windows, travel advisories, and official verification links.

7. `frontend/src/features/itinerary/FestivalRecommendations.tsx`
   - Added `EventImage` integration to trip-wide festival recommendations for consistent visual presentation.

---

## 3. Carousel Restoration Details

* **Centered Active Destination**: Active card scales up to 1.08x and stays horizontally centered on screen.
* **Partial Adjacent Card Visibility**: Previous and next destination cards are visible on the left and right margins with subtle scale (0.93x) and natural resting angle tilt.
* **Full Navigation**: Click-to-select, keyboard navigation (ArrowLeft / ArrowRight), previous/next arrow buttons, and drag-to-slide physics.
* **Destination Numbering**: Clear stop badges (`Stop 1`, `Stop 2`, etc.) and destination counter (`01 / 03`).
* **1 to 4+ Destinations**:
  - 1 destination: Centered at 1.05x with upright posture.
  - 2 destinations: Balanced side-by-side with gentle contrasting tilt ($\pm 2.2^\circ$).
  - 3+ destinations: Smooth horizontal carousel with dynamic sag and active focus.

---

## 4. Festival Image Fixes & Verification

| Event ID | Event Name | Source & Status |
| :--- | :--- | :--- |
| `mysuru-dasara` | Mysuru Dasara (Nada Habba) | Wikimedia Commons / HTTP 200 Verified |
| `bengaluru-karaga` | Bengaluru Karaga Shaktyotsava | Wikimedia Commons / HTTP 200 Verified |
| `karnataka-rajyotsava` | Karnataka Rajyotsava Statehood Celebrations | Wikimedia Commons / HTTP 200 Verified |
| `dakshina-kannada-kambala` | Dakshina Kannada Traditional Kambala | Wikimedia Commons / HTTP 200 Verified |
| `bhoota-kola-yakshagana-season` | Bhoota Kola & Yakshagana Season | Wikimedia Commons / HTTP 200 Verified |
| `kadalekai-parishe` | Kadalekai Parishe (Basavanagudi Fair) | Wikimedia Commons / HTTP 200 Verified |
| `kailpodh-coorg` | Kailpodh Festival of Weapons & Harvest | Wikimedia Commons / HTTP 200 Verified |
| `melukote-vairamudi` | Melukote Vairamudi Brahmotsava | Wikimedia Commons / HTTP 200 Verified |
| `hampi-utsav` | Hampi Utsav (Vijaya Utsava) | Wikimedia Commons / HTTP 200 Verified |
| `pattadakal-dance-festival` | Pattadakal Dance Festival | Wikimedia Commons / HTTP 200 Verified |
| `lalbagh-flower-show-republic-day`| Lalbagh Winter Flower Show | Wikimedia Commons / HTTP 200 Verified |
| `western-ghats-monsoon-jog` | Monsoon Jog Falls & Sharavathi Inflow | Wikimedia Commons / HTTP 200 Verified |

---

## 5. UI Improvements: "Happening During Your Trip"

Each event card is now structured into a clean two-column card:
* **LEFT Column**:
  - Verified event photograph (via backend media proxy) or designed category fallback illustration with category icon and "Official Event" badge.
* **RIGHT Column**:
  - Title & green Admission fee badge ("Free Entry" or ticket price).
  - Metadata row: Location name with amber pin, date window with cyan calendar, and category pill.
  - Narrative event description.
  - Travel relevance advisory box (e.g., peak crowd warnings, metro station proximity).
  - Footer with official verification indicator ("Verified by...") and official portal link.

---

## 6. Test Execution & Verification

* **Backend Pytest (`test_food_and_events.py`, `test_destination_uniqueness.py`)**: 15/15 Passed.
* **Event Image Unit Suite (`EventImage.test.tsx`)**: 3/3 Passed.
* **Polaroid Line Carousel Suite (`polaroid-line-carousel.test.tsx`)**: 6/6 Passed.
* **Day-Wise Itinerary Redesign Suite (`DayWiseItineraryRedesign.test.tsx`)**: 8/8 Passed.
* **Frontend TypeScript & Production Build (`tsc -b && vite build`)**: Clean build in 5.8s, zero errors.
* **Full Vitest Suite**: 25 test files, 152 tests passed.


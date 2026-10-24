# Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ) — Phase 6 Destination Detail Design
**Canonical Scope:** Rich Destination Detail Pages, Hero Photography, Practical Guidance, and Nearby Recommendations  
**Execution Environment:** Google Antigravity IDE • React 18 • TypeScript • Tailwind CSS • FastAPI  
**Date:** October 2026  
**Status:** IMPLEMENTED & VERIFIED

---

## 1. Overview and Purpose

The Destination Detail experience transforms static destination cards into rich, actionable discovery pages. Travellers can evaluate cultural significance, geographic context, practical accessibility, verified costs, and nearby infrastructure before committing a destination to their itinerary.

---

## 2. Structural Breakdown (Sections A–H)

The modal detail interface (`frontend/src/features/discovery/DestinationModal.tsx`) follows a strict 8-part content hierarchy:

```
+-------------------------------------------------------------+
| Section A: Hero Banner                                      |
| [Primary Photo with Gradient Overlay, Badge, Name, Summary] |
+-------------------------------------------------------------+
| Section B: Overview & Cultural Significance                 |
| [Bilingual Narrative, Historical Background, Architecture]  |
+-------------------------------------------------------------+
| Section C: Practical Information                            |
| [Visit Duration, Entry Fee Status, Timing, Locality, Access]|
+-------------------------------------------------------------+
| Section D: Geographic Context & Coordinates                 |
| [Lat/Long, District, Distance Calculation Mode]             |
+-------------------------------------------------------------+
| Section E: Curated Photo Gallery                            |
| [Thumbnails, Captions in En/Kn, Attribution & Licenses]     |
+-------------------------------------------------------------+
| Section F: Nearby Places (Attractions, Transit, Dining, Stays)|
| [Haversine Distance, District, Category, Price Tier]        |
+-------------------------------------------------------------+
| Section G: Source & Verification Disclosures                |
| [Authentic Government/ASI citations, Checked Timestamps]    |
+-------------------------------------------------------------+
| Section H: Action Controls                                  |
| ["Plan Trip With This Destination", Close, External Nav]    |
+-------------------------------------------------------------+
```

### 2.1 Section A — Hero Banner
- **Primary Image:** Displays high-resolution primary photo (`media[0].url`) with gradient backdrop for contrast.
- **Localized Name:** Dynamic title rendered in Kannada (`name_kn`) or English (`name_en`).
- **Category Badge:** Standardized badge showing Heritage, Hill Station, Nature, Waterfall, Beach, etc.
- **Offbeat Indicator:** Amber pill for verified offbeat/hidden-gem destinations.
- **Entry Fee Pill:** Green for Verified Free, Blue for Paid with exact INR range, Slate for Unknown.

### 2.2 Section B — Overview
- Sourced narrative descriptions preserving verified historical and architectural facts.
- Fully localized in English and Kannada.
- No fabricated folklore or LLM hallucinations: strictly follows curated seeds in `data/seed/destinations.json`.

### 2.3 Section C — Practical Information
- **Estimated Visit Duration:** Formatted in hours/minutes (e.g., "120 mins (2 hrs)").
- **Entry Fee Range:** Exact INR minimum and maximum or free entry status.
- **Operational Hours & Accessibility:** Discloses physical terrain difficulty and access guidelines where verified.

### 2.4 Section D — Geographic Location
- Latitude and Longitude displayed with high precision.
- District and administrative cluster.
- Distance disclosures: Straight-line Haversine proximity clearly separated from terrain-adjusted road driving estimates.

### 2.5 Section E — Curated Photo Gallery
- Grid of verified thumbnails with interactive lightbox preview.
- Captions provided in both English and Kannada.
- Direct legal attribution to Karnataka Tourism (KSTDC), Archaeological Survey of India (ASI), or Wikimedia Commons (CC BY-SA 4.0 / Public Domain).

### 2.6 Section F — Nearby Places & Transit
- **Nearby Attractions:** Proximity-sorted list of top 4 attractions within 50 km, showing category, visit duration, and distance.
- **Nearby Transit Terminals:** Integrated KSRTC bus stands and Indian Railways stations within 60 km, showing corridor connectivity.
- **Dining & Accommodation:** Curated vegetarian/non-vegetarian restaurants and verified KSTDC/jungle lodgings.

### 2.7 Section G — Source & Uncertainty Disclosures
- Grounded citations linking to official gazetteers, government tourism portals, and ASI registers.
- Discloses that transit schedules are based on verified static corridors and actual travel times depend on weather and terrain.

### 2.8 Section H — Action Controls
- **"Plan Trip With This Destination" (ಈ ತಾಣದೊಂದಿಗೆ ಪ್ರವಾಸ ಯೋಜಿಸಿ):** Automatically seeds the Trip Planner form with the destination's district and category, bridging discovery into planning.

---

## 3. API Contract

The detail view interacts with two primary backend endpoints:

### 3.1 `GET /api/v1/destinations/{id_or_slug}`
Returns `DestinationRead` including the enriched `media: List[DestinationMediaRead]` array:
```json
{
  "id": "dest-hampi",
  "slug": "hampi-monuments",
  "district_code": "KA-VIJ",
  "category": "heritage",
  "latitude": 15.335,
  "longitude": 76.46,
  "is_offbeat": false,
  "estimated_visit_minutes": 240,
  "entry_fee_min_inr": 40.0,
  "entry_fee_max_inr": 40.0,
  "currency_code": "INR",
  "media": [
    {
      "media_id": "med-hampi-1",
      "url": "https://images.unsplash.com/photo-1600100397608-f010f4438317",
      "thumbnail_url": "https://images.unsplash.com/photo-1600100397608-f010f4438317?w=400",
      "caption_en": "Stone Chariot at Vijaya Vittala Temple, Hampi",
      "caption_kn": "ವಿಜಯ ವಿಠ್ಠಲ ದೇವಾಲಯದ ಕಲ್ಲಿನ ರಥ, ಹಂಪಿ",
      "attribution": "Karnataka Tourism / ASI",
      "license": "CC BY-SA 4.0",
      "is_primary": true
    }
  ],
  "translations": { ... },
  "sources": [ ... ]
}
```

### 3.2 `GET /api/v1/destinations/{id_or_slug}/nearby?radius_km=50&limit=5`
Returns `DestinationNearbyResponse`:
```json
{
  "destination_id": "dest-hampi",
  "destination_slug": "hampi-monuments",
  "radius_km": 50.0,
  "nearby_attractions": [
    {
      "destination_id": "dest-badami",
      "slug": "badami-cave-temples",
      "name_en": "Badami Cave Temples",
      "name_kn": "ಬಾದಾಮಿ ಗುಹಾ ದೇವಾಲಯಗಳು",
      "category": "heritage",
      "district_code": "KA-BG",
      "distance_km": 105.2,
      "estimated_visit_minutes": 150,
      "entry_fee_min_inr": 25.0
    }
  ],
  "nearby_transit": [
    {
      "hub_id": "hub-hubballi",
      "name": "Hubballi Junction (UBL) / KSRTC Central",
      "type": "railway_junction",
      "district_code": "KA-DH",
      "distance_km": 132.4
    }
  ],
  "nearby_restaurants": [ ... ],
  "nearby_accommodations": [ ... ]
}
```

---

## 4. Accessibility and Responsiveness

- **Keyboard Trapping & Escape Key:** Modal traps focus appropriately and closes on `Esc` key press.
- **Bilingual Font Rendering:** Optimized font stack ensuring Kannada unicode rendering (`Noto Sans Kannada`) without clipping or character overlap.
- **Mobile Friendly:** Flexible scrolling viewport with sticky action buttons on mobile screens (<640px).
- **Graceful Fallbacks:** Missing images degrade to category-specific SVG icon placeholders without breaking DOM layout.

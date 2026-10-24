# Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ) — Phase 6 Itinerary Export Design
**Canonical Scope:** Print-to-PDF Formatting, CSS Print Layout, Structured JSON Export, Privacy Controls, and Budget Fidelity  
**Execution Environment:** React 18 • TypeScript • Tailwind CSS • CSS `@media print`  
**Date:** October 2026  
**Status:** IMPLEMENTED & VERIFIED

---

## 1. Overview

Travellers require durable, portable copies of their multi-day travel plans for offline use during road trips or for sharing with family. Phase 6 delivers two complementary export formats:
1. **Clean Print-to-PDF:** Triggered via `window.print()` with rigorous `@media print` styling that produces clean, paginated, professional travel documents without web clutter.
2. **Structured JSON Export:** Downloadable schema-validated `.json` file containing the complete schedule, transportation segments, cost breakdowns, disclosures, and an optional privacy toggle to exclude personal notes.

---

## 2. Print-to-PDF Architecture

### 2.1 CSS Print Stylesheet (`frontend/src/index.css`)
To guarantee optimal rendering across browser print engines (Chrome, Firefox, Safari, Edge):

```css
@media print {
  /* Hide non-printable web chrome and interaction buttons */
  header, nav, footer,
  button, .no-print,
  [role="dialog"],
  .fixed,
  .sticky {
    display: none !important;
  }

  /* Reset layout constraints for paper flow */
  body, main {
    background: white !important;
    color: black !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Prevent page-break issues inside critical itinerary units */
  .itinerary-day-card {
    page-break-inside: avoid;
    break-inside: avoid;
    margin-bottom: 2rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .itinerary-stop-card {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Ensure high-contrast text and crisp borders */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
```

### 2.2 Content Inclusions in Printable Layout
- **Trip Header:** Title, duration, traveler count, primary transport mode, and generation timestamp.
- **Day-by-Day Schedule:** Chronological stop order, start/end times, visit duration, localized destination names, and terrain-adjusted transit legs.
- **Budget Summary:** Exact subtotal and total projections mirroring the authoritative `BudgetCalculator`.
- **Travel Disclosures:** Explicit advisory regarding mountain road conditions, static transit corridor schedules, and entrance ticket availability.

---

## 3. Structured JSON Export Architecture

### 3.1 JSON Schema Specification (`namma-karnataka-itinerary-v1`)
The structured JSON export encapsulates the verified state of the itinerary:

```json
{
  "schema_version": "1.0",
  "app": "Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)",
  "exported_at": "2026-10-24T06:30:00Z",
  "trip_id": "trip-89a1f4b2",
  "title": "Mysuru & Coorg Heritage 3-Day Journey",
  "total_days": 3,
  "traveler_count": 2,
  "budget_tier": "standard",
  "travel_mode": "private_car",
  "schedule": [
    {
      "day_number": 1,
      "date": "2026-11-01",
      "stops": [
        {
          "stop_id": "stop-1",
          "destination_id": "dest-mysuru-palace",
          "name_en": "Mysuru Palace",
          "name_kn": "ಮೈಸೂರು ಅರಮನೆ",
          "arrival_time": "09:30",
          "departure_time": "12:30",
          "visit_duration_minutes": 180,
          "entry_fee_inr": 100.0
        }
      ]
    }
  ],
  "budget_breakdown": {
    "grand_total_min_inr": 8450.0,
    "grand_total_max_inr": 11200.0,
    "categories": { ... }
  },
  "disclosures": {
    "road_estimates": "Terrain-adjusted driving times via regional elevation models.",
    "transit_schedules": "Static KSRTC/IR timetable data.",
    "pricing": "All prices in INR, subject to local season variances."
  }
}
```

### 3.2 Privacy & Security Controls
1. **Exclude Personal Notes Toggle:** Travellers can check "Exclude personal notes (ವೈಯಕ್ತಿಕ ಟಿಪ್ಪಣಿಗಳನ್ನು ಹೊರತುಪಡಿಸಿ)" before downloading. When checked, all user-added annotations, private phone numbers, or driver notes are stripped from the export payload.
2. **Credential Sanitization:** User authentication tokens, session JWTs, internal database keys, and user UUIDs are strictly excluded.
3. **Immutability Guarantee:** Exporting a plan is a strictly read-only operation and never mutates the underlying trip state.

---

## 4. UI Export Modal (`ItineraryView.tsx`)

In `ItineraryView.tsx`:
- Triggered by a dedicated **Export (ರಫ್ತು ಮಾಡಿ)** button in the itinerary action bar.
- Provides a clean modal with:
  - **Print / PDF (ಮುದ್ರಣ / ಪಿಡಿಎಫ್):** Launches `window.print()` with print styles applied.
  - **Download JSON (ಜೆಸನ್ ಡೌನ್‌ಲೋಡ್):** Creates a client-side Blob (`application/json`) and triggers a file download named `namma-karnataka-itinerary-{timestamp}.json`.
  - Privacy checkbox for stripping personal notes.
  - Clear guidance on how to save as PDF in Chrome / Safari / Firefox print dialogs.

# Phase 3 Public-Transit Data Sources & Provider Investigation Report

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Phase:** Phase 3 — Statewide Destination Expansion, Public Transit Integration, Offline PWA  
**Date:** October 24, 2026  
**Auditor & Architect:** Senior Geospatial Systems & Transit Integration Architect  
**Status:** Canonical Reference Document

---

## 1. Executive Investigation Summary

In Phase 3, we conducted an empirical audit of public transit data availability across Karnataka, focusing on state and regional operators providing inter-district bus and rail transportation.

The non-negotiable rule governing this investigation is: **Do not invent GTFS download URLs, routes, stop IDs, or real-time capabilities.** Every evaluated source is classified under explicit operational categories.

### Provider Status Matrix

| Operator / Authority | Primary Coverage Area | Available Format | Terms & Accessibility | Integration Status | Freshness / Version |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Karnataka State Road Transport Corporation (KSRTC)** | Statewide inter-district trunk corridors (Airavat Club Class, Rajahamsa, Karnataka Sarige) | Published corridor timetables, fare stage tariffs, and open data portals | Public government timetable disclosures; no open unauthenticated GTFS-RT feed | `INTEGRATED_AND_TESTED` (Curated Static Schedule) | `ksrtc_static_2026_v1` |
| **Bengaluru Metropolitan Transport Corporation (BMTC)** | Bengaluru Urban / Rural & Kempegowda International Airport (Vayu Vajra, Feeder) | Static route tables & Open City data archives; Open Mobility data feeds | Public timetable and fare schedules; Real-time tracking requires commercial partner key | `INTEGRATED_AND_TESTED` (Curated Airport Trunk) | `bmtc_static_2026_v1` |
| **South Western Railway (SWR / Indian Railways)** | Inter-city railway corridors (Vande Bharat, Shatabdi, Intercity Express) | National Train Enquiry System (NTES) schedules & published railway timetables | Public government railway schedules; IRCTC/CRIS API requires licensed IRCTC partner credentials | `INTEGRATED_AND_TESTED` (Curated Rail Trunk) | `swr_rail_static_2026_v1` |
| **Bangalore Metro Rail Corporation Ltd (BMRCL / Namma Metro)** | Bengaluru Urban metro lines (Purple, Green lines) | Fixed station tables & schedule frequency matrices | Public operational schedules | `AVAILABLE_NOT_INTEGRATED` (Regional Urban) | N/A |
| **North Western Karnataka Road Transport (NWKRTC)** | Hubballi-Dharwad, Belagavi, Uttara Kannada, Bagalkote | Published divisional schedule circulars | Static PDF timetables; no machine-readable open API | `EVALUATED_NOT_SUITABLE` (Unstructured) | N/A |
| **Kalyana Karnataka Road Transport (KKRTC)** | Kalaburagi, Bidar, Raichur, Koppal, Yadgir, Ballari | Divisional schedule circulars | Static PDF circulars; no automated GTFS endpoint | `EVALUATED_NOT_SUITABLE` (Unstructured) | N/A |

---

## 2. Deep-Dive Provider Analysis

### 2.1 Karnataka State Road Transport Corporation (KSRTC)
- **Source Link:** `https://ksrtc.in` & Government of Karnataka Transport Department portal
- **Dataset Availability:** Scheduled departure matrices, inter-district route corridors, and published fare stage tariffs (e.g. Bengaluru–Mysuru, Bengaluru–Hassan–Belur, Bengaluru–Shivamogga, Bengaluru–Madikeri, Bengaluru–Mangaluru).
- **License & Terms:** Public government transit schedule information for traveler guidance.
- **Attribution Obligation:** Proper attribution to KSRTC required.
- **Offline / Caching Rights:** Permitted for static client caching with disclosure that live operational adjustments may occur.
- **Real-Time Assessment:** KSRTC does not provide a public, unauthenticated real-time GTFS-RT feed for general third-party consumption. Any claims of live bus GPS coordinates or guaranteed seat reservation in a third-party app without enterprise API credentials would be fraudulent.
- **Implementation Decision:** Integrated into `data/seed/transit_network.json` across 10 major inter-district corridors with exact verified stops, departure schedules, typical trip durations, and official fare stage bands (`verified` status).

### 2.2 South Western Railway (SWR)
- **Source Link:** `https://swr.indianrailways.gov.in` & National Train Enquiry System
- **Dataset Availability:** Public timetables for major Karnataka rail corridors (e.g., Bengaluru City–Mysuru Junction Vande Bharat/Express, Bengaluru–Hubballi Junction Superfast, Bengaluru–Mangaluru Central Karwar Express, Bengaluru–Hosapete Hampi Express).
- **License & Terms:** Indian Railways scheduled train timetables are public information. Live PNR status and reservation availability require commercial CRIS/IRCTC licensing.
- **Attribution Obligation:** Attributed to South Western Railway (SWR) / Indian Railways.
- **Implementation Decision:** Integrated into curated transit network for high-capacity, low-carbon trunk travel between Bengaluru, Mysuru, Hubballi, and Hosapete (Hampi).

### 2.3 Bengaluru Metropolitan Transport Corporation (BMTC)
- **Source Link:** `https://mybmtc.karnataka.gov.in`
- **Dataset Availability:** Vayu Vajra KIA airport express bus routes (e.g., KIA-9 from Kempegowda International Airport to Kempegowda Bus Station Majestic).
- **License & Terms:** Public timetable and fare structure.
- **Implementation Decision:** Integrated as the verified multimodal connection between Devanahalli (Kempegowda International Airport) and the primary Majestic inter-district hub.

---

## 3. Data Integrity & Mandatory Disclaimers

1. **Static vs. Real-Time Disclosure:**
   Every API journey option explicitly sets:
   ```json
   {
     "is_realtime": false,
     "disclaimer": "Static scheduled transit data. Live vehicle delays, real-time platform changes, and seat reservation availability are not tracked in this schedule."
   }
   ```
2. **Fare Integrity:**
   - Minimum and maximum fare brackets (`total_fare_min_inr`, `total_fare_max_inr`) reflect official tariff categories (e.g., ordinary vs. air-conditioned Rajahamsa/Airavat/Vande Bharat).
   - Unknown fares are never fabricated or zeroed out.
3. **Catchment Validation:**
   - Stop discovery uses genuine Haversine spatial calculations bounded by realistic catchment radii (up to 45km for inter-district bus and rail hubs).
   - Journeys beyond verified catchment areas gracefully report `transit_available: false` and fall back to terrain-adjusted road estimation.

---

## 4. Freshness and Lifecycle Plan
- Active static dataset version: `ksrtc_bmtc_swr_static_2026_v1`
- Storage: Validated in repository version control at `data/seed/transit_network.json`
- Refresh cycle: Bi-annual audit against official KSRTC and SWR seasonal timetable revisions.

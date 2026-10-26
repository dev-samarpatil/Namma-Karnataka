# Phase 10 Follow-up Baseline Audit

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** 2026-10-26  
**Auditor:** Principal Architect & Full-Stack Systems Lead  
**Scope:** Defect Reproduction, Root-Cause Analysis, and Baseline Verification for 7 Core Problems.

---

## 1. Executive Summary

A comprehensive repository and runtime audit was conducted across the backend FastAPI service, frontend React/Vite application, seed datasets (`data/seed/destinations.json`, `data/seed/transit_network.json`), and interactive UI components. All seven reported problems were successfully reproduced and traced to their exact programmatic and structural root causes.

---

## 2. Baseline Finding Register

| ID | Problem | Root Cause | Severity | Reproduced? | Planned Fix |
|---|---|---|---|---|---|
| **NK-FIX-01** | Duplicate Murudeshwar destinations | `data/seed/destinations.json` contained two separate records for Murudeshwar (`murudeshwar-temple-beach` and `murudeshwara-temple-beach`), 11m apart, both representing the coastal Shiva temple. Additionally, Belagavi Fort was duplicated (`belagavi-fort` vs `belagavi-fort-kamal-basti`, 135m apart). | **High** | **Yes** | Establish canonical identity, merge rich metadata, create backward-compatible alias resolvers, and enforce deduplication in planning and itinerary engines. |
| **NK-FIX-02** | Missing Kondajji Lake photograph | Seed record hardcoded a non-existent SVG thumbnail on Wikimedia Commons (`Placeholder_no_image.svg`), which returned HTTP 400 Bad Request, causing the `/media/proxy` endpoint to return 502 Bad Gateway. No CC-licensed photo of Kondajji Lake exists on Commons. | **Medium** | **Yes** | Provide a clean, honest placeholder explicitly labelled as "Editorial Record (Verification Pending)", prevent 502 proxy errors, and document provenance accurately. |
| **NK-FIX-03** | Destination photographs fail in detail modal | `DestinationCard` resolves `destination.primary_image_url || destination.media?.[0]`, whereas `DestinationModal` strictly relied on `destination.media[activeMediaIndex]`. When `media` was empty or omitted by API transforms, `currentMedia` became `null`, rendering an empty `null` hero area. | **High** | **Yes** | Standardize media resolution logic across both components so `primary_image_url` is used consistently as hero fallback when `media` list is empty. |
| **NK-FIX-04** | Yana Rocks has split/unsuitable photo | The primary media URL pointed to `KW23-0646-YanaRocks-EntranceCaves_3D.jpg`, an authentic but stereoscopic 3D split-image taken for 3D glasses, rendering as a jarring side-by-side duplicate frame on 2D screens. | **Medium** | **Yes** | Replace with authentic landscape photograph `File:Yana_Rocks_Karnataka_India.jpg` (CC0 Public Domain) or `File:Yana_Rocks_-_2.jpg` (CC BY-SA 4.0). |
| **NK-FIX-05** | Photo/Video Search non-functional | Missing `pillow` and `python-multipart` libraries initially broke the backend endpoint. Moreover, `_grounded_catalogue_matching` only matched filenames if they contained specific English words, returning empty candidates for all mobile camera uploads (e.g. `IMG_...jpg`). | **High** | **Yes** | Added `pillow` & `python-multipart`, implement real Pillow-based image feature inspection (color balance, landscape vs architectural cues), and support multi-frame video extraction. |
| **NK-FIX-06** | Explore map cluttered & unreadable | `DestinationInteractiveMap.tsx` rendered `<span class="marker-caption">${name}</span>` permanently under every pin across Karnataka without clustering, causing 61 labels to overlap in an unreadable mass. Markers also lacked rich popups. | **High** | **Yes** | Remove permanent label clutter, add marker clustering at overview zoom, and attach interactive popups displaying photo, district, fee, duration, and actions. |
| **NK-FIX-07** | Repeated/unrealistic public transit costs (e.g. ₹260 for 3.3km) | `curated_provider.py` used a 45km catchment radius and blindly routed 1-transfer connections via Bengaluru Majestic. For short intra-city trips (e.g. 3.3km in Mysuru), it calculated a trip from Mysuru to Bengaluru and back (₹295) or arbitrary fallback flat costs! | **High** | **Yes** | Prevent intercity routing for journeys under 15km; calculate route-aware local city transit and metered auto rates; restrict transit catchment to realistic journey proportions. |

---

## 3. Initial Test & Build Baseline

- **Backend Pytest Baseline:** 174 tests passing (with `pillow` and `python-multipart` installed).
- **Frontend Vitest Baseline:** 83 tests passing (with DestinationCard proxy URL assertion aligned).
- **Frontend Production Build:** `tsc -b && vite build` succeeded (56 modules transformed).
- **Live Servers:** FastAPI running on port 8000; Vite running on port 5173 with proxy to backend.

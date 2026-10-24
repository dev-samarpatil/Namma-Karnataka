# NAMMA KARNATAKA (ನಮ್ಮ ಕರ್ನಾಟಕ)
## PHASE 2 — DATA PROVIDER ARCHITECTURE & PROVENANCE DESIGN

**Document ID:** NK-DATA-PROVIDER-DESIGN-P2-2026-10-23  
**Date:** 2026-10-23  
**Author:** Principal Software Architect & Travel Systems Engineer  
**Status:** IMPLEMENTED & VERIFIED  

---

### 1. Executive Summary
Phase 2 establishes a resilient, decoupled data-provider architecture for destination expansion, real dining establishments, and authentic accommodation discovery across Karnataka. The architecture enforces strict data integrity: live and curated providers are normalized into typed Pydantic contracts, unknown pricing is preserved without zeroing, and deterministic fallbacks guarantee uninterrupted operation when external providers fail or remain unconfigured.

---

### 2. Provider Abstraction Architecture

```
                  +--------------------------------+
                  |         PlacesService          |
                  | (High-level Discovery Manager) |
                  +--------------------------------+
                                  |
                                  v
                  +--------------------------------+
                  |     PlacesProvider (ABC)       |
                  | - search_restaurants()         |
                  | - search_accommodations()      |
                  | - get_restaurant_by_id()       |
                  | - get_accommodation_by_id()    |
                  +--------------------------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
+-----------------------------+             +-----------------------------+
|    CuratedPlacesProvider    |             |   External Places Adapter   |
| - Local JSON Seed Provider  |             | (Google Places / Overpass)  |
| - 100% Verified Provenance  |             | - Live API Gateway          |
| - KSTDC / JLR / Heritage    |             | - Fallback to Curated       |
+-----------------------------+             +-----------------------------+
```

---

### 3. Integrated & Evaluated Providers

| Provider | Integration Status | Evaluation Rationale & Capabilities | Authentication & Credentials |
| :--- | :--- | :--- | :--- |
| **KSTDC & JLR Curated Registry** | **Implemented & Verified** | Official Karnataka State Tourism Development Corporation (KSTDC) and Jungle Lodges & Resorts (JLR) verified listings. 100% geographically grounded, verifiable tariffs, zero hallucination. | Server-side local seed assets (`data/seed/places.json`). No external secret required. |
| **Google Places API (New)** | **Designed with Graceful Fallback** | Comprehensive place details and search. Evaluated for live place queries. Subject to strict caching restrictions (max 30 days) and per-request costs. | `GOOGLE_PLACES_API_KEY` (Server-side only; never committed or sent to frontend). |
| **OpenStreetMap / Overpass API** | **Evaluated for Phase 3** | Free open-source geospatial query engine. Lacks consistent phone, tariff, and verified culinary specialty metadata in rural Karnataka. | No API key required; rate-limited to 1 req/sec per IP. |

---

### 4. Normalized Data Contracts
All place discovery endpoints communicate via normalized Pydantic v2 schemas (`app.schemas.places`):
- **`RestaurantRead`**: Captures stable ID, English/Kannada names, geographic coordinates, address, culinary tags (`south_indian`, `udupi_pure_veg`, `coorg_kodava`, `coastal_seafood`, `north_karnataka`), vegetarian status, price tier (`budget`, `mid_range`, `premium`), cost per person, pricing status (`verified`, `estimated`, `unknown`), opening hours, and source attribution.
- **`AccommodationRead`**: Captures stable ID, English/Kannada names, accommodation category (`hotel`, `resort`, `homestay`, `lodge`, `heritage`), geographic coordinates, address, price tier, nightly cost, pricing status, amenities list, verified booking reference URL, and official source attribution.

---

### 5. Failure Handling & Resiliency Rules
1. **Bounded Timeouts & Retries:** External provider queries must enforce a strict 3.0s timeout with maximum 1 retry.
2. **Deterministic Fallback:** If an external place provider times out, returns HTTP 4xx/5xx, or encounters missing credentials, `PlacesService` immediately falls back to `CuratedPlacesProvider`.
3. **No Fabricated Entities:** If no verified restaurant or accommodation exists within the specified radius, the system returns an honest empty list `[]` or a generic itinerary planning placeholder—**never** an invented business name or fake address.
4. **Distance Transparency:** Every returned place record calculates and reports the straight-line distance (`distance_km`) from the queried destination coordinates.

---

### 6. Caching & Freshness Policy
- **Curated Datasets:** Statically versioned and checked via continuous data quality scripts (`data/validation/audit_destination_quality.py`).
- **External API Results:** When live provider responses are enabled, cache responses for up to 7 days in-memory or Redis according to provider terms of service.
- **Pricing Freshness:** Stored records carry an explicit `verified_at` ISO-8601 timestamp. Stale records (> 90 days) are tagged as `estimated` or `needs_review`.

---

### 7. Security & Privacy Guarantees
- **Zero Client Secrets:** All external provider keys remain strictly server-side in backend environment variables.
- **Input Sanitization:** Geospatial coordinate inputs are strictly validated within WGS84 range `[-90, 90]` and `[-180, 180]` with radius capped at 100 km to prevent denial-of-service query floods.
- **Attribution Compliance:** Every place response preserves the `source_name` and `source_type` (`curated_verified`, `live_provider`, `cached_provider`) to comply with licensing and user trust mandates.

# Phase 3 Public-Transit Architecture & Journey Planning Design

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Phase:** Phase 3 — Statewide Destination Expansion, Public Transit Integration, Offline PWA  
**Date:** October 24, 2026  
**Auditor & Architect:** Senior Full-Stack & Transit Systems Architect  
**Status:** Canonical Reference Architecture

---

## 1. Architectural Overview

The Phase 3 Public-Transit Architecture seamlessly extends Namma Karnataka's existing backend routing services without breaking existing API contracts or relying on external unauthenticated real-time feeds.

```
                    ┌────────────────────────────────────────┐
                    │        FastAPI HTTP API Layer          │
                    │      (/api/v1/transit/* Endpoints)     │
                    └───────────────────┬────────────────────┘
                                        │
                    ┌───────────────────▼────────────────────┐
                    │            TransitService              │
                    │   (Domain Facade & Singleton Manager)  │
                    └───────────────────┬────────────────────┘
                                        │
                    ┌───────────────────▼────────────────────┐
                    │           TransitProvider              │
                    │        (Abstract Base Class)           │
                    └───────────────────┬────────────────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             │                                                     │
┌────────────▼──────────────┐                        ┌─────────────▼─────────────┐
│  CuratedTransitProvider   │                        │  RoutingService (Road)    │
│  - Spatial Catchment      │                        │  - Terrain-Adjusted       │
│  - Direct & 1-Hop Routing │                        │  - Winding Factors        │
│  - Static GTFS Timetable  │                        │  - Cab Cost Estimation    │
└────────────┬──────────────┘                        └─────────────┬─────────────┘
             │                                                     │
┌────────────▼──────────────┐                        ┌─────────────▼─────────────┐
│ data/seed/                │                        │ Compare Transit vs Road   │
│ transit_network.json      │                        │ (Carbon, Cost, Duration)  │
└───────────────────────────┘                        └───────────────────────────┘
```

---

## 2. Core Domain Models (`app.services.transit.models`)

### 2.1 `TransitStop`
Represents an authoritative bus terminal, railway station, or multimodal transit interchange in Karnataka:
- `stop_id`: Unique identifier (e.g., `stop-blr-majestic`, `stop-mys-suburban-bus`, `stop-hsp-railway-station`).
- `name_en` / `name_kn`: Bilingual official naming.
- `district_code`: District association (e.g., `KA-BLRU`, `KA-MYS`, `KA-VIJ`).
- `station_type`: `StationType` enum (`bus_terminal`, `railway_station`, `metro_station`, `bus_stop`).
- `latitude` / `longitude`: Exact WGS84 terminal coordinates.
- `distance_km`: Optional calculated spatial distance from query point.

### 2.2 `TransitLeg` & `TransitJourneyOption`
Models individual scheduled segments and complete end-to-end itineraries:
- `leg_id`, `transit_mode`, `line_name`, `route_number`.
- `departure_time` and `arrival_time` (HH:MM).
- `duration_minutes`, `distance_km`.
- `fare_inr` and `fare_status` (`verified`).
- `total_fare_min_inr` and `total_fare_max_inr`.
- `transfers_count`: 0 for direct corridors, 1 for hub transfers.
- `calculation_basis`: Explicit description of service type and layovers.
- `disclaimer`: Explicit static schedule notice.
- `is_realtime`: Guaranteed `false` for static feeds.

### 2.3 `TransitComparison`
Side-by-side evaluation between private road/cab travel and public transit:
- `road_distance_km`, `road_duration_minutes`, `road_method`, `road_estimated_cab_cost_inr`.
- `transit_options`: List of viable `TransitJourneyOption` objects.
- `transit_available`: Boolean indicating whether transit catchments exist.
- `carbon_comparison_note_en` / `carbon_comparison_note_kn`: Eco-conscious travel advice in English and Kannada.

---

## 3. Journey-Planning Algorithm

The journey planning engine implements a robust 3-stage algorithm:

### Stage 1: Spatial Catchment Discovery
Using the spherical Haversine formula, the engine searches for transit hubs within a 45 km radius of origin and destination coordinates:
$$\text{dist}(P_1, P_2) = 2 R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
This ensures destinations outside city centers (e.g. Belur, Hampi, Talakadu) successfully map to their corresponding regional transport nodes (Hassan, Hosapete, Mysuru).

### Stage 2: Direct Corridor Matching
The engine matches origin and destination stop IDs against verified direct trunk routes (KSRTC Rajahamsa/Airavat corridors and SWR rail lines). It computes:
- Next scheduled departure after requested `departure_time`.
- Expected arrival time based on typical running duration.
- Verified fare stage range.

### Stage 3: One-Transfer Hub Routing (Majestic Intermodal Node)
When no direct corridor exists between origin and destination hubs, the engine evaluates a 1-transfer itinerary via Bengaluru's central terminal (`stop-blr-majestic`):
- Leg 1 departs origin terminal to Bengaluru Majestic.
- Mandatory 30-minute layover is inserted at Majestic for transfer buffer.
- Leg 2 departs Bengaluru Majestic to destination terminal.
- Aggregate fares and durations are summed and presented with clear transfer disclosures.

---

## 4. API Endpoints

1. `GET /api/v1/transit/stops`
   - Parameters: `lat`, `lon`, `radius_km` (default: 25.0), `limit` (default: 10)
   - Discovers transit stations and terminals near given coordinates.

2. `GET /api/v1/transit/journeys`
   - Parameters: `origin_lat`, `origin_lon`, `dest_lat`, `dest_lon`, `departure_time` (default: "08:00"), `max_transfers` (default: 2)
   - Returns feasible public transit journey options with departure/arrival times, fares, and leg breakdowns.

3. `GET /api/v1/transit/compare`
   - Parameters: `origin_lat`, `origin_lon`, `dest_lat`, `dest_lon`, `departure_time`
   - Returns comparative metrics: road distance, duration, cab fuel/fare vs. transit fare and duration.

---

## 5. Security and Privacy Safeguards

1. **Zero Secret Leakage:** Transit endpoints are public read-only utilities requiring no sensitive client-side credentials.
2. **Deterministic Fallback:** If coordinates fall outside known Karnataka transit catchments, the endpoint returns `transit_available: false` while preserving the terrain-adjusted road estimate.
3. **Automated Test Validation:** 5 unit and integration tests (`backend/app/tests/test_transit_api.py`) run as part of the backend test suite, verifying stop discovery, corridor journey options, road comparison, and error handling.

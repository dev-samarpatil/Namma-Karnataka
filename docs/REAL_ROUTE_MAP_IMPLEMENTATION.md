# Real Road Route Map & Directions Implementation

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** October 2026  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Overview & Problem Statement

In previous phases, `MapView.tsx` was implemented as a mock SVG projection drawing straight dashed lines between geographic coordinates (`projectToSvg`) on a dark rectangle.

Key flaws identified:
1. **No Real Road Network:** Did not follow Karnataka's National Highways (NH), State Highways (SH), or ghat roads.
2. **Missing Road Polylines:** Rendered straight-line distance instead of actual driving paths.
3. **Overlapping Markers & Blank View:** Static SVG container failed to adapt to window resizes and rendered off-center when coordinates clustered.
4. **No Turn-by-Turn Directions:** Lacked an itemized per-leg routing panel.
5. **No External Navigation Link:** Travelers could not launch the journey into Google Maps on their mobile devices for live GPS turn-by-turn navigation.

---

## 2. Geospatial Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (React)                      │
│                                                             │
│   MapView.tsx (Leaflet + OpenStreetMap)                     │
│    ├── Numbered Waypoint Markers (#1, #2, #3, ...)         │
│    ├── Road Route Polylines (OSRM GeoJSON coordinates)      │
│    ├── Turn-by-Turn Leg Directions Panel                   │
│    └── "Open in Google Maps ↗" Deep Link                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ POST /api/v1/routing/directions
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       FastAPI Backend                       │
│                                                             │
│   RoadRoutingService (backend/app/services/routing/)        │
│    ├── Primary: OSRM Driving Route Service                  │
│    │     - Real road geometry (full GeoJSON polyline)       │
│    │     - Turn maneuvers, road names, leg distances        │
│    ├── Deep Link Builder: Google Maps Directions API URL    │
│    └── Fallback: TerrainAdjustedRoutingProvider             │
│          - Mountain/ghat pass tortuosity & elevation penalty│
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Details

### 3.1 Backend Route Engine (`RoadRoutingService`)
- **OSRM Integration:** Queries the standard open road-routing engine (`http://router.project-osrm.org/route/v1/driving/`) with `overview=full&geometries=geojson&steps=true`.
- **Coordinate Transformation:** Flips GeoJSON `[lon, lat]` tuples into Leaflet `[lat, lon]` arrays for direct polyline consumption.
- **Maneuver Extraction:** Parses OSRM step maneuvers into human-readable instructions (e.g., "Turn left onto NH 75", "Continue straight onto Madikeri Road").
- **Google Maps Navigation URL Builder:** Constructs official navigation deep links:
  `https://www.google.com/maps/dir/?api=1&origin=LAT,LON&destination=LAT,LON&waypoints=LAT,LON|...&travelmode=driving`
- **Resilient Fallback:** If the external road service is unavailable or offline, the system falls back seamlessly to `TerrainAdjustedRoutingProvider`, preserving route distance and feasibility without crashing.

### 3.2 FastAPI Endpoint (`POST /api/v1/routing/directions`)
Mounted at `/api/v1/routing/directions`, accepting:
```json
{
  "origin": {"name": "Bengaluru", "lat": 12.9716, "lon": 77.5946},
  "destination": {"name": "Mysuru Palace", "lat": 12.3051, "lon": 76.6551},
  "waypoints": [],
  "travel_mode": "driving"
}
```
Returns:
```json
{
  "provider": "osrm",
  "calculation_method": "road_network",
  "total_distance_km": 142.5,
  "total_duration_minutes": 180,
  "legs": [...],
  "all_coordinates": [[12.9716, 77.5946], ...],
  "google_maps_url": "https://www.google.com/maps/dir/?api=1&..."
}
```

### 3.3 Leaflet Interactive Map Component (`MapView.tsx`)
- **OpenStreetMap Tile Layer:** Clean, detailed base map rendered inside a dedicated 420px container.
- **Road Route Polyline:** High-contrast cyan/sky line (`#0284c7`, 5px weight) tracing the road network curves and intersections.
- **Numbered Waypoint Badges:** Sequence-numbered circular markers (#1, #2, #3, ...) with start ("S") and end ("E") badges.
- **FitBounds Auto-Centering:** Calculates geographic bounding boxes encompassing all destination waypoints and route vertices with padding.
- **Turn-by-Turn Leg Directions Panel:** Displays each journey leg (origin $\to$ destination) with distance, duration, and expandable turn maneuvers.
- **"Open in Google Maps ↗" Button:** Direct external navigation link for mobile GPS routing.
- **Map / List Alternative View:** Accessible coordinate list view with toggle button (`data-testid="toggle-map-list-view"`).

---

## 4. Verification Evidence

1. **Backend Tests (`backend/app/tests/test_routing_api.py`):**
   - Validates road routing calculation with waypoints.
   - Asserts valid Google Maps URL format (`https://www.google.com/maps/dir/?api=1`).
   - Asserts latitude/longitude boundary validation.
2. **Frontend Tests (`frontend/src/App.test.tsx`):**
   - Validates `itinerary-map-view` rendering with waypoint markers.
   - Validates toggling between map and list views (`map-list-alternative`).
3. **Execution Results:**
   - Pytest: 145 passed.
   - Vitest: 78 passed.

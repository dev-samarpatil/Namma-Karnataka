# Phase 7 Interactive Map Architecture

**Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)**  
**Version:** Phase 7.0  
**Library:** Leaflet 1.9.4 with React integration

---

## 1. Architectural Strategy & Library Selection

### Why Leaflet?
After evaluating mapping libraries during the Phase 7 Baseline Audit, **Leaflet 1.9.4** was selected over MapLibre GL for the following reasons:
1. **Lightweight Footprint:** Leaflet is ~40 KB gzipped with zero heavyweight WebGL / GPU shader requirements, ensuring rapid loading on mobile browsers and mid-range devices commonly used by travellers.
2. **Accessible DOM Marker Tree:** Renders markers as standard HTML/SVG elements with `role="button"`, `tabindex="0"`, and `aria-label` attributes, allowing screen readers and keyboard navigation.
3. **Open Standards & Tile Compliance:** Standard slippy map tile coordinates compatible with OpenStreetMap and cartographic guidelines.
4. **Resilient Offline Degradation:** If tiles are unreachable offline, the map gracefully renders cached destination points alongside a prominent, accessible List Alternative.

---

## 2. Tile Provider & Attribution Compliance

- **Provider:** OpenStreetMap Foundation Standard Tile Server.
- **Tile URL Template:** `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Subdomains:** `['a', 'b', 'c']`
- **Mandatory Attribution:**  
  `&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors`
- **Policy Compliance:**
  - Tile requests use standard user-agent and caching headers.
  - No scraping, bulk downloading, or private data injection into tile URLs.
  - Zoom levels bounded between `6` (state overview) and `17` (street level).

---

## 3. Geographic Bounds & District Focusing

- **Karnataka Bounding Box:**
  - Latitude: `11.5° N` to `18.5° N`
  - Longitude: `74.0° E` to `78.6° E`
- **State Geographic Center:** `[14.5, 75.8]` with default zoom `7`.
- **District Exploration:**
  Selecting a district from the dropdown centers the map on the coordinates of that district's destinations with smooth pan-to animation.

---

## 4. Layer Architecture & Nearby Overlays

```
┌────────────────────────────────────────────────────────┐
│                   Leaflet TileLayer                    │
│            (OpenStreetMap Standard Tiles)              │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Destination  │    │ Nearby Dining│    │ Nearby Stays │
│   Markers    │    │& Stays Layers│    │& Transit Hubs│
│  (Filtered)  │    │ (Places API) │    │(Transit API) │
└──────────────┘    └──────────────┘    └──────────────┘
```

1. **Destination Markers (Primary Layer):**
   - Color-coded badges indicating Category (Architecture, Nature, Waterfall, Heritage, Beach, etc.).
   - Clicking a marker highlights the card in the viewport and provides an action to open the full `DestinationModal`.
2. **Nearby Places Overlays:**
   - 🍴 **Dining:** Curated regional eateries (e.g. Vidyarthi Bhavan, MTR, Vinayaka Mylari).
   - 🏨 **Accommodations:** Verified KSTDC and JLR properties.
   - 🚉 **Transit Hubs:** Major KSRTC bus stands and railway junctions.
3. **Route Integrity:**
   - Public transit corridors are shown as straight-line connections or station markers.
   - Road curves are never fabricated or represented as real GPS navigation tracks without true turn-by-turn routing data.

---

## 5. Offline & Mobile Resilience

- **Online/Offline Awareness:** Detects network status via `useOnlineStatus`.
- **Offline Banner:** When offline, displays an informative banner:
  > *"Map tiles may be unavailable while offline. Destination markers and coordinates remain accessible in the List Alternative view."*
- **View Toggle:** Quick toggle button switches between Map View and List Alternative view with coordinate badges and distance indicators.

---

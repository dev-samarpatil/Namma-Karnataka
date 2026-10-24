# PHASE 9: INTERACTIVE MAP USABILITY SPECIFICATION

## Overview
Phase 9 hardens the geospatial experience in `DestinationInteractiveMap.tsx`, delivering intuitive, responsive, and accessible exploration of Karnataka's 31 districts.

---

## 1. Map Container Ergonomics & Heights

### 1.1 Responsive Viewport Heights
- **Desktop (>= 768px):** Height fixed at `480px` providing ample room for markers, district boundaries, and nearby overlays.
- **Mobile (< 768px):** Height set to `360px`, allowing users to pan/zoom without consuming the entire screen, ensuring scroll access to other page elements.
- **Min Height:** Guaranteed `300px` minimum to avoid container collapse in webview or orientation change.

### 1.2 Touch-Friendly Map Controls
- Leaflet zoom controls (`+` / `-`) have been styled with increased touch padding and 44px target bounds.
- Reset State View button (`🔄 Reset State View` / `ರಾಜ್ಯ ನೋಟ ಮರುಹೊಂದಿಸಿ`) placed in header bar to easily return to Karnataka central coordinates (`[14.5, 75.8]`, zoom `7`).

---

## 2. Selected Destination Flyout & Bottom Sheet

### 2.1 Adaptive Selected Place Card
- **Desktop Layout:** Floating overlay card positioned at the bottom-right corner of the map canvas (`right: 1rem; bottom: 1rem; max-width: 340px;`).
- **Mobile Touch Layout:** Anchored as a bottom sheet across the entire bottom edge (`left: 0.75rem; right: 0.75rem; bottom: 0.75rem; max-height: 220px;`).
  - Includes clear category badge, district tag, bilingual place name, short summary, and GPS coordinates.
  - Action buttons (`View Details`, `Plan With This`) span full width with 44px min-touch heights.

---

## 3. Nearby Layers & Touch Overlays

### 3.1 Overlay Checkbox Sizing
- Overlays for Dining (`🍴 Dining`), Accommodations (`🏨 Accommodations`), and Transit Hubs (`🚉 Transit Hubs`) are rendered with enlarged checkboxes and 44px touch envelopes.
- Non-blocking async loading indicator (`⏳ Loading layer...`) prevents duplicate fetches while markers stream in.

---

## 4. Accessibility & Offline Fallback

### 4.1 Accessible List Alternative
- Toggle button (`📋 List View` / `🗺️ Map View`) allows users who are visually impaired, using screen readers, or operating under extreme bandwidth constraints to toggle from Leaflet canvas to a fully accessible HTML `<ul>` list.
- Each row provides destination name, district, coordinates, and a direct `View Details` button.

### 4.2 Offline Disclosure Banner
- When device is offline (`useOnlineStatus() === false`), map displays an amber banner:
  - *English:* "You are currently offline. Map tiles may be cached or unavailable."
  - *Kannada:* "ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ. ನಕ್ಷೆಯ ಟೈಲ್ಸ್‌ಗಳು ಲಭ್ಯವಿಲ್ಲದಿರಬಹುದು."

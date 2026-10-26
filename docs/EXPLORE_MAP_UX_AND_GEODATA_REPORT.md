# Explore Map UX & Geospatial Systems Report

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** 2026-10-26  
**Auditor:** Principal Architect & Full-Stack Systems Lead  
**Scope:** Leaflet Map Usability, Zoom-Aware Marker Clustering, Pin Clutter Elimination, and Rich Popup Interaction.

---

## 1. Executive Summary

The Explore Destinations map (`DestinationInteractiveMap.tsx`) provides geographical exploration across Karnataka's 31 districts. Prior to this hardening phase, the map suffered from severe usability defects:
- Every destination marker permanently rendered an un-truncated text label (`<span class="marker-caption">${name}</span>`), causing 61 labels to collide into an unreadable mass of overlapping text across the state view.
- Pins lacked clustering at overview zoom levels.
- Markers lacked in-situ interactive popups, forcing users to glance down at a separate flyout card rather than interacting directly on the map.

The component has been comprehensively redesigned with clean category pins, zoom-aware district clustering, hover tooltips, and rich Leaflet popups with direct action buttons.

---

## 2. Problem Diagnosis & Usability Audit

| Defect Area | Previous Behavior | Usability Impact | New Design Implementation |
|---|---|---|---|
| **Pin Clutter** | `<span class="marker-caption">` permanently visible below all 61 pins | Severe text collision; pins obscured terrain, roads, and coastlines | Removed permanent captions. Clean circular glassmorphism pins with category emojis. Added hover tooltips (`bindTooltip`). |
| **State Overview** | All 61 individual pins rendered simultaneously at zoom 6–7 | Sensory overload; impossible to distinguish dense regions (e.g., Bengaluru, Hampi, coastal strip) | Zoom-aware district clustering at zoom $\le 7$. Displays badge count (e.g. `📍 4 Uttara Kannada`). Clicking zooms to level 9. |
| **Marker Interaction** | Clicking pin selected destination in React state but rendered no popup on the map pin | Disconnected experience; user had to look away from the map to view basic info | Rich interactive Leaflet popup with thumbnail, category badge, district, entry fee, visit duration, and action buttons. |
| **Modal Triggers** | No way to open destination details directly from the map pin | Broken user flow | Popup includes "Details" (opens modal) and "Plan" (triggers planner) buttons with event delegation. |

---

## 3. Implementation Architecture

### 3.1. Zoom-Aware Marker Hierarchy (`DestinationInteractiveMap.tsx`)
```tsx
const renderMarkers = () => {
  layer.clearLayers();
  const currentZoom = typeof map.getZoom === 'function' ? map.getZoom() : DEFAULT_ZOOM;

  // 1. Group by district at state overview zoom (zoom <= 7)
  if (currentZoom <= 7 && !selectedDistrict && !activeDestinationId) {
    const districtGroups: Record<string, DestinationRead[]> = {};
    validDestinations.forEach((d) => {
      const dCode = d.district?.code || d.district_code || 'KA';
      if (!districtGroups[dCode]) districtGroups[dCode] = [];
      districtGroups[dCode].push(d);
    });

    Object.entries(districtGroups).forEach(([code, group]) => {
      if (group.length === 0) return;
      const avgLat = group.reduce((sum, d) => sum + (d.coordinates?.lat || 0), 0) / group.length;
      const avgLon = group.reduce((sum, d) => sum + (d.coordinates?.lon || 0), 0) / group.length;
      const first = group[0];
      const distName = language === 'kn' && first.district?.name_kn ? first.district.name_kn : first.district?.name_en || code;

      const clusterHtml = `
        <div class="map-district-cluster" role="button" aria-label="${distName}: ${group.length} destinations">
          <span class="cluster-count">${group.length}</span>
          <span class="cluster-label">${distName}</span>
        </div>
      `;
      const clusterIcon = L.divIcon({ html: clusterHtml, className: 'custom-cluster-icon', iconSize: [120, 32], iconAnchor: [60, 16] });
      const clusterMarker = L.marker([avgLat, avgLon], { icon: clusterIcon });
      clusterMarker.on('click', () => map.setView([avgLat, avgLon], 9, { animate: true }));
      clusterMarker.addTo(layer);
    });
    return;
  }

  // 2. Render individual pins for zoom >= 8 or filtered view
  validDestinations.forEach((dest) => {
    // Renders clean circular marker with category emoji, hover tooltip, and rich popup
  });
};
```

### 3.2. Rich Popup Layout & Event Delegation
Each individual marker binds a styled popup:
```tsx
const popupHtml = `
  <div class="map-rich-popup" data-dest-id="${dest.id}">
    ${thumb ? `<div class="map-popup-thumb"><img src="${thumb}" alt="${name}" onerror="this.parentElement.style.display='none'" /></div>` : ''}
    <div class="map-popup-body">
      <div class="map-popup-badge-row">
        <span class="map-popup-cat">${categoryIcon} ${dest.category}</span>
        <span class="map-popup-dist">📍 ${distName}</span>
      </div>
      <h4 class="map-popup-title">${name}</h4>
      <div class="map-popup-meta">
        <span>🎟️ ${fee}</span>
        <span>⏱️ ${duration}</span>
      </div>
      <div class="map-popup-actions">
        <button type="button" class="btn-popup-details" data-action="details">ℹ️ Details</button>
        <button type="button" class="btn-popup-plan" data-action="plan">🧭 Plan</button>
      </div>
    </div>
  </div>
`;
```
Event delegation inside `marker.on('popupopen')` attaches handlers to `[data-action="details"]` and `[data-action="plan"]`, allowing direct modal opening and trip planning from the map pin.

### 3.3. CSS Glassmorphism Design (`frontend/src/index.css`)
- `.custom-leaflet-marker`: 36×36px dark circular badge with 2px cyan border (`#38bdf8`), drop shadow, and smooth hover scaling (`transform: scale(1.2)`).
- `.custom-leaflet-marker.selected`: Gold border (`#f59e0b`) with gold glow shadow (`box-shadow: 0 0 16px rgba(245, 158, 11, 0.8)`).
- `.map-district-cluster`: Pill-shaped badge with gold badge count circle and district label.
- `.leaflet-popup-content-wrapper`: Dark theme (`#0f172a`) with subtle white border and soft rounded corners.

---

## 4. Verification Evidence

1. **Clutter Elimination:** Map renders clean district cluster badges at state zoom; no overlapping text labels.
2. **Zoom Transitions:** Zooming past level 7 seamlessly unfolds individual destination pins with category emojis.
3. **Tooltip Verification:** Hovering over any pin displays the destination name in a clean tooltip.
4. **Popup Verification:** Clicking a pin opens the rich popup with photograph thumbnail, district, fee, duration, and working "Details" and "Plan" action buttons.
5. **Vitest Suite:** `DestinationInteractiveMap.test.tsx` passed with 100% assertions satisfied.

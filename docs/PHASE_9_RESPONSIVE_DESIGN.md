# PHASE 9: RESPONSIVE DESIGN SPECIFICATION

## Overview
Phase 9 eliminates all horizontal layout overflows, rigid pixel constraints, and unformatted elements across device viewports ranging from 320px narrow mobile devices up to 4K ultra-wide monitors.

---

## 1. Targeted Viewport Spectrum

| Breakpoint / Device | Viewport Width | Layout Strategy |
|---|---|---|
| **Compact Mobile (SE, Galaxy Z Fold Outer)** | 320px – 360px | Single-column cards, full-width search, bottom navigation, auto-wrapping tags |
| **Standard Mobile (iPhone 14/15/16, Pixel)** | 375px – 430px | Single-column grids, bottom navigation, bottom-sheet map flyout cards |
| **Tablet Portrait / Large Foldables** | 768px – 820px | 2-column card grid, top tab navigation, split planner panel |
| **Laptop & Desktop** | 1024px – 1366px | 3-column card grid, full interactive map with side controls |
| **Wide Desktop & 4K** | 1440px+ | Max-width content container (`1400px`), centered layout, 4-column destination grid |

---

## 2. Grid & Container Hardening

### 2.1 CSS Grid Overflow Elimination
- **Old Pattern:** `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`
  - *Defect:* Caused 32px horizontal scrolling overflow on 320px screens due to 16px page margins (`320px + 32px > 320px`).
- **Phase 9 Pattern:** `grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr))`
  - *Fix:* Safely collapses to 100% width on viewports below 280px, eliminating horizontal clipping while preserving balanced column auto-fill on larger displays.
- **Affected Grids:**
  - `.destinations-grid`: `minmax(min(100%, 280px), 1fr)`
  - `.saved-trips-grid`: `minmax(min(100%, 300px), 1fr)`
  - `.district-selection-grid`: `minmax(min(100%, 140px), 1fr)`

### 2.2 Fluid Search & Filter Bars
- `.search-bar-row`: Flex-wrap layout transitioning from inline search+filter on desktop to stacked full-width controls on mobile (`flex-direction: column` below 640px).
- `.filter-row`: Horizontal scrolling category chips with hidden scrollbar and momentum touch scrolling (`-webkit-overflow-scrolling: touch`).

---

## 3. Responsive Itinerary & Planning Forms

### 3.1 Single-Column Planner on Mobile
- Inputs for Origin, Travel Month, Pace, Interests, and Budget dynamically switch from multi-column grids to stacked single-column fields.
- Number stepper buttons maintain 44px min-touch areas with touch feedback.

### 3.2 Timeline & Day Stops
- Action buttons (`Edit`, `Alternatives`, `Lock`, `Remove`) in `.itinerary-stop-header` wrap smoothly into two rows on narrow viewports without truncating place titles.
- Route summary badges and travel duration chips use flexible flex-wrap layouts.

### 3.3 Budget & Breakdown Cards
- Cost breakdown tables transform to flexible cards or horizontally scrollable containers (`overflow-x: auto`) with visual fade indicators.

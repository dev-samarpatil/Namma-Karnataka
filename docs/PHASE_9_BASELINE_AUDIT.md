# Phase 9 — Baseline Audit and Usability Reconnaissance

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Phase:** Phase 9 — Map and Mobile Experience  
**Date:** 2026-10-24  
**Status:** BASELINE AUDIT COMPLETE  

---

## 1. Executive Summary

Phase 9 focuses on **Map and Mobile Experience: Navigation, Responsive Layouts, Accessibility, and Usability Optimization**.
Before implementing user interface and layout improvements, a thorough reconnaissance of the frontend application and map components was conducted across representative viewports:
- Mobile Small (320 × 640)
- Mobile Standard (375 × 812)
- Mobile Large (430 × 932)
- Tablet Portrait (768 × 1024)
- Tablet Landscape (1024 × 768)
- Desktop (1366 × 768 / 1440 × 900)

---

## 2. Test Baseline Verification

Prior to Phase 9 modifications, all test suites were executed and verified:
- **Backend Tests (Pytest):** 141 passed in 9.20s (100% green).
- **Frontend Tests (Vitest):** 71 passed across 13 test files in 5.66s (100% green).
- **Production Build:** `tsc -b && vite build` succeeded in 2.01s with 0 errors.

---

## 3. Usability & Responsive Findings Matrix

| Component | Current State | Usability / Responsive Defect | Phase 9 Action Item |
|---|---|---|---|
| **Header Navigation** | Single horizontal row of 4 buttons with fixed padding and labels. | On screens <640px, tabs overflow or force horizontal scrolling; brand text wraps awkwardly. | Implement mobile bottom navigation bar for small screens + responsive compact header with safe touch targets. |
| **Grid Layouts** | `.destinations-grid` uses `minmax(320px, 1fr)`. | On 320px devices with 32px padding (288px available), cards overflow horizontally by 32px. | Adjust grid to `minmax(min(100%, 280px), 1fr)` and add responsive breakpoints. |
| **Interactive Map** | `DestinationInteractiveMap.tsx` has Leaflet map but lacks responsive CSS rules for heights and flyout card. | Map container can collapse or dominate mobile viewports; selected flyout card covers zoom controls. | Style `.leaflet-actual-map` with responsive height (340px on mobile, 480px on desktop) and responsive bottom-sheet flyout. |
| **Touch Targets** | Small filter chips, close buttons, and stop action buttons <36px. | Users on touch devices experience mis-taps; fails WCAG 2.1 AA touch target target (44px). | Ensure touch targets are min 44px or padded with adequate hit areas. |
| **Trip Planner Form** | Multi-column grid on desktop. | Labels and inputs squeeze on narrow screens. | Adopt responsive single-column layout on mobile (<640px) with touch-friendly selector chips. |
| **Itinerary Timeline** | Horizontal flex layout for stop headers and action buttons. | On mobile, action buttons (edit, lock, regen, delete) clip stop names and times. | Stack stop actions into a compact responsive action bar with icon + text on mobile. |
| **Budget Summary** | Wide category breakdown table. | Causes horizontal scrolling on phone screens. | Implement responsive stacked category cards for viewports <768px. |
| **Kannada Typography** | Long Kannada compound nouns can break mid-syllable or clip on fixed width containers. | Glyph clipping and layout shift in Kannada mode. | Remove fixed pixel widths, use `overflow-wrap: break-word`, ensure appropriate line-height (1.6). |
| **Accessibility & Focus** | Default browser outline or missing visible focus rings. | Keyboard-only travellers cannot track active element on dark theme. | Add explicit `:focus-visible` styling with high contrast gold/cyan outlines. |
| **Reduced Motion** | CSS transitions without `@media (prefers-reduced-motion: reduce)`. | Animated transitions can cause motion discomfort. | Add global reduced-motion overrides. |

---

## 4. Implementation Plan & Workstreams

- **Workstream A:** Responsive Navigation Architecture (`Header.tsx` & Mobile Navigation).
- **Workstream B:** Responsive Breakpoint System & Grid Hardening (`index.css`).
- **Workstream C:** Interactive Map Usability & Touch Enhancements (`DestinationInteractiveMap.tsx`).
- **Workstream D:** Mobile Itinerary Planning, Stop Actions & Budget Cards (`TripPlannerForm.tsx`, `ItineraryView.tsx`, `BudgetSummary.tsx`).
- **Workstream E:** Mobile Destination Discovery & Compact Filters (`DestinationDiscovery.tsx`).
- **Workstream F:** Saved Trips & Account UX on Mobile (`SavedTripsView.tsx`).
- **Workstream G:** Touch Targets, a11y, Focus Rings, and Reduced Motion.
- **Workstream H:** Performance & Mobile Network Efficiency.
- **Workstream I:** Bilingual English/Kannada Responsive Verification.
- **Workstream J:** Tests & Verification Suite.

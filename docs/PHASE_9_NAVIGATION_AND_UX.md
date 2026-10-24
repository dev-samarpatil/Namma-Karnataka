# PHASE 9: NAVIGATION AND USER EXPERIENCE SPECIFICATION

## Overview
Phase 9 elevates Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ) navigation and user experience to native-app feel across all mobile, tablet, and desktop devices. The experience delivers responsive, accessible, and thumb-friendly navigation while preserving state and supporting full bilingual parity in Kannada and English.

---

## 1. Responsive Navigation Architecture

### 1.1 Dual Navigation Pattern
- **Desktop (>= 768px):** Traditional top navigation header with tab bar (`.header-nav.desktop-nav`), displaying full textual and icon indicators.
- **Mobile (< 768px):** Fixed bottom navigation bar (`.mobile-bottom-nav`) adhering to standard mobile navigation ergonomics and OS safe area insets.

```
+--------------------------------------------------------------+
| Desktop: Top Brand + Language Switcher + Navigation Tabs    |
+--------------------------------------------------------------+
| Active Tab: [🔍 Explore]  [✨ Plan]  [🗺️ Itinerary] [💾 Saved] |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| Mobile: Compact Brand + Language Switcher                    |
+--------------------------------------------------------------+
| Main Scrollable Content (bottom-padded for nav bar)         |
+--------------------------------------------------------------+
| [🔍 Explore]   [✨ Plan]   [🗺️ Itinerary ●]   [💾 Saved (3)]  |  <- Fixed Bottom Bar
+--------------------------------------------------------------+
```

### 1.2 Bottom Navigation Attributes & Accessibility
- **Tag:** `<nav className="mobile-bottom-nav" aria-label="Mobile Navigation">`
- **Active State:** Each button exposes `aria-current={currentTab === tab ? 'page' : undefined}` and `.active` class with distinctive gold accent (`#D4AF37`) and subtle top-bar indicator.
- **Touch Targets:** Minimum dimension of 44px x 44px (`min-height: 44px; min-width: 44px;`) complying with WCAG 2.1 Success Criterion 2.5.5 (Target Size).
- **Z-Index:** Set to `z-index: 1000`, floating above scrollable views and beneath focused modals (`z-index: 2000`).
- **Safe Area Insets:** Employs `padding-bottom: max(0.4rem, env(safe-area-inset-bottom))` ensuring clearance on iOS home indicators and Android gesture bars.

---

## 2. Navigation State & Badge Indicators

### 2.1 Dynamic State Badges
- **Active Plan Indicator (`hasActivePlan`):**
  - Desktop: `.tab-badge` red/gold dot alongside "Itinerary" tab.
  - Mobile: `.mobile-tab-badge` badge floating over itinerary icon.
- **Saved Trips Counter (`savedTripsCount`):**
  - Desktop: `.tab-count-badge` displaying count of locally saved or cloud trips.
  - Mobile: `.mobile-tab-count` notification pill displaying total trip count.

### 2.2 Preserving State Across Tab Transitions
- Navigation between tabs does not trigger full page reload or unmount root state.
- Filters, active search query, selected district, map zoom/center, and unsaved draft itineraries are retained in root component state.

---

## 3. Bilingual Support & Kannada Typography
- Tab labels dynamically translate between English and Kannada:
  - Explore: `navExplore` ("Explore" / "ಅನ್ವೇಷಿಸಿ")
  - Plan: `navPlan` ("Plan Trip" / "ಪ್ರವಾಸ ಯೋಜನೆ")
  - Itinerary: `navItinerary` ("Itinerary" / "ಪ್ರವಾಸ ವಿವರ")
  - Saved: `navSavedTrips` ("Saved Trips" / "ಉಳಿಸಿದ ಪ್ರವಾಸಗಳು")
- Text wrapping styles (`overflow-wrap: break-word`, `word-break: break-word`) ensure complex Kannada conjuncts (`ಒತ್ತಕ್ಷರಗಳು`) render legibly without overflowing button boundaries.

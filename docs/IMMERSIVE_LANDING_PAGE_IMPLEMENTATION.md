# Namma Karnataka — Immersive Landing Page Implementation

## 1. Executive Summary & Objective

This document records the architectural and interaction design implementation of the cinematic, scroll-expanding landing page for **Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)**.

The landing page provides a high-fidelity, editorial travel-discovery experience inspired by modern interaction design references while strictly adhering to the project's existing React 18, Vite, TypeScript, and Tailwind CSS architecture. It introduces travelers to Karnataka's geographic realms and architectural wonders, and connects directly to the existing destination discovery catalogue, multi-day itinerary planner, and local/cloud saved-trips capabilities.

---

## 2. Component Architecture

The implementation is located under `frontend/src/features/landing/` and consists of two primary modules:

### 2.1 `ScrollExpansionHero.tsx`
* **Role**: The cinematic hero section featuring authentic Karnataka video/photography (`back.mp4` in background, `front-.mp4` in central focus panel), split-heading typography, restrained perimeter vignette, and gentle sound controls.
* **Component Interface**:
  ```typescript
  export interface ScrollExpansionHeroProps {
    language: Language;
    onExploreClick?: () => void;
    onPlanClick?: () => void;
  }
  ```
* **Internal Structure & Layout Refinement**:
  * **Deliberate Hero Section**: Instead of artificial multi-screen runways (`190vh`-`240vh`), the hero uses a deliberate, responsive height: `clamp(620px, calc(100vh - 72px), 820px)` on desktop and `min-height: 560px, height: auto` on mobile. This eliminates empty whitespace and brings Section 2 into immediate, natural positioning.
  * **Restrained Perimeter Vignette (No White Fog)**: Replaced heavy radial overlays with an ultra-subtle perimeter vignette (`radial-gradient(ellipse 95% 85% at center, transparent 72%, rgba(250, 252, 255, 0.25) 90%, rgba(250, 252, 255, 0.75) 100%)`). 72%+ of the destination media remains 100% crystal clear with no white fog, preserving authentic colors, coastlines, and forests.
  * **Video Clarity**: `back.mp4` runs with zero blur (`opacity: 0.96`, `filter: brightness(0.94) contrast(1.02)`).
  * **Split Typography**: "DISCOVER" / "ಕರ್ನಾಟಕವನ್ನು" and "KARNATAKA" / "ಅನ್ವೇಷಿಸಿ" rendered with high-contrast text shadows (`0 4px 20px rgba(0,0,0,0.85)`), remaining sharp and legible without washing out the media.
  * **Central Media Panel**: Embedded `front-.mp4` in sharp focus with subtle scale and border radius smoothing on scroll, and a gentle unmuted audio toggle (tuned to 22% volume).
  * **Direct Action & Skip Controls**: Accessible CTA buttons ("Explore All Destinations", "Plan Your Itinerary") and scroll down indicator.

### 2.2 `ImmersiveLandingPage.tsx`
* **Role**: The full landing page assembling the hero with subsequent editorial and functional sections:
  1. **Cinematic Hero**: Embedded `ScrollExpansionHero`.
  2. **Three Geographical Realms Showcase**:
     * **Karavali Coastal (ಕರಾವಳಿ ತೀರ)**: Gokarna, Murudeshwar, Udupi, Karwar.
     * **Malnad Rainforests (ಮಲೆನಾಡು ಅರಣ್ಯ)**: Coorg, Chikmagalur, Agumbe, Kudremukh, Jog Falls.
     * **Bayaluseeme Plateau (ಬಯಲುಸೀಮೆ ಪ್ರಸ್ಥಭೂಮಿ)**: Hampi, Mysuru, Badami, Pattadakal, Belur.
  3. **Curated Highlights Grid**: Queries verified destinations from `api.listDestinations({ limit: 6, lang: language })`. Integrates directly with `DestinationCard` and opens `DestinationModal` and `TripPlannerForm`.
  4. **Architecture & Platform Capabilities**: Highlights the four core pillars:
     * *Discover Destinations* (curated filters, 31 districts, offbeat gems).
     * *Intelligent Itinerary* (feasible drive times, meal pauses, visit durations).
     * *Geo-Accurate Navigation* (verified GPS coordinates, highway routing).
     * *Save & Collaborate* (guest local storage and Supabase cloud sync).
  5. **Expedition CTA Banner**: Prominent navigation triggers to "Explore All Destinations", "Plan Your Itinerary", and "View Saved Trips".

---

## 3. Adaptation of Reference Design to React + Vite

The provided design reference was tailored for Next.js and external utility libraries. In Namma Karnataka:

1. **No Next.js or `next/image`**:
   Standard HTML `<img>` and `<video>` tags are used with `loading="eager"` (for the primary hero) and `loading="lazy"` (for below-the-fold cards), along with CSS `object-fit: cover` and reliable fallback handlers.
2. **No shadcn/ui or Framer Motion Dependency Bloat**:
   Smooth scroll interpolation is implemented directly with CSS transforms, CSS transitions, and lightweight React scroll position listeners wrapped in `requestAnimationFrame` and unmounted cleanly.
3. **Strict Dark Navy Visual Identity**:
   Tailored to Namma Karnataka's palette (`#0a0f1d` deep navy canvas, `#38bdf8` cyan accents, `#f59e0b` amber highlights, and `#f8fafc` crisp white typography) rather than generic white borders.

---

## 4. Authentic Karnataka Destination Media

### 4.1 Primary Hero Photograph
* **Location**: **Hampi (ಹಂಪಿ)** — Garuda Stone Chariot at the Vijaya Vittala Temple Complex, Ballari/Vijayanagara District.
* **Asset URL**:
  `https://upload.wikimedia.org/wikipedia/commons/4/4b/Hampi_Garuda_stone_chariot.jpg`
  (Routed via `/api/v1/destinations/media/proxy?url=...` for disk/memory caching and CORS resilience).
* **Photographer & Licence**:
  `Photograph by Dey.sandip (Wikimedia Commons, CC BY-SA 3.0)`. Displayed directly on the central media panel badge.
* **Secondary Fallback Asset**:
  Mysuru Palace (`Mysore_Palace_Morning.jpg` by Muhammad Mahdi Karim, GNU FDL 1.2 / CC BY-SA 3.0) and Jog Falls (`Jog_falls.jpg`).

### 4.2 Streamlined Dual-Video Architecture (`back.mp4` & `front-.mp4`)
* **Background Layer (`back.mp4`)**:
  - Serves as the rich, visible cinematic backdrop across the landing page hero viewport.
  - **Balanced Depth & Clarity**: Tuned to a subtle `blur(2px)` with `brightness(0.85)` and `opacity: 0.88`, ensuring the background video scenes, motion, and colors are crisp, recognizable, and vibrant, while still allowing the foreground text and central media panel to pop.
  - Plays continuously with `autoPlay`, `loop`, `muted`, and `playsInline`.
* **Foreground Central Panel (`front-.mp4`)**:
  - Plays in high definition, razor-sharp focus within the central expanding media panel.
  - **Clean & Unobstructed**: Stripped of all overlay text, badges, or title cards on the video itself.
  - **Gentle Low-Volume Audio**: Configured with a soft, ambient volume level (`volume = 0.22`, ~22% volume) rather than being fully muted, delivering an immersive acoustic background without startling the user.
  - **Autoplay Permission Resilience**: Attempts unmuted playback with 22% volume; if the browser's autoplay policy delays audio before user interaction, it automatically unmutes to 22% on the user's first scroll/click gesture.
  - **Discreet Sound Toggle**: A minimalist, semi-transparent circular toggle button (`🔉` / `🔇`) in the bottom-right corner allows instant audio muting or unmuting with a single click.
  - Dynamically scales and expands with user scroll from a compact card (`min(340px, 80vw) x 240px`) to a full panoramic showcase (`min(1180px, 94vw) x 560px`).
* **Simplified Interaction**:
  - The mode toggle selector has been removed to deliver a clean, focused, cinematic video-first landing experience on initial visit.

---

## 5. Scroll Expansion Animation Engine

### 5.1 Physics & Interpolation
* The runway container measures `240vh`.
* A scroll handler calculates `progress = clamp((window.scrollY - runwayTop) / runwayHeight, 0, 1)`.
* Calculation runs inside `window.requestAnimationFrame` to ensure 60fps rendering without jank or layout thrashing.
* Dynamic dimensions:
  * Width: interpolated from `min(340px, 80vw)` to `min(1180px, 94vw)`.
  * Height: interpolated from `240px` to `560px`.
  * Border Radius: interpolated from `28px` to `12px`.
  * Background dimming: opacity shifts from `0.45` to `0.85` to emphasize expanded media.
  * Typography displacement: "DISCOVER" translates `-120px` to the left, and "KARNATAKA" translates `+120px` to the right as progress nears completion.

### 5.2 Freedom of Scroll & Reduced Motion
* **No Scroll Trapping**: No `window.scrollTo(0, 0)`, no permanent `e.preventDefault()`, and no wheel event interception.
* **Accessible Skip**: A prominent "Skip to Content" button on the hero immediately advances past the runway.
* **Reduced Motion**: Under `@media (prefers-reduced-motion: reduce)`, transitions are minimized and elements render directly in steady states.

---

## 6. Integration With Existing Navigation & State

The landing page connects seamlessly with the existing application architecture in `App.tsx` and `Header.tsx`:

* **ActiveTab Navigation**:
  `ActiveTab` was extended to include `'home' | 'discovery' | 'planner' | 'itinerary' | 'saved-trips'`.
* **State Preservation**:
  * Switching between `'home'` and `'planner'` preserves any in-progress trip configuration.
  * Generated itineraries and locked activities remain intact when returning to the landing page.
  * Guest-saved trips in `localStorage` and Supabase cloud sessions remain active.
* **Direct Destination Exploration**:
  * Clicking "View Details" on any featured card opens the existing `DestinationModal` with photographs, operating hours, ticket fees, nearby food/stay listings, and verified sources.
  * Clicking "Plan Trip with This" passes the destination to `onPlanWithDestination`, switching to the `'planner'` tab and setting the trip focus.
* **Bilingual Parity**:
  All hero copy, geographic realm descriptions, capability cards, and CTA buttons are translated in `frontend/src/lib/i18n.ts` in both English (`en`) and Kannada (`kn`).

---

## 7. Responsive and Accessibility Decisions

* **Desktop**: Full-width cinematic composition with split lateral typography, side-by-side mode switcher, and 3-column geographic realm showcase.
* **Tablet**: Scaled central panel with proportional font clamp (`clamp(2rem, 7vw, 5.5rem)`).
* **Mobile**: Central panel respects `min(340px, 80vw)` avoiding viewport horizontal overflow. Split typography wraps gracefully without obscuring the central media panel.
* **Keyboard & Screen Readers**:
  * Semantic heading hierarchy (`h1`, `h2`, `h3`, `h4`).
  * Visible focus rings on all buttons and toggles.
  * `aria-label` and `aria-pressed` on the Photo/Video mode switcher.
  * `role="region"` with descriptive accessible labels on interactive media panels.

---

## 8. Verification Results

### 8.1 Automated Unit & Integration Tests
Executed Vitest test suite (`18 test files, 104 tests passed`):
* `src/features/landing/ScrollExpansionHero.test.tsx` (4 tests passed):
  - Renders bilingual headings in English and Kannada.
  - Toggles between Photo and Video modes.
  - Respects skip cue and action button.
* `src/features/landing/ImmersiveLandingPage.test.tsx` (4 tests passed):
  - Renders hero, regional diversity cards, and 4 architecture pillars.
  - Loads featured destinations and opens `DestinationModal` with detailed Tudor-style summary.
  - Navigates to `'discovery'`, `'planner'`, and `'saved-trips'` when CTA buttons are clicked.
  - Gracefully handles backend network failure without crashing, rendering `data-testid="discovery-error"`.
* `src/components/layout/Header.test.tsx` (7 tests passed):
  - Renders Home tab on desktop and mobile.
  - Handles tab switches and brand click navigation to home.
* `src/App.test.tsx` (5 tests passed):
  - Full end-to-end bilingual journey, modal opening, trip generation, budget calculation, and offline persistence.

### 8.2 Production Build & Type Checking
Executed `npm run build` in `frontend/`:
```bash
> tsc -b && vite build
vite v5.4.21 building for production...
✓ 60 modules transformed.
dist/index.html                   0.83 kB │ gzip:   0.50 kB
dist/assets/index-CyT-SPig.css   56.10 kB │ gzip:  14.31 kB
dist/assets/index-Bi_WrJjc.js   609.03 kB │ gzip: 175.90 kB
✓ built in 3.06s
```

---

## 10. Light Theme Gradient Dots Background & Interactive Architecture

### 10.1 Interactive Component: `GradientDots.tsx`
* **Path**: `frontend/src/components/ui/gradient-dots.tsx`
* **Features**:
  - Pure React + SVG + CSS keyframes (completely dependency-free, no heavy canvas, no `framer-motion` bloat).
  - SVG repeating `<pattern>` for crystal-clear, evenly-spaced vector dots at any screen density and zoom level.
  - 4 diffuse, oversized radial pastel blobs (cyan, mint, lavender, warm amber) floating slowly on GPU-composited CSS `@keyframes` transforms (`floatSlow1`–`floatSlow4`).
  - Subtle breathing ambient color cycle via `@keyframes pastelCycle` with configurable `colorCycleDuration`.
  - **Interactive Pointer & Touch Tracking**:
    - Smooth linear interpolation (lerp factor: `0.16`) via `requestAnimationFrame` tracking `--pointer-x`, `--pointer-y`, and `--pointer-opacity` without abrupt jumps.
    - Soft localized pastel glow (`360px` radial gradient of cyan, blue, lavender) following pointer movement with `mix-blend-mode: multiply`.
    - Localized illuminated dot layer: SVG pattern masked with `radial-gradient(260px circle)` around the pointer, brightening dots to `#0891B2` at `opacity: 0.85` and expanding radius by `1.5x`.
    - **Touch & Mobile Support**: Touch gestures reveal the soft glow and illuminated dots at the tap location, then smoothly fade out after 850ms without interfering with vertical scroll.
    - **Resource Efficiency**: Stops the RAF loop when the pointer is idle or out of bounds (zero high-frequency processing when not interacting).
    - Non-intrusive: strict `pointer-events: none` and `aria-hidden="true"`, sitting behind content (`z-index: 0`).
  - Respects `@media (prefers-reduced-motion: reduce)` by disabling all floating, color cycle, and pointer-following animations.
* **Component Interface**:
  ```typescript
  export interface GradientDotsProps {
    dotSize?: number;            // Default: 1.5px
    spacing?: number;            // Default: 20px
    duration?: number;           // Default: 36s
    colorCycleDuration?: number; // Default: 18s
    backgroundColor?: string;    // Default: '#FAFCFF'
    className?: string;
    style?: React.CSSProperties;
    interactive?: boolean;       // Default: true
    children?: React.ReactNode;
  }
  ```

### 10.2 Root Shell Scoping & Light Theme Layout
* **Global Background Root Cause Fix**:
  - `App.tsx` dynamically adds `.landing-body-light` to `document.body` and `.app-landing-mode` to `.app-layout` when on the `'home'` tab.
  - Automatically resets when switching to `'discovery'`, `'planner'`, `'itinerary'`, or `'saved-trips'`, maintaining dark mode across other views.
* **Layout Reset**:
  - `.app-layout.app-landing-mode .app-main`: Removes the `1200px` max-width constraint, margin, and padding (`max-width: 100% !important; padding: 0 !important; background-color: #FAFCFF !important;`), eliminating dark sidebars and horizontal stripes.
* **Light Theme Header & Navigation**:
  - `.app-header`: Translucent warm white surface (`rgba(255, 255, 255, 0.94)`), blur backdrop, subtle slate border (`rgba(226, 232, 240, 0.9)`), dark titles (`#172033`), amber subtitle (`#D97706`), and cyan active tab indicator (`#0891B2`).
  - `.lang-switcher-btn`: White surface, slate border, and cyan typography.
  - `.mobile-bottom-nav`: Translucent white surface with cyan active indicators.
* **Light Theme Footer**:
  - `.app-footer`: `#FAFCFF` background, subtle top border, readable slate text (`#475569` / `#94A3B8`).

### 10.3 Test Suite & Verification Results
* Executed Vitest test suite (`19 test files, 112 tests passed`):
  - `src/components/ui/gradient-dots.test.tsx` (8 tests passed):
    - Renders with `aria-hidden="true"` and `data-testid="gradient-dots-background"`.
    - Correctly renders SVG pattern with customizable `dotSize` and `spacing`.
    - Spawns all 4 pastel gradient blobs (`.blob-cyan`, `.blob-mint`, `.blob-lavender`, `.blob-amber`).
    - Renders interactive pointer glow and highlight layers when `interactive={true}`.
    - Gracefully hides interactive layers when `interactive={false}`.
    - Handles window pointer movements, touches, and pointer leave events cleanly.
    - Applies custom `backgroundColor` and renders decorative children.
* Production build verified via `npm run build` (`tsc -b && vite build`):
  - Built cleanly in 2.29s with zero TypeScript or bundling errors.

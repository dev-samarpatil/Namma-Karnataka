# Phase 3 Progressive Web App (PWA) & Offline Architecture Design

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Phase:** Phase 3 — Statewide Destination Expansion, Public Transit Integration, Offline PWA  
**Date:** October 24, 2026  
**Auditor & Architect:** Senior PWA & Offline Systems Architect  
**Status:** Canonical Reference Architecture

---

## 1. Executive Summary

Phase 3 introduces progressive web application capabilities to Namma Karnataka, enabling reliable offline exploration of all 61 destinations across Karnataka's 31 districts, review of saved trip itineraries without internet connectivity, and installability on desktop and mobile operating systems.

The core guiding principle is: **Honest offline UX with zero data leakage.** Offline capabilities must never falsely indicate that live searches, booking lookups, or server-side sync operations succeeded when disconnected.

---

## 2. Web App Manifest (`public/manifest.webmanifest`)

The application identity conforms strictly to the W3C Web App Manifest specification:
- `name`: "Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)"
- `short_name`: "Namma Karnataka"
- `description`: "Discover destinations, compare road vs public transit, and plan rich itineraries across all 31 districts of Karnataka."
- `start_url`: "/"
- `display`: "standalone"
- `orientation`: "portrait-primary"
- `theme_color`: "#0f766e" (Signature Karnataka deep teal)
- `background_color`: "#ffffff"
- `icons`:
  - `images/icon-192.svg` (192x192, SVG vector for sharp rendering across display densities)
  - `images/icon-512.svg` (512x512 maskable SVG vector)

---

## 3. Service Worker Engine (`public/sw.js`)

The service worker implements targeted caching strategies partitioned by resource sensitivity:

```
                                  Client Request
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
            Is Static Asset?                         Is API Request?
         (/, .js, .css, icons)                  (/api/v1/destinations, etc.)
                    │                                       │
        ┌───────────▼───────────┐               ┌───────────▼───────────┐
        │      Cache-First      │               │     Network-First     │
        │                       │               │                       │
        │ 1. Match in Cache     │               │ 1. Fetch from Network │
        │ 2. If Miss: Network   │               │ 2. On 200: Save Cache │
        │ 3. Update Cache       │               │ 3. On Fail: Fallback  │
        └───────────────────────┘               └───────────────────────┘
```

### Cache Versioning
- `STATIC_CACHE_NAME`: `'namma-karnataka-static-v1'`
- `API_CACHE_NAME`: `'namma-karnataka-api-v1'`
- Obsolete cache buckets are evicted automatically during the `activate` event.

---

## 4. Resource Categorization & Privacy Boundaries

| Resource Classification | Target Path | Caching Strategy | Storage Location | Privacy Scope |
| :--- | :--- | :--- | :--- | :--- |
| **App Shell** | `/index.html`, bundle scripts, styles | Cache-first with network fallback | Service Worker Cache | Public |
| **Public Destination Catalogue** | `/api/v1/destinations` | Network-first with offline fallback | SW Cache & `localStorage` (`nk_offline_destinations_v1`) | Public |
| **Public Transit Corridors** | `/api/v1/transit/*` | Network-first with cache fallback | SW Cache | Public |
| **Guest Saved Trips** | Local itinerary bookmarks | Client-side persistent JSON | `localStorage` (`nk_saved_trips`) | Private to device profile |
| **Authenticated Cloud Trips** | `/api/v1/trips/*` | Network-only (Bearer JWT required) | Supabase Cloud Database + In-memory | Private per authenticated user; never in public SW cache |

**Zero Leakage Guarantee:** Private trip responses from authenticated endpoints are never stored in the shared service worker public API cache.

---

## 5. Offline Destination Discovery & Local Filtering

When connectivity drops, `DestinationDiscovery.tsx` falls back to `offlineStorage.ts`:
1. **Local Keyword Matching:** Filters cached records by English name, Kannada name, and summaries using case-insensitive substring search.
2. **District Code Filtering:** Filters destinations against all 31 districts locally.
3. **Category & Offbeat Filtering:** Matches destination categories and offbeat flags in-memory.
4. **Honest Freshness Disclosure:** The UI attaches a visible status badge:
   `⚡ Cached Content (Cached on HH:MM:SS)`
   ensuring travelers know the data was retrieved prior to going offline.

---

## 6. Connectivity State & UX Feedback

The application exposes real-time connectivity feedback via `useOnlineStatus`:
- When offline: Persistent amber banner at top of application shell:
  `📶 You are currently offline. Viewing cached travel intelligence. Live searches and cloud sync will resume when connected.`
- When reconnected: Emerald confirmation toast:
  `🌐 Back online! Connected to Namma Karnataka server.`

---

## 7. Verification & Automated Test Results

The PWA and offline subsystems are verified by automated tests:
1. `src/services/offlineStorage.test.ts`:
   - Saves and retrieves offline destinations.
   - Filters offline destinations by district code.
   - Filters offline destinations by offbeat gem status.
   - Filters offline destinations by keyword in both English and Kannada.
   - Gracefully handles storage access without crashes.
2. `npm run build`: Production bundle builds successfully with manifest and service worker copied to `dist/`.

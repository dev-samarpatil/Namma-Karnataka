# Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ) — Phase 6 Offline & Guest Trip Preservation Design
**Canonical Scope:** Offline Guest Trip Isolation, LocalStorage Preservation, PWA Caching Boundaries, and Deferred Cloud Sync  
**Execution Environment:** Browser LocalStorage • Service Worker • PWA Manifest • React 18  
**Date:** October 2026  
**Status:** IMPLEMENTED & VERIFIED

---

## 1. Overview and Core Philosophy

Namma Karnataka operates with a strict "Offline First, Privacy Preserved" philosophy:
1. **Uninterrupted Guest Access:** Travellers can explore destinations, plan itineraries, and save multi-day trips in guest mode without ever being forced to create an account or provide an email.
2. **Deterministic Local Storage:** Guest trips are stored in `localStorage['nk_saved_trips']` using structured snapshots.
3. **PWA Offline Catalogue:** The 61 destination seed records and public UI assets are cached via the service worker, allowing discovery and filtering without an active internet connection.
4. **No Unsolicited Sync:** Signing into a user account NEVER automatically merges or uploads guest trips without explicit consent.

---

## 2. Storage Boundaries & Isolation Matrix

| Storage Domain | Storage Mechanism | User Identity Required? | Sharing / Cloud Supported? |
|---|---|---|---|
| **Guest Trips** | `localStorage['nk_saved_trips']` | No (Anonymous / Guest) | No. Confined exclusively to local device storage. |
| **Cloud Trips** | Supabase PostgreSQL (`trips` table) | Yes (Authenticated JWT) | Yes. Supported with Owner/Editor/Viewer access rules. |
| **Catalogue & Assets** | Service Worker Cache / IndexedDB | No (Public Asset Cache) | Read-only. Available offline to all users. |

---

## 3. Explicit Cloud Synchronization Protocol (Evaluated & Deferred)

### 3.1 Architectural Assessment
During Phase 6 workstream audit, an automatic background synchronization mechanism was analyzed. It was determined that automatic sync presents severe hazards:
- Accidental account contamination (syncing shared device trips onto a personal profile).
- Data loss from uncoordinated merge conflicts.
- Security exposure of private guest notes.

### 3.2 Decision: Explicit User-Initiated Sync
- Automatic silent synchronization is **DEFERRED BY DESIGN**.
- Guest mode remains 100% stable, sovereign, and unaffected by cloud authentication state.
- In future phases, synchronization will require an explicit one-by-one user confirmation dialog: *"Would you like to upload this guest trip to your cloud account?"*
- Any uploaded trip undergoes full server-side validation, schedule recalculation, and budget re-verification before insertion into the cloud database.

---

## 4. Verification and Regression Defense

Automated test suites confirm that Phase 6 modifications:
- Did not mutate or alter the format of `localStorage['nk_saved_trips']`.
- Preserved offline itinerary reading in guest mode.
- Prevented guest trips from attempting unauthorized calls to cloud-only sharing endpoints.

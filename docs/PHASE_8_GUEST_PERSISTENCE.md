# Phase 8 — Guest Trip Persistence Architecture

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Phase:** Phase 8 — Persistence and Account Experience  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Overview and Core Philosophy

Namma Karnataka operates on an offline-first, privacy-preserving, guest-respecting persistence model. Travelers are never forced to register or authenticate merely to explore destinations, curate itineraries, edit schedules, and save multi-day trips on their current device.

The guest persistence architecture delivers:
1. **Zero-friction exploration:** Guests can generate, customize, edit, and locally store itineraries.
2. **Stable local identity:** Trips maintain an immutable local identifier across edits, preventing accidental duplicates when re-saving or modifying stops.
3. **Corrupt-record isolation:** A malformed or corrupted itinerary object in `localStorage` never crashes the application or erases valid sibling records.
4. **Graceful storage quota detection:** `QuotaExceededError` is trapped cleanly and surfaced with an actionable bilingual warning instead of an unhandled exception.
5. **Clear local vs. cloud visual distinction:** Local-only device itineraries are visibly badged (`📱 Device Only` / `ಸಾಧನದಲ್ಲಿ ಮಾತ್ರ`), distinguishing them from cloud-synced records.

---

## 2. Technical Data Contract

### 2.1 Storage Key & Versioning
- **Primary Storage Key:** `nk_saved_trips`
- **Schema Version Key:** `nk_saved_trips_schema_v` (Current version: `1`)

### 2.2 TypeScript Data Model (`frontend/src/types/index.ts`)

```typescript
export interface SavedTrip {
  id: string;                                          // e.g., 'guest-1729789200000-abc123'
  title: string;                                       // User or system assigned trip title
  saved_at: string;                                    // ISO 8601 UTC timestamp
  request: PlanningRequest;                            // Origin, duration, pace, preferences
  plan: PlanningRecommendationResponse;                // Verified stops, timings, budget, rationale
  cloud_trip_id?: string;                              // Linked cloud trip UUID (when transferred)
  sync_status?: 'local_only' | 'pending_sync' | 'synced' | 'conflict' | 'failed';
  last_synced_at?: string;                             // ISO timestamp of last server confirmation
  version?: number;                                    // Concurrency control version
}
```

---

## 3. Resilience and Error Handling (`guestStorage.ts`)

### 3.1 Corrupt-Record Isolation
When `localStorage.getItem('nk_saved_trips')` is parsed:
1. If top-level JSON is malformed, a warning is logged and an empty array is returned without throwing.
2. If individual objects within the array have missing fields (e.g. missing `plan`), `normalizeSavedTrip(raw)` safely discards the damaged record while returning all valid itineraries.
3. If valid records survive, the cleaned array is safely rewritten back to storage to purge corrupted bytes.

### 3.2 Storage Quota Handling
When writing via `persistGuestTrips(trips)`:
```typescript
try {
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(trips));
  return { success: true };
} catch (err: unknown) {
  const isQuota = err instanceof DOMException &&
    (err.code === 22 || err.code === 1014 || err.name === 'QuotaExceededError');
  return {
    success: false,
    error: isQuota ? 'quota_exceeded' : 'unknown',
    message: isQuota ? 'Storage quota exceeded' : 'Local storage write failed'
  };
}
```
If quota is reached, `App.tsx` renders a user-friendly toast informing the traveller to clear old itineraries.

### 3.3 Stable Local Identity
When re-saving an active plan or editing stops:
- The system checks if `activeTripId` matches an existing entry in `savedTrips`.
- If found, it updates the record in-place rather than generating a new ID or prepending a duplicate entry.
- Title edits update the existing record without splitting the trip.

---

## 4. Privacy Boundaries

- Guest itineraries remain strictly local to the traveller's browser profile.
- Guest records never contain Supabase access tokens, refresh tokens, or passwords.
- Guest itineraries are never automatically uploaded to the cloud without explicit user review and consent via the Guest Transfer dialog.

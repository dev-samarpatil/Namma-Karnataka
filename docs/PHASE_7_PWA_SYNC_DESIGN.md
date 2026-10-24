# Phase 7 Resilient PWA Synchronization Design

**Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)**  
**Version:** Phase 7.0  
**Status:** Implemented & Verified

---

## 1. Principles of Offline Resilience & Privacy

When travellers explore Karnataka's Western Ghats, coastal stretches, or rural heritage sanctuaries, connectivity is frequently intermittent or unavailable.

The synchronization architecture follows these non-negotiable rules:
1. **Never Silently Overwrite User Data:** When a network disconnect or multi-collaborator edit creates a version discrepancy, the server responds with HTTP 409 Conflict. The client preserves the user's pending changes and presents an explicit Conflict Review UI.
2. **Guest Data Stays Local:** Guest itineraries belong to the browser profile (`localStorage['nk_saved_trips']`). Background sync **never silently uploads guest itineraries** without explicit user consent and authentication.
3. **Strict Idempotency:** Every queued mutation carries a deterministic `idempotency_key`. Retrying a network request after a transient connection reset will never create duplicate stops, double-increment versions, or corrupt state.
4. **Cache Isolation & Zero Credential Storage:** Queued operations stored in browser storage never contain authorization bearer tokens or secret keys. The service worker cache policy explicitly bypasses caching for any request bearing an `Authorization` header.

---

## 2. Synchronization Operation Model

```typescript
export type SyncOperationStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'conflict'
  | 'needs_auth'
  | 'failed_retryable'
  | 'failed_permanent';

export interface SyncOperation {
  operation_id: string;          // UUID v4
  idempotency_key: string;       // Unique client mutation identifier
  trip_id: string;               // Target cloud trip identifier
  share_token?: string;          // Share token if editing via collaborator link
  operation_type: 'UPDATE_TRIP' | 'UPDATE_SHARED_TRIP';
  payload: any;                  // Serialized update payload
  expected_version: number;      // Monotonic optimistic lock check
  created_at: string;            // ISO timestamp
  retry_count: number;           // Number of attempts
  status: SyncOperationStatus;
  last_error?: string;
  last_attempt_at?: string;
}
```

---

## 3. Concurrency Control & Idempotency Workflow

```
Client (Offline Queue)                       Backend (FastAPI & DB)
         │                                              │
         ├─── PUT /api/v1/trips/{id} (expected_v1) ────►│ Checks OCC (v1 == v1)
         │    [Idempotency-Key: idemp-001]              │ Increments to v2
         │◄─── [200 OK, version: 2] ────────────────────┤ Caches (user, idemp-001) -> v2
         │                                              │
         │ (Network drops before ACK received)          │
         │                                              │
         ├─── RETRY PUT /api/v1/trips/{id} (exp_v1) ───►│ Cache match for idemp-001!
         │    [Idempotency-Key: idemp-001]              │ Replays cached v2 response
         │◄─── [200 OK, version: 2 (Idempotent)] ───────┤ (No 409 error, no duplicate v3)
         │                                              │
         ├─── Later PUT with stale expected_v1 ────────►│ Version check: actual is v2!
         │◄─── [409 Conflict: TRIP_VERSION_CONFLICT] ──┤ Returns HTTP 409
         ▼                                              ▼
   Marks queue 'conflict', preserves work, prompts user review
```

---

## 4. Retry & Error Classification Policy

| HTTP Status / Condition | Classification | Action |
|---|---|---|
| **Network Unavailable / Aborted** | Retryable | Exponential backoff (1s, 2s, 4s, 8s max 30s) with jitter |
| **HTTP 502 / 503 / 504** | Retryable | Re-queue for next sync pass or manual "Sync Now" |
| **HTTP 401 Unauthorized** | Non-Retryable | Mark `needs_auth`. Prompt user to log in before replaying |
| **HTTP 403 Forbidden / Revoked** | Non-Retryable | Mark `failed_permanent`. Share link was revoked by owner |
| **HTTP 409 Conflict** | Non-Retryable | Mark `conflict`. Display Conflict Modal: Reload latest vs Overwrite |
| **HTTP 422 Unprocessable** | Permanent Error | Mark `failed_permanent`. Reject invalid payload |

---

## 5. Background Sync API & Progressive Fallbacks

1. **Background Sync Registration:**  
   If supported (`'SyncManager' in window`), the client registers:
   ```javascript
   await swRegistration.sync.register('nk-itinerary-sync');
   ```
2. **Window Online Event Fallback:**  
   When the browser returns online (`window.addEventListener('online', ...)`), active queues are automatically re-evaluated.
3. **Application Mount Fallback:**  
   Upon app startup or navigation to Itinerary/Saved Trips views, pending operations are processed.
4. **Manual Trigger:**  
   A visible **"Sync Now"** button allows travellers to trigger immediate synchronization.

---

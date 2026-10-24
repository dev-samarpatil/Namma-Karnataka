# Phase 3 — Cache Privacy, Account Isolation, and Data Security Audit

**Environment:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Audit Date:** 2026-10-24  
**Auditor:** Principal Application Security Engineer  
**Scope:** Service Worker CacheStorage, LocalStorage Key Scoping, Supabase JWT Authorization & RLS Enforcement  

---

## 1. Executive Summary

This audit validates that the offline enhancements implemented in Phase 3 do not introduce data privacy risks, cross-account cache leakage, or unauthorized exposure of user itineraries.

### Key Security Safeguards Confirmed:
1. **Public vs Private Routing Allowlist:** The Service Worker (`frontend/public/sw.js`) explicitly restricts caching to public endpoints (`/api/v1/destinations` and `/api/v1/transit`). Authenticated cloud trips (`/api/v1/trips`) are never intercepted or stored in CacheStorage.
2. **Explicit Authorization Header Bypass:** Hardened during this audit, the Service Worker immediately rejects caching any network request bearing an `Authorization` header.
3. **Guest vs Authenticated Storage Isolation:** Guest itineraries are saved to `window.localStorage['nk_saved_trips']`. Authenticated cloud trips are strictly managed in-memory via React state and fetched live from the API with JWT headers.
4. **Sign-Out Memory Sanitization:** When a user logs out or switches accounts, all authenticated trip records are immediately cleared from application memory (`setCloudTrips([])`).

---

## 2. Service Worker Cache Classification Matrix

| Endpoint Pattern | Method | Auth Required | Cache Strategy | Stored in CacheStorage? | Privacy Risk Assessment |
|---|---|---|---|---|---|
| `/index.html`, `/assets/*` | `GET` | No | Cache-First | Yes (`static-v1`) | **None** (Static public application bundle) |
| `/api/v1/destinations*` | `GET` | No | Network-First | Yes (`api-v1`) | **None** (Public destination catalogue) |
| `/api/v1/transit*` | `GET` | No | Network-First | Yes (`api-v1`) | **None** (Public static timetable network) |
| `/api/v1/trips*` | `GET` | Yes | Direct Network (Bypassed) | **NO** | **Protected** (Explicitly omitted from SW cache rules) |
| `/api/v1/trips*` | `POST` / `DELETE` | Yes | Direct Network | **NO** | **Protected** (Non-GET requests bypass SW) |
| Any request with `Authorization` | Any | Yes | Direct Network | **NO** | **Protected** (Bypassed at line 52 of `sw.js`) |

---

## 3. Account Switching & Local Storage Isolation

The isolation model was audited across user states:

```
[ Browser Context ]
   ├── Guest Mode:
   │    └── localStorage['nk_saved_trips'] (Device-scoped only)
   │
   └── Authenticated Mode (User A):
        ├── In-Memory State: cloudTrips[] (Hydrated via JWT Authorization header)
        └── Logout Trigger:
             ├── setCloudTrips([]) -> Memory cleared instantly
             └── User B Login: Fetches only User B's records via User B's JWT
```

- **Cross-Account Leakage Prevention:** User B cannot inspect User A's cloud itineraries even within the same browser profile because cloud trips are not written to `localStorage`.
- **Guest Trip Preservation:** If an authenticated user signs out, guest trips created locally on that device remain accessible in the **Device Trips (Guest)** tab without data corruption.

---

## 4. Backend Row Level Security (RLS) & API Authorization

Audited `backend/app/api/v1/trips.py` and `database/supabase_schema.sql`:
1. **JWT Verification:** The backend extracts the authenticated subject (`sub`) exclusively from verified Supabase JWT tokens via `get_current_user_id()`.
2. **Client-Supplied Identity Rejection:** The backend explicitly ignores and overrides any client-supplied `user_id` in request payloads:
   ```python
   # Enforced in trips.py
   trip_record["user_id"] = current_user_id
   ```
3. **Database RLS Policies:**
   ```sql
   -- SELECT: Only owner can read
   CREATE POLICY "Users can view their own trips" 
   ON public.trips FOR SELECT 
   USING (auth.uid() = user_id);

   -- INSERT: Only owner can insert with their own UID
   CREATE POLICY "Users can insert their own trips" 
   ON public.trips FOR INSERT 
   WITH CHECK (auth.uid() = user_id);
   ```
4. **Automated Test Coverage:**
   - `backend/app/tests/test_trips_api.py::test_reject_client_supplied_user_id_in_body` (Passed).
   - `backend/app/tests/test_trips_api.py::test_cloud_trips_unauthorized_without_token` (Passed).

---

## 5. Audit Conclusion

**Cache Privacy Status:** `PASS (Zero Privacy Leaks)`  
No private cloud itineraries or user credentials enter shared public caches. Account switching, logout memory cleanup, and database RLS operate securely.

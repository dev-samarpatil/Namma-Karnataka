# Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ) — Phase 6 Secure Sharing and Permissions Design
**Canonical Scope:** Private-by-Default Access, Cryptographic Share Tokens, Role-Based Access Control, Backend Enforcement, and Revocation  
**Execution Environment:** FastAPI • Python 3.14.3 • Supabase PostgreSQL • React 18  
**Date:** October 2026  
**Status:** IMPLEMENTED & VERIFIED

---

## 1. Overview & Privacy-by-Default Policy

Namma Karnataka enforces strict privacy principles:
1. **Private by Default:** All trips created by a user are strictly private to their owner account. No trip is ever indexed in public search results or discoverable without an explicit access grant.
2. **Trip ID Protection:** Knowing or guessing a `trip_id` UUID confers zero access. Access requires authenticated ownership or a valid, non-expired, non-revoked cryptographic share token.
3. **Dual Permission Roles:**
   - **`viewer`:** Read-only access to view the day-by-day itinerary, route maps, and budget estimates. Cannot edit stops, regenerate days, or alter settings.
   - **`editor`:** Collaborative access allowing modification of stop timings, adding/removing destinations, and regenerating days. Cannot delete the trip, change the owner, or invite new editors.

---

## 2. Cryptographic Share Token Architecture

Share links use cryptographically secure random tokens generated via Python `secrets.token_urlsafe(24)`:
- High entropy (~144 bits of randomness), immune to brute-force enumerations.
- Bound specifically to a single `trip_id` and assigned a fixed `role` (`viewer` or `editor`).
- Token records contain:
  - `share_id`: UUID primary key.
  - `trip_id`: Foreign key referencing the parent trip.
  - `role`: Enum (`viewer` or `editor`).
  - `share_token`: High-entropy access string.
  - `is_active`: Boolean flag allowing instant revocation.
  - `expires_at`: Optional ISO datetime timestamp.
  - `created_at`: Creation timestamp.

---

## 3. Backend Authorization & API Endpoints

All sharing logic is enforced server-side in `backend/app/api/v1/trips.py` and `backend/app/repositories/trips.py`:

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `POST` | `/api/v1/trips/{trip_id}/shares` | **Owner Only** | Generates a new share link with specified `role` and optional `expires_in_days`. |
| `GET` | `/api/v1/trips/{trip_id}/shares` | **Owner Only** | Lists all active share links and access metrics for a trip. |
| `DELETE` | `/api/v1/trips/{trip_id}/shares/{share_id}` | **Owner Only** | Revokes an existing share link immediately (`is_active = False`). |
| `GET` | `/api/v1/trips/shared/{share_token}` | **Public Token Holder** | Retrieves the shared trip snapshot with assigned role (`viewer` or `editor`). |
| `PUT` | `/api/v1/trips/shared/{share_token}` | **Editor Token Only** | Applies collaborative itinerary edits subject to optimistic concurrency checks. |

### 3.1 Privilege Escalation Prevention
- A holder of a `viewer` token cannot invoke `PUT /api/v1/trips/shared/{share_token}`. The backend returns `HTTP 403 Forbidden` (`"Viewer share cannot edit trip"`).
- An editor cannot invoke `/shares` endpoints to generate links for others. Only the authenticated trip owner can manage shares.
- Revocation takes effect instantly on the subsequent request; cached tokens cannot bypass backend authorization.

---

## 4. UI Sharing Management (`ItineraryView.tsx`)

In `ItineraryView.tsx`:
1. **Share Modal:** Accessible to the trip owner via the "Share (ಹಂಚಿಕೊಳ್ಳಿ)" button.
2. **Role Selection:** Radio group allowing the owner to choose between:
   - *Viewer (ವೀಕ್ಷಕ)*: Can view and export the itinerary.
   - *Editor (ಸಂಪಾದಕ)*: Can add, remove, and reorder stops.
3. **One-Click Link Copy:** Copies full URL formatted with `?share_token={token}` to the clipboard.
4. **Active Shares Table:** Displays all existing share links, their role, creation date, and an instant "Revoke (ರದ್ದುಗೊಳಿಸಿ)" action.
5. **Role Banner:** When a shared trip is opened via token:
   - Viewers see a blue banner: *"You are viewing a shared trip in read-only mode."*
   - Editors see an indigo banner: *"You are collaborating on this trip as an editor."*

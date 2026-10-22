# ADR-007: Guest Planning Experience and Authenticated Trip Persistence

* **Status:** `ACCEPTED`
* **Date:** October 2026
* **Deciders:** Product Owner, Lead Architect, Security Reviewer

## Context
Forcing visitors to create an account before generating their first itinerary introduces severe onboarding friction and high bounce rates. However, users who invest time crafting a personalized travel plan must be able to save, revisit, and update their itineraries securely.

## Options Considered
1. **Mandatory Sign-In Upfront:** User must register before accessing the Trip Planning form.
2. **Anonymous Database Persistence:** Creating unauthenticated temporary trip rows in PostgreSQL with session cookies or temporary tokens.
3. **Plan First, Sign In to Save (Client-Held Ephemeral State + Deferred Persistence):** Allow completely anonymous planning held in browser memory/cache; require Supabase Auth only to persist to the database.

## Decision
Adopt **Plan First, Sign In to Save (Client-Held Ephemeral State + Deferred Persistence)**:
1. **Anonymous Exploration & Generation:**
   - Any visitor can browse destinations, enter preferences, and call `POST /api/v1/itineraries/generate`.
   - The generated `ItineraryResponse` is returned directly to the browser and cached in frontend state / React Query.
   - No row is written to the `trips` table for anonymous requests.
2. **Post-Generation Persistence:**
   - The itinerary result view features a prominent "Save Trip" button.
   - If clicked while unauthenticated, an accessible modal prompts Sign Up or Log In via Supabase Auth (Email/Password or Magic Link).
   - Once authenticated, the frontend immediately calls `POST /api/v1/trips` with the verified Bearer token and the current itinerary payload.
   - The backend validates the JWT, assigns `user_id = auth.uid()`, inserts into `trips` and `itinerary_snapshots`, and returns the saved trip record.
3. **Trip Immutability & Snapshots:**
   - Saved trips store a versioned snapshot (`schema_version = "1.0"`) in `itinerary_snapshots`. Future updates to catalog data will not alter or corrupt previously saved itineraries.

## Consequences & Mitigations
- **Pros:** Lowest possible user friction; zero database clutter from abandoned anonymous plans; secure, authenticated storage for committed users.
- **Cons:** If an unauthenticated user closes the browser tab before saving, their generated plan is lost.
- **Mitigation:** Clear visual warning before closing unsaved itinerary; option to download/print itinerary without signing in.

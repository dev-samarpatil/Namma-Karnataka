# ADR-003: Supabase PostgreSQL Persistence, Auth, and Row-Level Security

* **Status:** `ACCEPTED`
* **Date:** October 2026
* **Deciders:** Lead Architect, Database Architect, Security Reviewer

## Context
Namma Karnataka requires a relational database to store curated destination facts, provenance metadata, district mappings, multilingual translations, and user-saved travel itineraries. It also requires user authentication for saving trips, with strict privacy guarantees ensuring users cannot access each other's private travel plans.

## Options Considered
1. **Self-Hosted PostgreSQL + Custom Auth JWT Service:** High infrastructure maintenance overhead for a small team.
2. **Firebase Auth + Firestore (NoSQL):** Document store lacks relational constraints and PostGIS spatial query support needed for geographic clustering.
3. **Supabase (Managed PostgreSQL + Supabase Auth + PostGIS + RLS):** Managed PostgreSQL with built-in JWT authentication, Row Level Security, and rich relational schema capabilities.

## Decision
Adopt **Supabase Managed PostgreSQL & Supabase Auth**:
- **Public Data:** Read-only access for anonymous users to `districts`, `destinations`, `destination_translations`, `destination_tags`, `destination_sources`, and `destination_costs`.
- **Private Data:** Strict Row-Level Security on `trips` and `itinerary_snapshots` with policy:
  ```sql
  CREATE POLICY "Users can only manage their own trips"
  ON trips FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
  ```
- **Backend Role:** The backend uses `SUPABASE_SERVICE_ROLE_KEY` solely for trusted administrative operations, and validates user JWT tokens against Supabase JWKS on `/api/v1/trips` endpoints.

## Consequences & Mitigations
- **Pros:** Out-of-the-box secure auth; database-level privacy enforcement; robust PostgreSQL constraints and migration tooling.
- **Cons:** Vendor dependency on Supabase managed infrastructure.
- **Mitigation:** Database uses standard PostgreSQL migrations (`supabase/migrations/`) that remain portable to any standard PostgreSQL instance if required.

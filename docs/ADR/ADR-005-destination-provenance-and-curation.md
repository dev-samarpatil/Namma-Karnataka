# ADR-005: Destination Data Provenance, Editorial Governance, and Uncertainty

* **Status:** `ACCEPTED`
* **Date:** October 2026
* **Deciders:** Lead Architect, Database Architect, Content Lead

## Context
Travel platforms often suffer from stale or fictional data—such as outdated entry fees, closed viewpoints, or mislabeled accessibility. Namma Karnataka's core principle is: **"AI proposes; verified data and deterministic services validate."** The database must record data provenance and communicate uncertainty honestly to travelers.

## Options Considered
1. **Unconstrained Dynamic AI Discovery:** Allowing the LLM to pull arbitrary places from web memory and saving them directly into user itineraries.
2. **Curated Ground Truth Catalog with Granular Provenance & Verification Flags:** Storing curated destinations with explicit verification status, access notes, sources, and review dates.

## Decision
Adopt a **Curated Ground Truth Catalog with Granular Provenance & Verification Flags**:
1. **Catalog Integrity:** LLMs can only select from pre-seeded, active records in `destinations`.
2. **Relational Provenance Model:**
   - Every destination links to `destination_sources` recording source name, URL, scope of claim, and `checked_at` timestamp.
   - `verification_status` enum: `human_reviewed`, `source_checked`, `needs_review`, `stale`, `unknown`.
   - `access_status` enum: `open_reported`, `restricted`, `seasonal`, `closed_reported`, `unknown`.
3. **Honest Representation of Missing Data:**
   - Missing costs are stored as `null` with `status = "unknown"`.
   - Missing operating hours are stored as `null` with `access_status = "unknown"`.
   - The UI displays explicit informational tags (*"Hours unverified — check locally"*), never a fabricated default schedule or zero cost.
4. **Editorial Offbeat Classification:**
   - Offbeat tags (`is_offbeat = true`) are strictly editorial and must be accompanied by standardized safety/facility advisories.
   - Restricted or closed destinations are excluded from standard recommendations.

## Consequences & Mitigations
- **Pros:** High user trust; legally defensible; zero fabricated travel facts.
- **Cons:** Requires upfront editorial effort to seed and maintain catalog.
- **Mitigation:** Seed MVP with a focused set of 50–100 high-confidence Karnataka destinations across 8 key tourist districts (Bengaluru, Mysuru, Kodagu, Chikkamagaluru, Uttara Kannada, Udupi, Shivamogga, Ballari/Hampi).

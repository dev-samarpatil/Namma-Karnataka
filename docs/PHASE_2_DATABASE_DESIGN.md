# NAMMA KARNATAKA
## Phase 2 Database Design Specification — PostgreSQL, PostGIS, and Schema Architecture

**Document ID:** NK-PH2-DES-001  
**Version:** 1.0  
**Status:** Approved Architecture Baseline  
**Prerequisites:** Phase 0 ADR-003, ADR-005; Phase 1 Technical Foundation  
**Target Environment:** Supabase Managed PostgreSQL 15+ with PostGIS  

---

## 1. Executive Summary & Purpose

This document provides the authoritative database design and relational architecture for **Phase 2 of Namma Karnataka**. It governs the persistence of curated Karnataka destination catalogs, geographical data via PostGIS, multilingual translations, source provenance records, and district boundaries.

The design strictly implements the non-negotiable principles established in Phase 0:
1. **Curated Ground Truth:** The database is the single source of truth for destinations. AI generation services in later phases are constrained to select only validated, published destination records.
2. **Honest Unknown Values:** Unknown fees, operating hours, and accessibility conditions are stored as `NULL` (never encoded as zero or empty defaults).
3. **Traceable Provenance:** Every factual claim is tied to verifiable source metadata with explicit review states.
4. **PostGIS Geographic Standards:** Spatial data uses SRID 4326 (`geography(Point, 4326)`), with explicit (Longitude, Latitude) Cartesian ordering for point construction.
5. **Defense-in-Depth Security:** Row-Level Security (RLS) restricts public access to published, active records while preserving service-role management for backend ingestion.

---

## 2. Entity-Relationship Overview

```
 +--------------------+              +--------------------------------+
 |     districts      | 1          * |          destinations          |
 +--------------------+--------------+--------------------------------+
 | PK code            |              | PK id (UUID)                   |
 |    name_en         |              |    slug (UNIQUE)               |
 |    name_kn         |              | FK district_code               |
 |    active          |              |    category (enum)             |
 |    created_at      |              |    latitude (NUMERIC)          |
 +--------------------+              |    longitude (NUMERIC)         |
                                     |    location (geography Point)  |
                                     |    access_status (enum)        |
                                     |    verification_status (enum)  |
                                     |    is_offbeat (BOOLEAN)        |
                                     |    estimated_visit_minutes     |
                                     |    entry_fee_min_inr           |
                                     |    entry_fee_max_inr           |
                                     |    currency_code (INR)         |
                                     |    content_status (enum)       |
                                     |    active (BOOLEAN)            |
                                     |    created_at / updated_at     |
                                     +--------------------------------+
                                              | 1              | 1
                                              |                |
                                              | *              | *
                      +-----------------------+--+   +---------+--------------------+
                      | destination_translations |   |     destination_sources      |
                      +--------------------------+   +------------------------------+
                      | PK,FK destination_id     |   | PK id (UUID)                 |
                      | PK    language_code      |   | FK destination_id            |
                      |       name               |   |    source_name               |
                      |       summary            |   |    source_url                |
                      |       description        |   |    source_type (enum)        |
                      |       how_to_reach       |   |    claim_scope               |
                      |       access_notes       |   |    checked_at                |
                      |       translation_status |   |    license_notes             |
                      |       created_at/upd_at  |   |    attribution_required      |
                      +--------------------------+   +------------------------------+
```

---

## 3. Enumerated Types & Controlled Vocabularies

### 3.1 `destination_category`
Controls destination taxonomy in Karnataka:
- `nature` — Scenic natural landscape, greenery, lakes, valleys
- `waterfall` — Cascades and falls (e.g., Jog, Abbey, Shivanasamudra)
- `hill_station` — High-altitude retreats (e.g., Kudremukh, Nandi Hills)
- `viewpoint` — Scenic panoramas and outlook points
- `heritage` — UNESCO World Heritage sites, forts, monuments (e.g., Hampi, Badami)
- `architecture` — Temples, palaces, historic civil structures (e.g., Mysore Palace, Belur)
- `beach` — Coastal attractions along the Karavali coast (e.g., Gokarna, Malpe)
- `wildlife` — National parks, wildlife sanctuaries, tiger reserves (e.g., Nagarahole)
- `food_culture` — Culinary heritage and traditional food landmarks
- `spiritual_cultural` — Pilgrimage and spiritual hubs (e.g., Sringeri, Udupi Krishna Matha)
- `adventure` — Trekking, water sports, bouldering
- `museum` — Art galleries, state museums, cultural complexes
- `town_city` — Historic and culturally significant settlements
- `other` — Extensible category for uncategorized attractions

### 3.2 `access_status`
Describes the recorded accessibility condition:
- `open_reported` — Reported open during standard visiting periods
- `restricted` — Requires prior departmental permit (e.g., forest dept, military)
- `seasonal` — Open only during specific seasons (e.g., post-monsoon waterfalls)
- `closed_reported` — Reported temporarily or permanently closed
- `unknown` — Accessibility condition has not been verified

### 3.3 `verification_status`
Tracks factual auditing of destination records:
- `human_reviewed` — Manually audited against official government / survey records
- `source_checked` — Verified against published official tourism/government portals
- `needs_review` — Flagged for editorial review
- `stale` — Information older than review threshold (e.g., > 12 months)
- `unknown` — Origin facts unverified

### 3.4 `content_status`
Controls lifecycle and public visibility:
- `draft` — Internal editorial draft; invisible to public APIs
- `reviewed` — Approved by content reviewer; ready for staging
- `published` — Live in catalog; visible to anonymous and authenticated users
- `archived` — Delisted from search; retained for historical itinerary snapshots

### 3.5 `source_type`
Categorizes provenance citations:
- `government_official` — Karnataka Tourism (KSTDC), Archaeological Survey of India (ASI)
- `tourism_board` — District tourism councils, official regional boards
- `verified_editorial` — Curated field guides with verified editorial oversight
- `academic` — Published historical monographs or peer-reviewed geographic surveys
- `field_report` — Direct inspection report by authorized contributor
- `other` — Alternative credible reference

### 3.6 `translation_status`
Multilingual quality tracking (`en`, `kn`):
- `human_reviewed` — Native linguist reviewed and approved
- `provider_generated` — Machine translation output awaiting native editorial review
- `needs_review` — Flagged for correction
- `not_available` — Content not yet available in target language

---

## 4. Table Definitions & Constraints

### 4.1 Table: `districts`
Stores the canonical administrative districts of Karnataka.

```sql
CREATE TABLE public.districts (
    code VARCHAR(16) PRIMARY KEY, -- e.g., 'KA-MYS', 'KA-BLRU'
    name_en VARCHAR(100) NOT NULL,
    name_kn VARCHAR(100) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);
```

### 4.2 Table: `destinations`
The core catalog entity storing invariant facts, coordinates, fee ranges, and editorial metadata.

```sql
CREATE TABLE public.destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(120) NOT NULL UNIQUE,
    district_code VARCHAR(16) NOT NULL REFERENCES public.districts(code) ON UPDATE CASCADE ON DELETE RESTRICT,
    category public.destination_category NOT NULL,
    
    -- Coordinate Storage & Dual-Representation
    latitude NUMERIC(9,6) NULL,
    longitude NUMERIC(9,6) NULL,
    location geography(Point, 4326) NULL,
    
    -- Status & Governance
    access_status public.access_status NOT NULL DEFAULT 'unknown',
    verification_status public.verification_status NOT NULL DEFAULT 'unknown',
    content_status public.content_status NOT NULL DEFAULT 'draft',
    is_offbeat BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Visit duration estimate in minutes (NULL if unverified)
    estimated_visit_minutes INTEGER NULL,
    
    -- Entry Fee Representation (Minor units or numeric INR; NULL = unknown)
    entry_fee_min_inr NUMERIC(10,2) NULL,
    entry_fee_max_inr NUMERIC(10,2) NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
    
    -- Operational Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    
    -- Integrity Constraints
    CONSTRAINT check_destinations_slug_format CHECK (slug ~* '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT check_destinations_latitude CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
    CONSTRAINT check_destinations_longitude CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0)),
    CONSTRAINT check_destinations_coords_pair CHECK (
        (latitude IS NULL AND longitude IS NULL) OR 
        (latitude IS NOT NULL AND longitude IS NOT NULL)
    ),
    CONSTRAINT check_destinations_visit_duration CHECK (estimated_visit_minutes IS NULL OR estimated_visit_minutes > 0),
    CONSTRAINT check_destinations_fee_non_negative CHECK (
        (entry_fee_min_inr IS NULL OR entry_fee_min_inr >= 0) AND
        (entry_fee_max_inr IS NULL OR entry_fee_max_inr >= 0)
    ),
    CONSTRAINT check_destinations_fee_range CHECK (
        entry_fee_min_inr IS NULL OR 
        entry_fee_max_inr IS NULL OR 
        entry_fee_min_inr <= entry_fee_max_inr
    ),
    CONSTRAINT check_destinations_currency CHECK (currency_code = 'INR')
);
```

### 4.3 Table: `destination_translations`
Stores localized textual content for English (`en`) and Kannada (`kn`).

```sql
CREATE TABLE public.destination_translations (
    destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL, -- 'en' or 'kn'
    name VARCHAR(200) NOT NULL,
    summary VARCHAR(500) NULL,
    description TEXT NULL,
    how_to_reach TEXT NULL,
    accessibility_notes TEXT NULL,
    translation_status public.translation_status NOT NULL DEFAULT 'needs_review',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    
    PRIMARY KEY (destination_id, language_code),
    CONSTRAINT check_language_code CHECK (language_code IN ('en', 'kn'))
);
```

### 4.4 Table: `destination_sources`
Stores source citations and verification provenance for destinations.

```sql
CREATE TABLE public.destination_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
    source_name VARCHAR(200) NOT NULL,
    source_url TEXT NULL,
    source_type public.source_type NOT NULL DEFAULT 'other',
    claim_scope VARCHAR(100) NOT NULL, -- e.g., 'all', 'coordinates', 'entry_fee', 'history'
    checked_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    license_notes TEXT NULL,
    attribution_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);
```

---

## 5. PostGIS Spatial Specification

### 5.1 Type & Coordinate Reference System
- **Spatial Type:** `geography(Point, 4326)`
- **Spatial Reference System Identifier (SRID):** `4326` (WGS 84 ellipsoid)
- **Unit of Distance:** Meters (geodetic calculations over the Earth's curvature)

### 5.2 Coordinate Ordering Standard
PostGIS constructor functions follow the OpenGIS (OGC) specification:
$$\text{ST\_MakePoint}(\text{Longitude}, \text{Latitude})$$
- **X Dimension:** Longitude (Range: $-180.0$ to $+180.0$)
- **Y Dimension:** Latitude (Range: $-90.0$ to $+90.0$)
- **Karnataka Geographical Bounding Box:**
  - Latitude: $11.5^\circ\text{N}$ to $18.5^\circ\text{N}$
  - Longitude: $74.0^\circ\text{E}$ to $78.6^\circ\text{E}$

### 5.3 Automated Location Synchronization Trigger
To guarantee mathematical consistency between numeric `(latitude, longitude)` and PostGIS `location`, a database trigger synchronizes `location` automatically:

```sql
CREATE OR REPLACE FUNCTION public.sync_destination_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.longitude IS NOT NULL AND NEW.latitude IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    ELSE
        NEW.location := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_destination_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.destinations
FOR EACH ROW EXECUTE FUNCTION public.sync_destination_location();
```

---

## 6. Unknown-Value Semantics

Data honesty is a core product tenet:
1. **Entry Fees:** If admission cost is unknown, `entry_fee_min_inr` and `entry_fee_max_inr` are `NULL`. They must never default to `0`. A fee of `0` strictly represents confirmed free entry (e.g., public beaches, open viewpoints).
2. **Opening Hours:** Hours are omitted or `NULL` if not verified by an official source. Missing hours must never be displayed as "Open 24 Hours" or "Closed".
3. **Accessibility Notes:** Physical accessibility (wheelchair ramps, step-free access) defaults to `NULL` unless audited by official or field inspection. Lack of notes must not be interpreted as fully accessible.
4. **Visit Duration:** `estimated_visit_minutes` is `NULL` if unreviewed.
5. **Offbeat Classification:** `is_offbeat = true` is an editorial category indicating lesser-known or tranquil destinations; it is NOT a safety assurance or guarantee of infrastructure.

---

## 7. Row-Level Security (RLS) & Access Policy Architecture

All tables in the public schema enable Row Level Security to prevent unauthorized modifications and isolate drafts.

### 7.1 Security Policy Matrix

| Table | Role | Permitted Actions | Policy Rule / Scope |
|---|---|---|---|
| `districts` | `anon`, `authenticated` | `SELECT` | `WHERE active = TRUE` |
| `districts` | `service_role` | `ALL` | Full administrative access |
| `destinations` | `anon`, `authenticated` | `SELECT` | `WHERE content_status = 'published' AND active = TRUE` |
| `destinations` | `service_role` | `ALL` | Full administrative access |
| `destination_translations` | `anon`, `authenticated` | `SELECT` | Joined to published parent destination |
| `destination_translations` | `service_role` | `ALL` | Full administrative access |
| `destination_sources` | `anon`, `authenticated` | `SELECT` | Joined to published parent destination |
| `destination_sources` | `service_role` | `ALL` | Full administrative access |

### 7.2 Strict Public Isolation
Public API endpoints (and direct PostgREST client queries) cannot query draft, reviewed, or archived content. Backend services operating in privileged contexts use `SUPABASE_SERVICE_ROLE_KEY` to ingest, audit, and update catalog items.

---

## 8. Indexing & Query Optimization Strategy

### 8.1 Primary & Search Indexes
- `idx_destinations_slug` (`UNIQUE btree (slug)`) — O(1) slug resolution
- `idx_destinations_district` (`btree (district_code)`) — District filtering
- `idx_destinations_category` (`btree (category)`) — Category filtering
- `idx_destinations_content_status` (`btree (content_status, active)`) — High-efficiency public catalog scan
- `idx_destinations_location_gist` (`gist (location)`) — GiST spatial index for radius searches (`ST_DWithin`)
- `idx_dest_translations_name` (`btree (name)`) — Title lookups
- `idx_dest_sources_destination` (`btree (destination_id)`) — Foreign key join optimization

### 8.2 Proximity Query Standard
When performing nearby destination lookups within radius $R$ meters:
```sql
SELECT id, slug, ST_Distance(location, ST_SetSRID(ST_MakePoint($lon, $lat), 4326)::geography) AS distance_meters
FROM public.destinations
WHERE content_status = 'published'
  AND active = TRUE
  AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($lon, $lat), 4326)::geography, $radius_meters)
ORDER BY location <-> ST_SetSRID(ST_MakePoint($lon, $lat), 4326)::geography
LIMIT $limit;
```
*Note: Distance is geodesic (straight-line) across the WGS84 ellipsoid. It must never be presented to users as road driving distance or driving ETA.*

---

## 9. Migration & Rollback Strategy

1. **Forward Migrations:** Migrations are placed under `supabase/migrations/` using timestamped names (`YYYYMMDDHHMMSS_<name>.sql`).
2. **Determinism:** Migrations must be strictly idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`).
3. **Rollback Policy:** In development and staging, clean rollbacks are executed by running down-scripts or resetting disposable databases. In production, corrective forward migrations must be used.

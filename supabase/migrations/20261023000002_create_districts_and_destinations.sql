-- Migration: Create Districts, Destinations, Translations, and Sources Schema
-- Version: 20261023000002
-- Description: Core tables, enums, triggers, and spatial indexes for Namma Karnataka destination catalog.

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'destination_category') THEN
        CREATE TYPE public.destination_category AS ENUM (
            'nature',
            'waterfall',
            'hill_station',
            'viewpoint',
            'heritage',
            'architecture',
            'beach',
            'wildlife',
            'food_culture',
            'spiritual_cultural',
            'adventure',
            'museum',
            'town_city',
            'other'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_status') THEN
        CREATE TYPE public.access_status AS ENUM (
            'open_reported',
            'restricted',
            'seasonal',
            'closed_reported',
            'unknown'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE public.verification_status AS ENUM (
            'human_reviewed',
            'source_checked',
            'needs_review',
            'stale',
            'unknown'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
        CREATE TYPE public.content_status AS ENUM (
            'draft',
            'reviewed',
            'published',
            'archived'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_type') THEN
        CREATE TYPE public.source_type AS ENUM (
            'government_official',
            'tourism_board',
            'verified_editorial',
            'academic',
            'field_report',
            'other'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'translation_status') THEN
        CREATE TYPE public.translation_status AS ENUM (
            'human_reviewed',
            'provider_generated',
            'needs_review',
            'not_available'
        );
    END IF;
END $$;

-- ============================================================================
-- 2. DISTRICTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.districts (
    code VARCHAR(16) PRIMARY KEY,
    name_en VARCHAR(100) NOT NULL,
    name_kn VARCHAR(100) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 3. DESTINATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(120) NOT NULL UNIQUE,
    district_code VARCHAR(16) NOT NULL REFERENCES public.districts(code) ON UPDATE CASCADE ON DELETE RESTRICT,
    category public.destination_category NOT NULL,

    -- Geographic coordinates & PostGIS geography point
    latitude NUMERIC(9,6) NULL,
    longitude NUMERIC(9,6) NULL,
    location geography(Point, 4326) NULL,

    -- Operational and review status
    access_status public.access_status NOT NULL DEFAULT 'unknown',
    verification_status public.verification_status NOT NULL DEFAULT 'unknown',
    content_status public.content_status NOT NULL DEFAULT 'draft',
    is_offbeat BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Duration and Fee fields (NULL represents unknown)
    estimated_visit_minutes INTEGER NULL,
    entry_fee_min_inr NUMERIC(10,2) NULL,
    entry_fee_max_inr NUMERIC(10,2) NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',

    -- Timestamps
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

-- ============================================================================
-- 4. DESTINATION TRANSLATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.destination_translations (
    destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
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

-- ============================================================================
-- 5. DESTINATION SOURCES (PROVENANCE) TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.destination_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
    source_name VARCHAR(200) NOT NULL,
    source_url TEXT NULL,
    source_type public.source_type NOT NULL DEFAULT 'other',
    claim_scope VARCHAR(100) NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    license_notes TEXT NULL,
    attribution_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 6. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_destinations_district ON public.destinations (district_code);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON public.destinations (category);
CREATE INDEX IF NOT EXISTS idx_destinations_content_status ON public.destinations (content_status, active);
CREATE INDEX IF NOT EXISTS idx_destinations_is_offbeat ON public.destinations (is_offbeat);
CREATE INDEX IF NOT EXISTS idx_destinations_location_gist ON public.destinations USING gist (location);

CREATE INDEX IF NOT EXISTS idx_dest_translations_name ON public.destination_translations (name);
CREATE INDEX IF NOT EXISTS idx_dest_sources_destination ON public.destination_sources (destination_id);

-- ============================================================================
-- 7. LOCATION SYNC TRIGGER & UPDATED_AT TRIGGER
-- ============================================================================

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

DROP TRIGGER IF EXISTS trg_sync_destination_location ON public.destinations;
CREATE TRIGGER trg_sync_destination_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.destinations
FOR EACH ROW EXECUTE FUNCTION public.sync_destination_location();

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_districts_updated_at ON public.districts;
CREATE TRIGGER trg_districts_updated_at
BEFORE UPDATE ON public.districts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_destinations_updated_at ON public.destinations;
CREATE TRIGGER trg_destinations_updated_at
BEFORE UPDATE ON public.destinations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_destination_translations_updated_at ON public.destination_translations;
CREATE TRIGGER trg_destination_translations_updated_at
BEFORE UPDATE ON public.destination_translations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

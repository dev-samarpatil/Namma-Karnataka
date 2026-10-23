-- Migration: Create Trips and Itinerary Snapshots Schema with Row Level Security (RLS)
-- Version: 20261023000004
-- Description: Core tables, constraints, indexes, triggers, and user-isolated RLS policies for user-owned saved trips.

-- ============================================================================
-- 1. TRIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(160) NOT NULL,
    origin_label VARCHAR(100) NOT NULL,
    start_date DATE NULL,
    duration_days INTEGER NOT NULL,
    pace VARCHAR(20) NOT NULL,
    is_offbeat_preferred BOOLEAN NOT NULL DEFAULT FALSE,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    budget_min_inr NUMERIC(10,2) NULL,
    budget_max_inr NUMERIC(10,2) NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),

    -- Integrity Constraints
    CONSTRAINT check_trips_duration_range CHECK (duration_days >= 1 AND duration_days <= 14),
    CONSTRAINT check_trips_pace CHECK (pace IN ('relaxed', 'balanced', 'packed')),
    CONSTRAINT check_trips_currency CHECK (currency_code = 'INR'),
    CONSTRAINT check_trips_status CHECK (status IN ('active', 'completed', 'archived')),
    CONSTRAINT check_trips_budget_non_negative CHECK (
        (budget_min_inr IS NULL OR budget_min_inr >= 0) AND
        (budget_max_inr IS NULL OR budget_max_inr >= 0)
    ),
    CONSTRAINT check_trips_budget_range CHECK (
        budget_min_inr IS NULL OR 
        budget_max_inr IS NULL OR 
        budget_min_inr <= budget_max_inr
    )
);

-- ============================================================================
-- 2. ITINERARY SNAPSHOTS TABLE (Immutable versioned plan)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.itinerary_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    schema_version VARCHAR(10) NOT NULL DEFAULT '1.0',
    generation_mode VARCHAR(30) NOT NULL DEFAULT 'fallback',
    provider_used VARCHAR(50) NOT NULL DEFAULT 'deterministic_fallback',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_destinations INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),

    CONSTRAINT check_snapshots_version CHECK (schema_version = '1.0'),
    CONSTRAINT check_snapshots_total_destinations CHECK (total_destinations >= 0)
);

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips (user_id);
CREATE INDEX IF NOT EXISTS idx_trips_updated_at ON public.trips (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_trip_id ON public.itinerary_snapshots (trip_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_id ON public.itinerary_snapshots (user_id);

-- ============================================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS trg_trips_updated_at ON public.trips;
CREATE TRIGGER trg_trips_updated_at
BEFORE UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on both user-owned tables
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_snapshots ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies if re-running
DROP POLICY IF EXISTS "Users can only select their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can only insert their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can only update their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can only delete their own trips" ON public.trips;
DROP POLICY IF EXISTS "Service role has full access to trips" ON public.trips;

DROP POLICY IF EXISTS "Users can only select their own snapshots" ON public.itinerary_snapshots;
DROP POLICY IF EXISTS "Users can only insert their own snapshots" ON public.itinerary_snapshots;
DROP POLICY IF EXISTS "Users can only update their own snapshots" ON public.itinerary_snapshots;
DROP POLICY IF EXISTS "Users can only delete their own snapshots" ON public.itinerary_snapshots;
DROP POLICY IF EXISTS "Service role has full access to snapshots" ON public.itinerary_snapshots;

-- 5.1 Trips Policies
-- Authenticated users can only read their own trips
CREATE POLICY "Users can only select their own trips"
ON public.trips
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Authenticated users can only insert trips where user_id matches their auth identity
CREATE POLICY "Users can only insert their own trips"
ON public.trips
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Authenticated users can only update their own trips, and cannot reassign user_id
CREATE POLICY "Users can only update their own trips"
ON public.trips
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Authenticated users can only delete their own trips
CREATE POLICY "Users can only delete their own trips"
ON public.trips
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Backend Service Role has full access for administrative / server-verified workflows
CREATE POLICY "Service role has full access to trips"
ON public.trips
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- 5.2 Itinerary Snapshots Policies
CREATE POLICY "Users can only select their own snapshots"
ON public.itinerary_snapshots
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own snapshots"
ON public.itinerary_snapshots
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own snapshots"
ON public.itinerary_snapshots
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own snapshots"
ON public.itinerary_snapshots
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to snapshots"
ON public.itinerary_snapshots
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

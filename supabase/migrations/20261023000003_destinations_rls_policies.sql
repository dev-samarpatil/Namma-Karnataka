-- Migration: Row-Level Security (RLS) Policies for Destination Catalog
-- Version: 20261023000003
-- Description: Configures RLS policies for anonymous, authenticated, and service roles.

-- 1. Enable Row Level Security on all catalog tables
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_sources ENABLE ROW LEVEL SECURITY;

-- 2. Clean up existing policies if re-running
DROP POLICY IF EXISTS "Public can view active districts" ON public.districts;
DROP POLICY IF EXISTS "Service role has full access to districts" ON public.districts;

DROP POLICY IF EXISTS "Public can view published active destinations" ON public.destinations;
DROP POLICY IF EXISTS "Service role has full access to destinations" ON public.destinations;

DROP POLICY IF EXISTS "Public can view translations of published destinations" ON public.destination_translations;
DROP POLICY IF EXISTS "Service role has full access to destination_translations" ON public.destination_translations;

DROP POLICY IF EXISTS "Public can view sources of published destinations" ON public.destination_sources;
DROP POLICY IF EXISTS "Service role has full access to destination_sources" ON public.destination_sources;

-- 3. Districts Policies
CREATE POLICY "Public can view active districts"
ON public.districts
FOR SELECT
TO anon, authenticated
USING (active = TRUE);

CREATE POLICY "Service role has full access to districts"
ON public.districts
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- 4. Destinations Policies
CREATE POLICY "Public can view published active destinations"
ON public.destinations
FOR SELECT
TO anon, authenticated
USING (content_status = 'published' AND active = TRUE);

CREATE POLICY "Service role has full access to destinations"
ON public.destinations
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- 5. Destination Translations Policies
CREATE POLICY "Public can view translations of published destinations"
ON public.destination_translations
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.destinations d
        WHERE d.id = destination_translations.destination_id
          AND d.content_status = 'published'
          AND d.active = TRUE
    )
);

CREATE POLICY "Service role has full access to destination_translations"
ON public.destination_translations
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- 6. Destination Sources Policies
CREATE POLICY "Public can view sources of published destinations"
ON public.destination_sources
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.destinations d
        WHERE d.id = destination_sources.destination_id
          AND d.content_status = 'published'
          AND d.active = TRUE
    )
);

CREATE POLICY "Service role has full access to destination_sources"
ON public.destination_sources
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

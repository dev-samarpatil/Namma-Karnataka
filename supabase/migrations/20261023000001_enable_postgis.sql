-- Migration: Enable PostGIS Spatial Extension
-- Description: Enables PostGIS for geographic calculations and coordinates storage.
-- SRID: 4326 (WGS 84)

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Grant usage to public/authenticated roles if in extensions schema
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_namespace WHERE nspname = 'extensions'
    ) THEN
        GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
    END IF;
END $$;

# Supabase Configuration & Migrations

This directory hosts the PostgreSQL database migrations, seed datasets, configuration, and database-level RLS policies for **Namma Karnataka**.

---

## Directory Layout

```text
supabase/
├── config.toml           # Supabase CLI local development configuration
├── migrations/           # Sequential SQL migration files
├── seed/                 # Seed SQL scripts for districts, categories, sample destinations
└── tests/                # pgTAP database tests for Row Level Security (RLS)
```

---

## Migration Conventions

1. **Sequential Naming:** Migrations follow the standard timestamped naming format:
   ```text
   YYYYMMDDHHMMSS_brief_description.sql
   ```
2. **Idempotence & Reversibility:** Migrations should be repeatable and clean.
3. **No Direct Production Modifications:** All schema changes must be versioned in `migrations/` and reviewed before applying to production.

---

## Row Level Security (RLS) Policy

- **Public Destination Data:** Anonymous and authenticated users have read-only (`SELECT`) access to active destinations, sources, costs, and translations.
- **Private User Trips:** All tables holding user data (`trips`, `itinerary_snapshots`, `user_preferences`) **MUST** have Row Level Security enabled:
  ```sql
  ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY "Users can only access their own trips"
  ON trips FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
  ```

---

## Local Development (Supabase CLI)

To start the local Supabase stack (requires Docker and Supabase CLI):
```bash
supabase start
supabase db reset
```

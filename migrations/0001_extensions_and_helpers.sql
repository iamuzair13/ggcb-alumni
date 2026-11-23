-- 0001_extensions_and_helpers.sql
-- Extensions + shared helper functions.
--
-- Conventions for every migration file:
--   * No BEGIN/COMMIT — the runner wraps each file in a single transaction
--     together with its applied_migrations ledger insert.
--   * The runner sets search_path = "public, extensions" before applying a
--     file, so extension objects resolve whether they live in "extensions"
--     (Supabase) or "public" (plain Postgres).

-- citext  : case-insensitive email columns.
-- pgcrypto: gen_random_uuid() (built into PG 13+; declared anyway so Supabase
--           parity is explicit).
-- Portable placement: on Supabase the "extensions" schema exists and
-- extensions belong there; on plain Postgres it does not.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS citext SCHEMA extensions';
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions';
  ELSE
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS citext';
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pgcrypto';
  END IF;
END $$;

-- Shared trigger: keep updated_at honest on every mutable table.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

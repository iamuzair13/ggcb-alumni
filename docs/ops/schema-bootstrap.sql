-- ============================================================================
-- docs/ops/schema-bootstrap.sql — GENERATED point-in-time artifact.
-- DO NOT EDIT BY HAND. Regenerate with:  pnpm db:schema
--
-- Equivalent to running the migrations below through `pnpm db:migrate`,
-- assembled as a single file for the Supabase SQL editor. It reflects
-- the migrations as of generation time — always prefer the runner when
-- it is available.
-- The applied_migrations ledger is pre-populated with the runner's
-- EOL-normalised checksums, so the runner stays the source of truth:
-- future changes go through `pnpm db:new` + `pnpm db:migrate`, never by
-- editing this file.
-- ============================================================================

BEGIN;

SET LOCAL search_path = public, extensions;

-- Runner ledger (the migration runner would bootstrap this itself).

CREATE TABLE IF NOT EXISTS applied_migrations (
  id           integer PRIMARY KEY,
  name         text NOT NULL UNIQUE,
  checksum     text NOT NULL,
  applied_at   timestamptz NOT NULL DEFAULT now(),
  execution_ms integer
);


-- ################## 0001_extensions_and_helpers.sql ##################

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

-- ################## 0002_identity_and_org.sql ##################

-- 0002_identity_and_org.sql
-- Login identities (staff + alumni share ONE users table, context.md §6)
-- and organisational units (departments only — no faculties/programs).

CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'viewer', 'alumni');

CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             citext NOT NULL,
  password_hash     text,                       -- null until set-password link (Prompt 3)
  name              text NOT NULL,
  role              user_role NOT NULL,
  is_active         boolean NOT NULL DEFAULT true,
  email_verified_at timestamptz,
  last_login_at     timestamptz,
  -- bumped to invalidate outstanding JWT sessions on password
  -- reset / deactivation (decision recorded in docs/decisions.md)
  session_version   integer NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT users_email_uniq        UNIQUE (email),
  CONSTRAINT users_name_not_blank    CHECK (btrim(name) <> ''),
  CONSTRAINT users_password_nonempty CHECK (password_hash IS NULL OR password_hash <> '')
);

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE departments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  code       text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT departments_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT departments_code_not_blank CHECK (btrim(code) <> '')
);

-- Normalised uniqueness (D3: no seed rows — departments are created
-- through the admin CRUD later).
CREATE UNIQUE INDEX departments_name_lower_uniq ON departments (lower(btrim(name)));
CREATE UNIQUE INDEX departments_code_lower_uniq ON departments (lower(btrim(code)));

CREATE TRIGGER departments_set_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ################## 0003_alumni.sql ##################

-- 0003_alumni.sql
-- Alumni data records + their change-request workflow.
-- BS-only for now (context.md §2): the `degree` column has a named check so a
-- later migration can relax it — no multi-degree logic is built.

CREATE TYPE gender_type           AS ENUM ('male', 'female', 'other');
CREATE TYPE verify_status         AS ENUM ('under_approval', 'verified', 'rejected');
CREATE TYPE datasource_type       AS ENUM ('registration', 'import');
CREATE TYPE change_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE alumni (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Login link: nullable — imported-only records have no login.
  -- SET NULL: deleting a login identity must not destroy the alumni record.
  user_id            uuid UNIQUE REFERENCES users (id) ON DELETE SET NULL,

  roll_number        text NOT NULL,
  roll_number_norm   text GENERATED ALWAYS AS (lower(btrim(roll_number))) STORED,
  full_name          text NOT NULL,
  email              citext,
  phone              text,
  gender             gender_type,            -- value set recorded in docs/decisions.md

  department_id      uuid NOT NULL REFERENCES departments (id) ON DELETE RESTRICT,
  degree             text NOT NULL DEFAULT 'BS',
  session_start_year smallint,
  session_end_year   smallint,
  passing_year       smallint,

  city               text,
  district           text,
  country            text,
  employer           text,
  job_title          text,
  sector             text,
  bio                text,
  social_links       jsonb NOT NULL DEFAULT '{}'::jsonb,

  photo_path         text,
  mentor_available   boolean NOT NULL DEFAULT false,
  directory_visible  boolean NOT NULL DEFAULT false,
  show_email         boolean NOT NULL DEFAULT false,
  show_phone         boolean NOT NULL DEFAULT false,
  is_featured        boolean NOT NULL DEFAULT false,
  achievement        text,

  verify_status      verify_status NOT NULL DEFAULT 'under_approval',
  reject_reason      text,
  verified_by        uuid REFERENCES users (id) ON DELETE SET NULL,
  verified_at        timestamptz,
  datasource         datasource_type NOT NULL,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT alumni_degree_bs              CHECK (degree = 'BS'),
  CONSTRAINT alumni_full_name_not_blank    CHECK (btrim(full_name) <> ''),
  CONSTRAINT alumni_roll_number_not_blank  CHECK (btrim(roll_number) <> ''),
  CONSTRAINT alumni_session_start_range    CHECK (session_start_year IS NULL OR session_start_year BETWEEN 1950 AND 2100),
  CONSTRAINT alumni_session_end_range      CHECK (session_end_year   IS NULL OR session_end_year   BETWEEN 1950 AND 2100),
  CONSTRAINT alumni_passing_year_range     CHECK (passing_year       IS NULL OR passing_year       BETWEEN 1950 AND 2100),
  CONSTRAINT alumni_session_order          CHECK (session_start_year IS NULL OR session_end_year IS NULL OR session_end_year >= session_start_year),
  CONSTRAINT alumni_bio_length             CHECK (char_length(bio) <= 1000),
  CONSTRAINT alumni_social_links_object    CHECK (jsonb_typeof(social_links) = 'object'),
  CONSTRAINT alumni_verified_needs_at      CHECK (verify_status <> 'verified' OR verified_at IS NOT NULL),
  CONSTRAINT alumni_rejected_needs_reason  CHECK (verify_status <> 'rejected' OR (reject_reason IS NOT NULL AND btrim(reject_reason) <> ''))
);

-- ----------------------------------------------------------------------------
-- D4 (OPEN): global uniqueness is a default; the owner must verify against the
-- Excel sample. The rule lives ONLY here — a later migration can replace this
-- one index (e.g. per department+session) without touching anything else.
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX alumni_roll_number_norm_uniq ON alumni (roll_number_norm);

-- Nullable emails: several rows may have NULL; non-nulls must be unique
-- (citext makes the comparison case-insensitive).
CREATE UNIQUE INDEX alumni_email_uniq ON alumni (email) WHERE email IS NOT NULL;

-- Planned predicates only (see docs/db/schema.md for rationale):
CREATE INDEX alumni_department_id_idx         ON alumni (department_id);
CREATE INDEX alumni_passing_year_idx          ON alumni (passing_year);
CREATE INDEX alumni_verify_status_created_idx ON alumni (verify_status, created_at DESC);

CREATE TRIGGER alumni_set_updated_at
  BEFORE UPDATE ON alumni
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE alumni_change_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_id   uuid NOT NULL REFERENCES alumni (id) ON DELETE RESTRICT,
  changes     jsonb NOT NULL,                        -- field -> {old, new}
  status      change_request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT alumni_change_requests_changes_object  CHECK (jsonb_typeof(changes) = 'object'),
  CONSTRAINT alumni_change_requests_review_required CHECK (status = 'pending' OR reviewed_at IS NOT NULL)
);

-- Recommended decision (docs/decisions.md): at most ONE pending change
-- request per alumnus — prevents duplicate review queues.
CREATE UNIQUE INDEX alumni_change_requests_one_pending
  ON alumni_change_requests (alumni_id) WHERE status = 'pending';

CREATE INDEX alumni_change_requests_status_created_idx
  ON alumni_change_requests (status, created_at);

CREATE TRIGGER alumni_change_requests_set_updated_at
  BEFORE UPDATE ON alumni_change_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ################## 0004_auth_support_and_outbox.sql ##################

-- 0004_auth_support_and_outbox.sql
-- Auth-support tables (Prompt 3 consumes them) + the transactional email
-- outbox. Nothing here performs auth or sends email.

CREATE TYPE auth_token_type AS ENUM ('email_verification', 'password_reset');
CREATE TYPE outbox_status   AS ENUM ('pending', 'sending', 'sent', 'failed');

-- DB-backed login rate limiting (replaces any in-memory map).
CREATE TABLE auth_attempts (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind         text NOT NULL,
  key_hash     text NOT NULL,          -- SHA-256 hex of normalised email or IP — never raw
  succeeded    boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT auth_attempts_kind_known    CHECK (kind IN ('login')),
  CONSTRAINT auth_attempts_key_hash_hex  CHECK (key_hash ~ '^[0-9a-f]{64}$')
);

-- Rolling-window lookup: attempts for one (kind, key) newest-first.
CREATE INDEX auth_attempts_lookup_idx ON auth_attempts (kind, key_hash, attempted_at DESC);

-- Retention helper for a later cleanup job.
CREATE OR REPLACE FUNCTION public.purge_auth_attempts(older_than interval)
RETURNS bigint
LANGUAGE plpgsql
AS $fn$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM auth_attempts WHERE attempted_at < now() - older_than;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$fn$;

CREATE TABLE auth_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type       auth_token_type NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT auth_tokens_token_hash_uniq UNIQUE (token_hash),
  CONSTRAINT auth_tokens_hash_hex        CHECK (token_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX auth_tokens_user_type_idx ON auth_tokens (user_id, type);

-- Outbox rows are mutated by the delivery worker (status/attempts/locked_at),
-- and `payload` may be nulled after send (Prompt 4 redaction — payloads can
-- carry one-time links).
CREATE TABLE email_outbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email        citext NOT NULL,
  template        text NOT NULL,
  payload         jsonb,
  status          outbox_status NOT NULL DEFAULT 'pending',
  attempts        integer NOT NULL DEFAULT 0,
  max_attempts    integer NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at       timestamptz,
  last_error      text,
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT email_outbox_last_error_len  CHECK (char_length(last_error) <= 500),
  CONSTRAINT email_outbox_attempts_nonneg CHECK (attempts >= 0),
  CONSTRAINT email_outbox_max_attempts    CHECK (max_attempts > 0)
);

-- Retry sweep: next-due pending/failed rows.
CREATE INDEX email_outbox_retry_idx ON email_outbox (next_attempt_at)
  WHERE status IN ('pending', 'failed');

-- ################## 0005_audit.sql ##################

-- 0005_audit.sql
-- Append-only audit tables + the immutability trigger.
-- Retention/purging is an explicit later decision (D11); not built now.

CREATE TABLE email_logs (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  outbox_id  uuid REFERENCES email_outbox (id) ON DELETE SET NULL,
  to_email   citext NOT NULL,
  template   text NOT NULL,
  status     text NOT NULL,               -- text on purpose: logs outlive enum changes
  error      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_logs_created_at_idx ON email_logs (created_at DESC);

CREATE TABLE admin_activity_logs (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  action        text NOT NULL,
  entity_type   text,
  entity_id     text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip            inet,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT admin_activity_logs_action_not_blank CHECK (btrim(action) <> ''),
  CONSTRAINT admin_activity_logs_metadata_object  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX admin_activity_logs_created_at_idx ON admin_activity_logs (created_at DESC);
CREATE INDEX admin_activity_logs_actor_idx      ON admin_activity_logs (actor_user_id, created_at DESC);

CREATE TABLE login_logs (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid REFERENCES users (id) ON DELETE SET NULL,
  email_attempted citext,
  success         boolean NOT NULL,
  reason          text,
  ip              inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT login_logs_user_agent_len CHECK (char_length(user_agent) <= 300)
);

CREATE INDEX login_logs_created_at_idx ON login_logs (created_at DESC);

-- Audit rows must never change after insert — enforced at the engine level so
-- it applies to the migration owner too, not only to ggcb_app.
CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  RAISE EXCEPTION 'audit tables are append-only (UPDATE/DELETE rejected)';
END;
$fn$;

CREATE TRIGGER email_logs_immutable
  BEFORE UPDATE OR DELETE ON email_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER admin_activity_logs_immutable
  BEFORE UPDATE OR DELETE ON admin_activity_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER login_logs_immutable
  BEFORE UPDATE OR DELETE ON login_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- ################## 0006_security_baseline.sql ##################

-- 0006_security_baseline.sql
-- RLS deny-all + least-privilege runtime role `ggcb_app`.
--
-- Intent (context.md §3 "Supabase-specific rules"): the auto-exposed Supabase
-- Data API (anon/authenticated keys) must find every public table useless —
-- RLS on, zero privileges, no policies for those roles. Authorization itself
-- is the app-level NextAuth role check (Prompt 3); RLS here is the safety net.

-- ---------------------------------------------------------------------------
-- 1. Row Level Security on every public table. No policies for anon/
--    authenticated are ever created — without a policy they see nothing.
-- ---------------------------------------------------------------------------
ALTER TABLE applied_migrations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumni                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumni_change_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_attempts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_tokens             ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_outbox            ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs              ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Revoke existing privileges. anon/authenticated only exist on Supabase —
--    guard so the same file runs on plain local Postgres and in CI (the test
--    setup creates both roles as NOLOGIN to prove the revocations).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated';
  END IF;
END $$;

-- PUBLIC defaults: functions are EXECUTE-granted to PUBLIC by default — close
-- that too (tables/sequences carry no PUBLIC grants, revoke is belt + braces).
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 3. Default privileges: objects created LATER by the migration owner must
--    inherit the same closed posture (Supabase's own bootstrap auto-grants to
--    anon/authenticated for objects the postgres role creates — revoke those
--    default grants explicitly when the roles exist).
--    NOTE: default privileges apply per creating role — migrations MUST always
--    run as the same owner role (see docs/db/migrations.md).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  owner_role name := current_user;
BEGIN
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES    FROM PUBLIC', owner_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC', owner_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC', owner_role);
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES    FROM anon', owner_role);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon', owner_role);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon', owner_role);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES    FROM authenticated', owner_role);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated', owner_role);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated', owner_role);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Least-privilege runtime role. NOLOGIN + no power attributes + no
--    BYPASSRLS. The password is NEVER set in a migration — the owner runs a
--    one-time ALTER ROLE (docs/ops/db-runtime-role.md).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ggcb_app') THEN
    CREATE ROLE ggcb_app
      NOLOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;

ALTER ROLE ggcb_app SET statement_timeout                     = '15s';
ALTER ROLE ggcb_app SET idle_in_transaction_session_timeout   = '30s';
ALTER ROLE ggcb_app SET search_path                            = public, extensions;

GRANT USAGE ON SCHEMA public TO ggcb_app;

-- ---------------------------------------------------------------------------
-- 5. Table grants (least privilege) + matching per-command RLS policies.
--    A policy without a grant does nothing; a grant without a policy is
--    blocked by RLS — BOTH are required for the app to reach a table.
-- ---------------------------------------------------------------------------

-- users / alumni / alumni_change_requests: read + write, no DELETE.
GRANT SELECT, INSERT, UPDATE ON users TO ggcb_app;
CREATE POLICY ggcb_app_select ON users FOR SELECT TO ggcb_app USING (true);
CREATE POLICY ggcb_app_insert ON users FOR INSERT TO ggcb_app WITH CHECK (true);
CREATE POLICY ggcb_app_update ON users FOR UPDATE TO ggcb_app USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON alumni TO ggcb_app;
CREATE POLICY ggcb_app_select ON alumni FOR SELECT TO ggcb_app USING (true);
CREATE POLICY ggcb_app_insert ON alumni FOR INSERT TO ggcb_app WITH CHECK (true);
CREATE POLICY ggcb_app_update ON alumni FOR UPDATE TO ggcb_app USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON alumni_change_requests TO ggcb_app;
CREATE POLICY ggcb_app_select ON alumni_change_requests FOR SELECT TO ggcb_app USING (true);
CREATE POLICY ggcb_app_insert ON alumni_change_requests FOR INSERT TO ggcb_app WITH CHECK (true);
CREATE POLICY ggcb_app_update ON alumni_change_requests FOR UPDATE TO ggcb_app USING (true) WITH CHECK (true);

-- departments: full CRUD (staff manage them).
GRANT SELECT, INSERT, UPDATE, DELETE ON departments TO ggcb_app;
CREATE POLICY ggcb_app_select ON departments FOR SELECT TO ggcb_app USING (true);
CREATE POLICY ggcb_app_insert ON departments FOR INSERT TO ggcb_app WITH CHECK (true);
CREATE POLICY ggcb_app_update ON departments FOR UPDATE TO ggcb_app USING (true) WITH CHECK (true);
CREATE POLICY ggcb_app_delete ON departments FOR DELETE TO ggcb_app USING (true);

-- auth_attempts / auth_tokens / email_outbox: full DML (retry sweeps and
-- rate-limit cleanup need DELETE).
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_attempts TO ggcb_app;
CREATE POLICY ggcb_app_select ON auth_attempts FOR SELECT TO ggcb_app USING (true);
CREATE POLICY ggcb_app_insert ON auth_attempts FOR INSERT TO ggcb_app WITH CHECK (true);
CREATE POLICY ggcb_app_update ON auth_attempts FOR UPDATE TO ggcb_app USING (true) WITH CHECK (true);
CREATE POLICY ggcb_app_delete ON auth_attempts FOR DELETE TO ggcb_app USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON auth_tokens TO ggcb_app;
CREATE POLICY ggcb_app_select ON auth_tokens FOR SELECT TO ggcb_app USING (true);
CREATE POLICY ggcb_app_insert ON auth_tokens FOR INSERT TO ggcb_app WITH CHECK (true);
CREATE POLICY ggcb_app_update ON auth_tokens FOR UPDATE TO ggcb_app USING (true) WITH CHECK (true);
CREATE POLICY ggcb_app_delete ON auth_tokens FOR DELETE TO ggcb_app USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON email_outbox TO ggcb_app;
CREATE POLICY ggcb_app_select ON email_outbox FOR SELECT TO ggcb_app USING (true);
CREATE POLICY ggcb_app_insert ON email_outbox FOR INSERT TO ggcb_app WITH CHECK (true);
CREATE POLICY ggcb_app_update ON email_outbox FOR UPDATE TO ggcb_app USING (true) WITH CHECK (true);
CREATE POLICY ggcb_app_delete ON email_outbox FOR DELETE TO ggcb_app USING (true);

-- Audit tables: append + read only. Immutability is enforced twice —
-- no UPDATE/DELETE grant AND the prevent_audit_mutation() trigger (0005).
GRANT SELECT, INSERT ON email_logs TO ggcb_app;
CREATE POLICY ggcb_app_select ON email_logs FOR SELECT TO ggcb_app USING (true);
CREATE POLICY ggcb_app_insert ON email_logs FOR INSERT TO ggcb_app WITH CHECK (true);

GRANT SELECT, INSERT ON admin_activity_logs TO ggcb_app;
CREATE POLICY ggcb_app_select ON admin_activity_logs FOR SELECT TO ggcb_app USING (true);
CREATE POLICY ggcb_app_insert ON admin_activity_logs FOR INSERT TO ggcb_app WITH CHECK (true);

GRANT SELECT, INSERT ON login_logs TO ggcb_app;
CREATE POLICY ggcb_app_select ON login_logs FOR SELECT TO ggcb_app USING (true);
CREATE POLICY ggcb_app_insert ON login_logs FOR INSERT TO ggcb_app WITH CHECK (true);

-- Migration ledger: read-only for the runtime role.
GRANT SELECT ON applied_migrations TO ggcb_app;
CREATE POLICY ggcb_app_select ON applied_migrations FOR SELECT TO ggcb_app USING (true);

-- Sequence usage for the identity columns ggcb_app inserts into
-- (all current sequences belong to identity columns — no extras).
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO ggcb_app;

-- Helper functions the runtime role legitimately executes:
--   set_updated_at        — fires inside triggers on ggcb_app UPDATEs
--   purge_auth_attempts   — the cleanup job (Prompt 3+)
-- prevent_audit_mutation is deliberately NOT granted: ggcb_app has no
-- UPDATE/DELETE on audit tables, so it can never reach the trigger.
GRANT EXECUTE ON FUNCTION public.set_updated_at()            TO ggcb_app;
GRANT EXECUTE ON FUNCTION public.purge_auth_attempts(interval) TO ggcb_app;

-- ################## 0007_owner_membership_in_ggcb_app.sql ##################

-- 0007_owner_membership_in_ggcb_app.sql
-- Grant the migration owner membership in ggcb_app so `SET ROLE ggcb_app`
-- works during `db:verify` and the test-suite's privilege probes.
--
-- Required on Supabase, where the `postgres` role is NOT a true superuser
-- and cannot SET ROLE into arbitrary roles; harmless on plain Postgres,
-- where a superuser needs no membership. Membership adds no privilege the
-- owner did not already have — it only unlocks the impersonation probe.

GRANT ggcb_app TO CURRENT_USER;

-- ################## 0008_statement_level_audit_immutability.sql ##################

-- 0008_statement_level_audit_immutability.sql
-- Harden the audit-immutability triggers: FOR EACH ROW triggers fire once per
-- affected row, so on an EMPTY table an UPDATE/DELETE silently no-ops past
-- them (proved by db:verify on Supabase: the statements were "allowed").
-- FOR EACH STATEMENT rejects the operation itself, independent of row count —
-- the correct semantic for "append-only".

DROP TRIGGER email_logs_immutable           ON email_logs;
DROP TRIGGER admin_activity_logs_immutable  ON admin_activity_logs;
DROP TRIGGER login_logs_immutable           ON login_logs;

CREATE TRIGGER email_logs_immutable
  BEFORE UPDATE OR DELETE ON email_logs
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER admin_activity_logs_immutable
  BEFORE UPDATE OR DELETE ON admin_activity_logs
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER login_logs_immutable
  BEFORE UPDATE OR DELETE ON login_logs
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();

-- ################## 0009_email_outbox_hardening.sql ##################

-- 0009_email_outbox_hardening.sql
-- Outbox hardening for the Prompt 4 delivery worker:
--   * updated_at + set_updated_at trigger (row mutation is now expected —
--     claim/retry/redact all UPDATE)
--   * idempotency_key (unique when present) so a business change can
--     enqueue exactly-once even if its handler retries
--   * throttle index  (to_email, template, created_at DESC) — the same
--     predicate enqueueEmail's CTE uses to count recent sends
--   * stale-lock index (locked_at WHERE status = 'sending') — the
--     recovery sweep scans only claimed-but-dead rows
--
-- No new enum values: a row is "dead" when status = 'failed' AND
-- attempts >= max_attempts (documented in docs/db/schema.md).
-- Grants/RLS unchanged: ggcb_app already holds full DML on email_outbox
-- (migration 0006), so db:verify expectations stay the same.

ALTER TABLE email_outbox
  ADD COLUMN updated_at       timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN idempotency_key  text;

CREATE TRIGGER email_outbox_set_updated_at
  BEFORE UPDATE ON email_outbox
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- At most one row per idempotency key.
CREATE UNIQUE INDEX email_outbox_idempotency_key_uq
  ON email_outbox (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Per-recipient+template throttle: count rows created in the window.
CREATE INDEX email_outbox_throttle_idx
  ON email_outbox (to_email, template, created_at DESC);

-- Stale-lock recovery: claimed rows whose lease expired.
CREATE INDEX email_outbox_stale_lock_idx
  ON email_outbox (locked_at)
  WHERE status = 'sending';

-- Ledger rows for the migrations above (sha256, EOL-normalised — the
-- same values `pnpm db:migrate` records).

INSERT INTO applied_migrations (id, name, checksum, execution_ms) VALUES
  (1, '0001_extensions_and_helpers.sql', '66900531207b9924f36749751f830d7c14e72133bbb385024ecd29a24a9cabf7', 0),
  (2, '0002_identity_and_org.sql', 'a5cdefe76d2110e86638284c6ce14e66561b64035ce847077540f1dd8af59109', 0),
  (3, '0003_alumni.sql', 'bbb5216755c4ee969fbf9970eafcf228f5d6f72ed00878b3c6471237172da389', 0),
  (4, '0004_auth_support_and_outbox.sql', '48dd8baf2c6baba15d59d8472200c0a2e581c4c0c38362cc3fae12ceea89e788', 0),
  (5, '0005_audit.sql', 'e4949cb32e86ce60c5b5e8e1da94c1e3eb38c47d22627518d800329730464448', 0),
  (6, '0006_security_baseline.sql', 'c24afb2843ca143d9bbd2638ce132c758025e74a913245d5e2ca4867e53d7f98', 0),
  (7, '0007_owner_membership_in_ggcb_app.sql', 'de863d4e7f53338e7f5715558cbe9afd111f28a2fdd1ff2c5a50e042476a155a', 0),
  (8, '0008_statement_level_audit_immutability.sql', '56391694358415d05e13224e6b39af51e06a79940c9a57a429cc1688676d661d', 0),
  (9, '0009_email_outbox_hardening.sql', '2893687d16c5272c22c1fb73d7fcd1cecc3df7252073b221f8d7c3fb949f8507', 0);

COMMIT;

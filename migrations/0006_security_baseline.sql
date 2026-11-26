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

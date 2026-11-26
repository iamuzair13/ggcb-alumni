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

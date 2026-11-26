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

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

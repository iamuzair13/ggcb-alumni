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

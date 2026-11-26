-- 0010_auth_attempt_kinds.sql — allow non-login attempt kinds
--
-- Prompt 5 (§4.2): password-reset and email-verification request limits are
-- rate-limited in the SAME table so abuse of every credential path is
-- bounded and auditable. `kind` gains 'password_reset' and 'email_verify'.
-- Unlike 'login' (which records FAILURES only — a blocked attempt writes
-- nothing so lockouts cannot refresh themselves), the request kinds record
-- EVERY request: they count submissions, not failures, because each
-- request has a real cost (an email) even when the email address is bogus.
-- The limiter therefore queries `kind` + `key_hash` without a `succeeded`
-- predicate; succeeded=false is written by convention (the row is a
-- request record, not an outcome).
--
-- Forward-only; no data changes. Existing 'login' rows are untouched.
ALTER TABLE public.auth_attempts
  DROP CONSTRAINT auth_attempts_kind_known,
  ADD CONSTRAINT auth_attempts_kind_known
    CHECK (kind IN ('login', 'password_reset', 'email_verify'));

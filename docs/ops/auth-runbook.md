# Auth runbook — owner operations

## Rotating the superadmin password

The seeded superadmin's password was set out-of-band during Phase 2
bootstrap. **Rotate it now** (and anytime later) with the dedicated CLI — it
never takes a password on the command line:

```powershell
pnpm auth:set-password -- --email <owner-email>
```

- Prompts for the password **twice, hidden** (no echo) — never read from
  argv, env, or a file. Refuses to run non-interactively.
- Enforces the shared password policy (10–128 chars, blocklist, no
  email/name inside it).
- Hashes with argon2id, sets `email_verified_at` if still null, bumps
  `session_version` (which **kills all outstanding sessions** for that
  user), and writes an `admin_activity_logs` row
  (`action = auth.set_password_cli`).
- Uses `DIRECT_URL`; prints the target host only (never credentials). For
  a non-local host you must acknowledge with `MIGRATE_CONFIRM=yes`.

## Recovering access

If all superadmin access is lost:

1. Confirm `users` still has an `is_active=true` `superadmin` row
   (Supabase SQL editor, or `pnpm db:explain` with `DIRECT_URL`).
2. Run `pnpm auth:set-password -- --email <owner-email>` — it both sets a
   new password and invalidates stale sessions.
3. If the account is locked by the rate limiter, wait 15 minutes (the
   rolling window) — or clear `auth_attempts` rows for it via SQL.

## Rotating AUTH_SECRET

Generate a fresh secret (`openssl rand -base64 32`) and update
`AUTH_SECRET` in the environment. **This invalidates every existing
session/JWT** — all users must sign in again. Rate-limit keys are derived
from it too, so historical `auth_attempts.key_hash` values become opaque
(which is fine — they only matter inside a 15-minute window).

## Login security behaviour (what users will see)

- Wrong password / unknown email / inactive account → identical
  "Invalid email or password" (anti-enumeration).
- Correct password but unverified email → a distinct
  "email is not verified" message (the resend flow arrives in Prompt 5).
- Rate limited (5 per email+IP, 30 per IP, 20 per email in 15 min) →
  "Too many attempts."

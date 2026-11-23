# Migrations

Small, custom, forward-only runner on the `postgres` driver — no ORM, no
migration framework (decision in `docs/decisions.md`).

## Files

- `migrations/NNNN_snake_name.sql` — 4-digit sequential numbering, contiguous
  from `0001`. `pnpm db:new <name>` creates the next file from the template.
- Every file runs inside **one transaction** together with its ledger
  insert — files must NOT contain `BEGIN`/`COMMIT`.
- The runner sets `SET LOCAL search_path = public, extensions` before each
  file so extension objects resolve on both plain Postgres and Supabase
  (where they live in the `extensions` schema).

## Ledger

`applied_migrations` is **bootstrap-created by the runner** (`CREATE TABLE
IF NOT EXISTS` before any file runs) — chosen over putting it in `0001` so
the ledger exists even if the first migration is still being authored.

Columns: `id` (the file number, PK), `name`, `checksum` (SHA-256 of file
contents), `applied_at`, `execution_ms`.

## Runner behaviour (`pnpm db:migrate`)

- Connects with **`DIRECT_URL` only** (never the pooler), `max: 1`.
- Takes Postgres advisory lock `20261123` — concurrent runners serialise.
- Fails loudly on: numbering gaps, duplicate numbers, bad filenames, a
  ledger row with no file, and — most importantly — **a checksum change on
  an already-applied file**.
- Refuses non-local hosts unless `MIGRATE_CONFIRM=yes` is set; prints the
  target host (never credentials) before running.
- `pnpm db:status` shows applied/pending with checksums (exit 2 when
  pending exist — usable as a CI gate).

## Rules

1. **Never edit an applied migration.** Checksum mismatch = runner refuses.
   Rollback is a new migration that undoes the change.
2. **Every new public table needs the security boilerplate** (in the
   `db:new` template): `ENABLE ROW LEVEL SECURITY`, least-privilege grants
   to `ggcb_app`, and one `CREATE POLICY` per granted command.
   `pnpm db:verify` fails when it's missing.
3. **Default privileges apply per creating role** — all migrations MUST run
   as the same owner role every time (the `postgres`/owner role on Supabase,
   the docker `postgres` superuser locally).
4. **Enum changes**: add a value in its own migration; a new enum value
   cannot be _used_ in the same transaction that adds it.
5. **Name every constraint and index** explicitly — grepable, reviewable,
   and required by `db:verify` tests.

## Current files

| File                           | Contents                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `0001_extensions_and_helpers`  | citext + pgcrypto (portable schema placement), `set_updated_at()`                                                                                            |
| `0002_identity_and_org`        | `user_role`, `users`, `departments`                                                                                                                          |
| `0003_alumni`                  | `gender_type`, `verify_status`, `datasource_type`, `change_request_status`, `alumni`, `alumni_change_requests` — incl. the labelled **D4** roll-number index |
| `0004_auth_support_and_outbox` | `auth_token_type`, `outbox_status`, `auth_attempts`, `auth_tokens`, `email_outbox`, `purge_auth_attempts()`                                                  |
| `0005_audit`                   | `email_logs`, `admin_activity_logs`, `login_logs`, `prevent_audit_mutation()` + triggers                                                                     |
| `0006_security_baseline`       | RLS on all tables, anon/authenticated + PUBLIC revokes, default privileges, `ggcb_app` role + grants + policies                                              |

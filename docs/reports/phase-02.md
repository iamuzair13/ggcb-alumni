# Phase 2 completion report — Database foundation

Date: 2026-11-23 · Branch: `phase-02-database` · Scope: Prompt 2 of 14
(schema, migrations, RLS baseline, least-privilege runtime role, DB client,
superadmin seed). No auth, email delivery, or feature code.

## 1. Summary

- Custom forward-only migration system: `scripts/lib/runner.ts` + CLI
  (`db:migrate`, `db:status`, `db:new`, `db:verify`, `db:seed:superadmin`,
  `db:explain`). Ledger `applied_migrations` is runner-bootstrapped.
- 6 SQL files create the 11 required tables (and nothing else), 7 native
  enums, 2 helper functions, 3 immutability triggers.
- Security baseline (`0006`): RLS on every public table; zero privileges
  for `anon`/`authenticated`/`PUBLIC`; closed default privileges for future
  objects; `ggcb_app` NOLOGIN/NOBYPASSRLS runtime role with least-privilege
  grants + matching per-command policies.
- `src/server/db`: postgres.js singleton (lazy, globalThis-cached),
  `prepare:false`, `withTransaction`, `closeDb`, dev-only
  `DB_QUERY_STATS`/`AsyncLocalStorage` counter, hand-written row types +
  enum constants that a drift test pins to `pg_enum`.
- Idempotent, password-less, audited superadmin seed.
- Real-Postgres suite (`vitest.db.config.ts`, 32 specs across 7 files) +
  DB-free interlock proof in the unit suite. Skips cleanly without
  `TEST_DIRECT_URL`; CI runs it against a `postgres:17` service.

## 2. Postgres version

**PostgreSQL 17.12** — confirmed on the provisioned Supabase project
(`thgyfbnxonengnpfrmmk`, region ap-northeast-1) via `select version()` on
2026-11-23. Matches the PG-17 assumption.

## 3. Migrations (order + SHA-256, first 16 hex)

| File                                      | sha256[:16]        | Contents                                                                                                               |
| ----------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `0001_extensions_and_helpers`             | `66900531207b9924` | citext + pgcrypto (portable extensions-schema placement), `set_updated_at()`                                           |
| `0002_identity_and_org`                   | `a5cdefe76d2110e8` | `user_role`, `users`, `departments`                                                                                    |
| `0003_alumni`                             | `bbb5216755c4ee96` | 4 enums, `alumni` + `alumni_change_requests`, D4-labelled roll-number index                                            |
| `0004_auth_support_and_outbox`            | `48dd8baf2c6baba1` | `auth_token_type`, `outbox_status`, `auth_attempts`, `auth_tokens`, `email_outbox`, `purge_auth_attempts()`            |
| `0005_audit`                              | `e4949cb32e86ce60` | 3 append-only audit tables + `prevent_audit_mutation()` triggers                                                       |
| `0006_security_baseline`                  | `c24afb2843ca143d` | RLS, revokes, default privileges, `ggcb_app` role + grants + policies                                                  |
| `0007_owner_membership_in_ggcb_app`       | `de863d4e7f53338e` | `GRANT ggcb_app TO CURRENT_USER` — enables `SET ROLE` probes where the owner isn't a superuser (Supabase)              |
| `0008_statement_level_audit_immutability` | `56391694358415d0` | Audit triggers → `FOR EACH STATEMENT` (row-level triggers silently no-op on empty tables — caught by `db:verify` live) |

## 4. Tables

Exists (exactly the 11 required): `applied_migrations`, `users`,
`departments`, `alumni`, `alumni_change_requests`, `auth_attempts`,
`auth_tokens`, `email_outbox`, `email_logs`, `admin_activity_logs`,
`login_logs`. Deferred (`alumni_ecards`, `stories`, `events`,
`announcements`, `opportunities`, `import_batches`, `import_rows`) are NOT
created. Forbidden columns (`cnic`, `sap_id`, `faculty_id`, `program_id`)
do not exist — enforced by `db:verify`, not just convention.

## 5. Indexes (all named; rationale in docs/db/schema.md)

`users_email_uniq` · `departments_name_lower_uniq` /
`departments_code_lower_uniq` (normalised CRUD uniqueness) ·
`alumni_roll_number_norm_uniq` (**the only place D4 lives**, labelled in
`0003`) · `alumni_email_uniq` (partial where not-null) ·
`alumni_department_id_idx`, `alumni_passing_year_idx` (admin list filters) ·
`alumni_verify_status_created_idx` (admin tabs + counts) ·
`alumni_change_requests_one_pending` (one pending CR per alumnus) +
`alumni_change_requests_status_created_idx` (review queue) ·
`auth_attempts_lookup_idx` (rate-limit window) ·
`auth_tokens_user_type_idx` · `email_outbox_retry_idx` (partial, retry
sweep) · `admin_activity_logs_created_at_idx` +
`admin_activity_logs_actor_idx` · `email_logs_created_at_idx` ·
`login_logs_created_at_idx`.

Deliberately absent: `city` expression index — seq scan is correct at this
data size; `db:explain` baseline will confirm before any addition.

## 6. `ggcb_app` grants & policies (both required — RLS has no BYPASSRLS)

| Table                                       | Grants                                                 | Policies            |
| ------------------------------------------- | ------------------------------------------------------ | ------------------- |
| users, alumni, alumni_change_requests       | SELECT, INSERT, UPDATE                                 | one per granted cmd |
| departments                                 | SELECT, INSERT, UPDATE, DELETE                         | 4                   |
| auth_attempts, auth_tokens, email_outbox    | SELECT, INSERT, UPDATE, DELETE                         | 4 each              |
| email_logs, admin_activity_logs, login_logs | SELECT, INSERT                                         | 2 each              |
| applied_migrations                          | SELECT                                                 | 1                   |
| sequences                                   | USAGE (all existing = identity columns)                | —                   |
| functions                                   | EXECUTE on `set_updated_at()`, `purge_auth_attempts()` | —                   |

Role settings: `statement_timeout=15s`,
`idle_in_transaction_session_timeout=30s`, `search_path=public,extensions`.
**No password anywhere** — `docs/ops/db-runtime-role.md` documents the
one-time `ALTER ROLE … WITH LOGIN PASSWORD` for the owner.

## 7. `db:verify`

Read-only-plus-`SET ROLE` checks, all implemented in
`scripts/lib/verify.ts`: RLS on every public table; zero privileges for
`anon`/`authenticated` on tables/sequences/functions; `ggcb_app` holds
**exactly** the §5.2 matrix; a policy exists per granted command; audit
tables reject UPDATE/DELETE as owner AND as `ggcb_app`; no forbidden
columns. **Ran against the real Supabase dev project on 2026-11-23:
all checks passed** (after `0007` enabled the `SET ROLE` probe and `0008`
hardened audit triggers — both found live by this verifier, see §10);
also wired into CI and `test:db`.

## 8. Tests

| Suite                                       | Result                                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check` (lint, typecheck, unit, build) | pass — 33 unit tests incl. 3 interlock proofs                                                                                                    |
| `pnpm test:db` locally                      | 32 specs present, **skipped** (no `TEST_DIRECT_URL` — no local Postgres per owner's instruction)                                                 |
| `pnpm test:db` in CI                        | configured — `postgres:17-alpine` service; global setup drop/creates `ggcb_test`, runs real runner, logs in `ggcb_app` with a test-only password |
| `pnpm test:e2e` / `pnpm test:e2e:prod`      | 33/33 and 3/3 pass (unchanged)                                                                                                                   |
| Client-bundle DB check                      | added to CI `check` job + verified locally (0 hits for `postgres.js`/`DATABASE_URL`/`pg_advisory` in `.next/static/chunks`)                      |

## 9. EXPLAIN baseline

`pnpm db:explain` implemented (`scripts/explain.ts`): interlocked to local
`*test*` databases, loads ~5 000 clearly-fake alumni, EXPLAINs the 5
representative queries, writes `docs/perf/db-baseline.md`. **Not yet
generated** — no local Postgres here (owner provisions Supabase). The stub
documents the exact regeneration commands; CI/dev runs fill it in.

## 10. Could NOT verify offline (owner acceptance steps)

Updated 2026-11-23 — the owner's Supabase dev project went live during
this phase, so most items moved from "unverified" to **verified on the
real project** (`aws-1-ap-northeast-1.pooler.supabase.com`, PG 17.12):

| Item                                                          | Status                                                                                                                                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Migrations on real Postgres                                   | **Verified** — `schema.sql` applied via SQL editor; `db:migrate` applied `0007`/`0008` through the session pooler (advisory lock + transactions work through it)                     |
| `db:verify` on the real project                               | **Verified** — all checks pass, including real `anon`/`authenticated` revocation, `ggcb_app` grant/policy matrix, audit immutability                                                 |
| Direct connection host (`db.<ref>`)                           | **IPv6-only on free tier** — unreachable from the owner's network. `DIRECT_URL` therefore points at the **session pooler** (`:5432`), which preserves session state the runner needs |
| `citext` on Supabase                                          | **Verified** — extensions live in the `extensions` schema; `search_path` resolution worked end-to-end                                                                                |
| Supabase `postgres` role is NOT a superuser                   | **Verified + fixed** — `SET ROLE` required migration `0007` (`GRANT ggcb_app TO CURRENT_USER`)                                                                                       |
| Row-level audit triggers no-op on empty tables                | **Verified + fixed** — `db:verify` caught it live; `0008` made triggers `FOR EACH STATEMENT`                                                                                         |
| `test:db` full suite                                          | Still CI/local-Postgres only — the interlock refuses non-local targets **by design**                                                                                                 |
| `DATABASE_URL` (transaction pooler, `ggcb_app` login)         | Still open — needs the one-time `ALTER ROLE ggcb_app WITH LOGIN PASSWORD '…'`; then confirm whether the pooler wants `ggcb_app` or `ggcb_app.<ref>` username                         |
| Supabase re-granting `anon`/`authenticated` on future objects | Ongoing — `0006` revokes current defaults for the owner role; RLS stays the backstop. Re-run `db:verify` after any new table                                                         |

**Owner steps completed:** project created, `schema.sql` applied,
`0007`/`0008` applied via `pnpm db:migrate`, `pnpm db:verify` green.
**Owner steps remaining:** `ALTER ROLE ggcb_app WITH LOGIN PASSWORD '…'`,
fill `DATABASE_URL` (transaction pooler) in `.env.local`, first real app
query in Prompt 3.

## 11. Dependencies

Added: `postgres@4.1.1` (runtime — the locked driver), `tsx@4.23.15` (dev —
script runner; alternative was precompiling scripts to JS). Nothing else;
no ORM, no hashing/auth/email/Supabase-client/Excel packages.

## 12. Decisions & open-decision defaults

In `docs/decisions.md` §Prompt 2: custom runner, runner-bootstrapped
ledger, `session_version`, `ON DELETE` map (SET NULL alumni.user_id /
actor refs, CASCADE only auth_tokens, RESTRICT elsewhere), gender values,
one-pending-CR unique index, `email_logs.status` as text, forbidden-column
enforcement, test interlock, PG 17 assumption.

D3 (no seed departments) — honoured: zero rows seeded. D4 (unique
normalised roll number) — isolated to the single labelled
`alumni_roll_number_norm_uniq` index; replaceable by one later migration.

## 13. Issues, risks, deviations

- **No DB tests ran locally** — no Postgres on this machine by owner
  decision; specs are written to spec and skip cleanly (`describe.skipIf`),
  so `pnpm test`/`check` stay green. CI executes them. Risk: SQL typos
  surface on first real run — mitigate by running CI on the PR.
- `email_outbox` carries `created_at` only (spec's explicit column list),
  despite being mutable — deliberate spec-faithful choice.
- One transient note: `pg_advisory_lock` is session-scoped; the runner's
  `max: 1` pool guarantees the same session runs the whole pass.

## 14. Handoff to Prompt 3

Reuse, don't rebuild: `users` (`password_hash` null-friendly,
`session_version`), `auth_attempts` (+ `purge_auth_attempts()`),
`auth_tokens`, `login_logs`, `withTransaction()`, the `ggcb_app`
credentials pattern, `seedSuperadmin()`, `runVerify()` (CI gate),
`DB_ENUMS` + the pg_enum drift test. `src/server/auth/index.ts` is still
the placeholder — Prompt 3 replaces it. Remember: `ggcb_app` has NO DELETE
on `users`/`alumni` — deactivation is `is_active=false`.

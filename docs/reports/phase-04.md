# Phase 04 report — transactional email (outbox + worker + templates)

Branch `phase-04-email` from `phase-03-auth` @ `3da7acb`. Commits:

| Commit    | Scope                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------- |
| `44459ff` | carry-over: enumerated admin sections, `alumni-rejected` persona, `cron` policy kind                                   |
| `1b781fd` | email subsystem: migration 0009, crypto, templates, enqueue, worker, purge, cron route, audit helpers, env, docs, deps |
| `711d629` | test suites + decisions log                                                                                            |

**No remote is configured** — nothing was pushed; all work is local commits.

## 1. Summary

- Transactional **outbox**: `enqueueEmail` inserts inside the caller's
  transaction — the email exists iff the business change does.
- **Worker** (`processOutbox`): `FOR UPDATE SKIP LOCKED` claiming,
  stale-lock recovery, strict-timeout SMTP send, backoff+jitter retries,
  permanent-failure kills, payload redaction, `email_logs` per attempt.
- **12-template catalogue**: HTML + text each, strict Zod payloads, all
  interpolation escaped, links only from `NEXT_PUBLIC_APP_URL` + fixed
  path + token.
- **Cron endpoint** `GET /api/cron/email-outbox`: fail-closed bearer
  (`timingSafeEqual`), policy kind `cron`, matrix shows 401 for every
  persona. No `vercel.json` committed — Hobby plan allows only daily
  crons; `docs/ops/vercel-cron.example.json` + pg_cron alternative
  documented.
- **Payloads encrypted at rest** — AES-256-GCM envelope, HKDF key from
  `AUTH_SECRET` (`email-outbox-payload` label); nulled after send.
- **Audit helpers** — sanitized metadata, in-transaction + best-effort
  modes, typed action union.
- `EMAIL_MODE` `off`(default)/`log`(dev-only, prod refused)/`smtp` —
  the app works fully with no provider (D10); swap is env-only.

## 2. Phase 3 carry-over (§3) results

1. **Page guards vs policy** — verified by reading code:
   `/admin/import-export` and `/admin/audit-logs` use
   `requireRole(["superadmin","admin"])`; `/admin/users` uses
   `requireRole(["superadmin"])`; all other `/admin/*` fall under the
   layout's `requireStaff` (viewer included). Matches context.md §10 —
   no divergence found, nothing changed.
2. **Admin sections enumerated** — `ROUTE_POLICY` now lists
   `/admin/alumni|departments|content|analytics` (STAFF) plus the three
   restricted sections instead of relying on the `/admin` prefix. Matrix
   regenerated; snapshot test updated and passing.
3. **`alumni-rejected` persona** added to `PERSONAS`/`PERSONA_ROLE`,
   `provisionE2ePersonas` (rejected alumni row), and the e2e matrix
   spec's persona list.
4. **`/forbidden` representation** — `src/app/forbidden.tsx` is a Next
   convention file (not `page.tsx`/`route.ts`), so the completeness
   scanner never sees a route for it and needs no policy entry. It is
   the _render_ for `forbidden()` thrown by guards — the 403 outcomes
   appear in the matrix as cell values, not rows.
5. **History greps** (counts + commit ids only; values never repeated):
   | Leak class                                                           | Commits touching it                                                         |
   | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
   | Seeded password                                                      | `1cab063` (1)                                                               |
   | Owner full name                                                      | `1cab063`, `5ba0826` (2)                                                    |
   | Owner email                                                          | `29d647d` (1); commit metadata also carries it as the author's own identity |
   | Supabase project ref / pooler host                                   | `1b05a91`, `4317fd5`, `76341d5` (3; removed by `1c445c4`)                   |
   | Working tree: **zero** hits for all four classes after the `3da7acb` |
   | scrub. History not rewritten (owner decision pending).               |

## 3. Dependencies

| Package                   | Version  | Justification                                                      |
| ------------------------- | -------- | ------------------------------------------------------------------ |
| `nodemailer`              | `7.0.13` | The one allowed new runtime dep — locked §3 choice (SMTP, no SDKs) |
| `@types/nodemailer` (dev) | `7.0.12` | types for the above                                                |

No provider SDKs, no queue frameworks, no email templating libs.
Verified: `nodemailer` does not appear in any `.next/static/chunks`
client bundle (grep scan of the production build).

## 4. Migration 0009

`migrations/0009_email_outbox_hardening.sql` — checksum
`2893687d16c5272c22c1fb73d7fcd1cecc3df7252073b221f8d7c3fb949f8507`
(normalized EOL). Contents: `updated_at` column + `set_updated_at`
trigger; `idempotency_key` + unique partial index; throttle index
`(to_email, template, created_at DESC)`; stale-lock partial index on
`locked_at WHERE status='sending'`. No enum changes — "dead" = `failed`
AND `attempts >= max_attempts` (documented in `docs/db/schema.md`).

**Applied to the live Supabase database** (`pnpm db:migrate` → "applied
0009… 9 total"); `pnpm db:verify` → **all security checks passed**
(grant/RLS expectations unchanged — new columns inherit table grants).

## 5. Environment variables (new/changed)

| Variable                                                 | Default | Required when                         |
| -------------------------------------------------------- | ------- | ------------------------------------- |
| `EMAIL_MODE`                                             | `off`   | —                                     |
| `SMTP_HOST/PORT/USER/PASSWORD/SECURE`, `FROM_EMAIL/NAME` | —       | `smtp`                                |
| `REPLY_TO_EMAIL`                                         | —       | optional                              |
| `NEXT_PUBLIC_APP_URL`                                    | —       | mode≠off; https in prod               |
| `CRON_SECRET`                                            | —       | prod+mode≠off, ≥32 chars (was min 16) |
| `EMAIL_BATCH_SIZE`                                       | 20      | —                                     |
| `EMAIL_CONCURRENCY`                                      | 2       | —                                     |
| `EMAIL_RUN_BUDGET_MS`                                    | 20000   | —                                     |
| `EMAIL_STALE_LOCK_SECONDS`                               | 300     | —                                     |

Conditional rules live in `env.server.ts`'s superRefine and are covered
by `email-env.test.ts` (10 tests incl. prod refusal of `log`).

## 6. Worker state machine

```
pending ──claim(SKIP LOCKED,attempts+1)──▶ sending ──send ok──▶ sent
   ▲                                        │                  (payload=NULL,
   │                                        │                   email_logs 'sent')
   │                              ┌─────────┴──────────┐
   │                        transient              permanent/last-attempt
   │                        (4xx/timeout)          (5xx/EAUTH/render/decrypt)
   │                             │                      │
   └── next_attempt_at=now+bk ───┘                      ▼
        backoff+jitter                            failed, attempts=max
      (≈1m,5m,15m,1h,6h)                          = "dead" + email_logs
stale 'sending' (locked_at > EMAIL_STALE_LOCK_SECONDS) → 'failed' + counted attempt
```

Backoff ladder `[60s, 300s, 900s, 3600s, 21600s]` × jitter 0.8–1.2.
Message-ID = `<outbox_id>@<FROM domain>` (provider-level dedupe).

## 7. Measured query counts

- `enqueueEmail`: **1 query** (CTE: throttle count + conditional insert +
  `ON CONFLICT` idempotency) — spec allows ≤2.
- Claim: 1 statement per batch; stale-lock recovery: 1; each outcome: 1
  update + 1 `email_logs` insert; purge: 4 bounded deletes + 1 function
  call.

## 8. Test results

| Suite                            | Count                           | Status                                                                                                               |
| -------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Unit (`pnpm test`)               | **222 passed**                  | incl. env matrix (10), crypto (7), templates (47), scrub/classify (24), transport (3), sanitizer (6), cron auth (10) |
| DB (`pnpm test:db`)              | **71 skipped**                  | no local `*test*` Postgres — docker isn't installed on this machine; CI postgres service covers it                   |
| Mailpit integration              | **12 skipped**                  | `MAILPIT_API_URL`/`MAILPIT_SMTP_PORT` unset locally; CI service added                                                |
| E2E dev (`pnpm test:e2e`)        | **41 passed, 9 skipped**        | persona/cron-200 suites need test DB + CRON_SECRET (CI provides both)                                                |
| E2E prod                         | **3 passed**                    |                                                                                                                      |
| `pnpm check`                     | lint + typecheck + test + build | ✅                                                                                                                   |
| `pnpm db:verify` (live Supabase) | all checks passed               |                                                                                                                      |
| Matrix snapshot                  | regenerated + green             |                                                                                                                      |

## 9. Updated authz matrix (generated)

The full table now lists 18 policy rows × 7 personas — cron row = 401 for
all, admin sections enumerated. Generated file:
`docs/security/authz-matrix.md` (regenerate: `pnpm authz:matrix`).

## 10. Issues, risks, deviations

- **`EMAIL_MODE=log` console print** includes recipient + text body by
  design (dev debugging); it's structurally impossible in production
  (env refine + worker guard).
- **`after()` kickOutbox** exists but is intentionally unused until a
  caller needs it; cron drain is the authoritative worker (fire-and-
  forget is unreliable on serverless — the outbox row is the truth).
- **`AUTH_SECRET` rotation** makes pending payloads undecryptable →
  those rows die permanently (documented; plan rotations on empty queue).
- **Dev server not restarted during this phase** — the `instant=false`
  flag and route-policy changes need a dev-server restart if you test
  manually.
- Cache Components note: `export const dynamic` is rejected in Next 16 —
  the cron route is dynamic via `await connection()` instead.
- Local docker absent → db/mailpit specs could not be exercised here;
  they run in CI (postgres + mailpit services wired this phase).

## 11. Owner actions when domain + SMTP exist (D10)

1. Env: `EMAIL_MODE=smtp`, `SMTP_HOST/PORT/USER/PASSWORD`,
   `SMTP_SECURE` (true=465, false=STARTTLS), `FROM_EMAIL`, `FROM_NAME`,
   `NEXT_PUBLIC_APP_URL=https://<domain>`, `CRON_SECRET` (≥32, generated).
2. DNS on a dedicated sending subdomain: SPF `include:<provider>`,
   provider DKIM CNAMEs, DMARC `p=quarantine`.
3. Verify: `pnpm email:test -- --to <you>` → check mailbox.
4. Schedule the drain: `vercel.json` cron block from
   `docs/ops/vercel-cron.example.json` (Pro plan only) **or** Supabase
   `pg_cron`+`pg_net` GET with the bearer (per-minute, free — example in
   `docs/ops/email.md`).

## 12. Handoff to Prompt 5

Reuse: `enqueueEmail` (+ optional `kickOutbox`), `createAuthToken`/
`consumeAuthToken` (payload token = raw token, TTLs already set),
`email_verification`/`password_reset`/`registration_received` templates,
`/verify-email` + `/reset-password` link paths (`EMAIL_LINK_PATHS`),
`RateLimitStore` for resend, `recordAdminActivity` in-tx for
`user.registered`/`auth.email_verified`/`auth.password_reset`,
`writeLoginLog`. Flip nothing env-wise — `EMAIL_MODE` stays `off` until
D10 resolves; `log` mode gives full local flow.

## 13. Tests not run locally (explicit)

- All `test:db` specs (71) incl. the new outbox/worker/purge/audit specs
  — no local `*test*` Postgres (docker absent).
- `email-mailpit.test.ts` (12) — no Mailpit; CI service covers.
- E2E persona-matrix + cron-200 cases (9 skips) — need test DB +
  `CRON_SECRET` on the test server (CI provides both).

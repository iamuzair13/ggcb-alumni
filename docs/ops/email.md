# Transactional email — outbox, worker, and provider setup

Status: **built (Prompt 4), provider not configured (D10)**. Everything works
with no real SMTP; switching providers is an environment-only change.

## Modes (`EMAIL_MODE`)

| Mode   | Behaviour                                                                                                                                  | Use                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| `off`  | **Default.** Enqueue works; worker exits without touching rows; rows stay `pending` (they are durable).                                    | Until a provider exists |
| `log`  | Dev/test only — **env validation refuses it in production**. Prints recipient/subject/text body to console, marks `sent`, redacts payload. | Local link debugging    |
| `smtp` | Real delivery via nodemailer (strict timeouts, STARTTLS or implicit TLS ≥1.2).                                                             | Production              |

## Environment variables

| Variable                      | Required when                  | Notes                                              |
| ----------------------------- | ------------------------------ | -------------------------------------------------- |
| `EMAIL_MODE`                  | — (default `off`)              | `off`/`log`/`smtp`                                 |
| `SMTP_HOST`                   | `smtp`                         |                                                    |
| `SMTP_PORT`                   | `smtp`                         | 587 (STARTTLS) or 465 (implicit TLS)               |
| `SMTP_USER` / `SMTP_PASSWORD` | `smtp`                         | Never logged, never in docs                        |
| `SMTP_SECURE`                 | `smtp`                         | `true`=implicit TLS; `false`=**STARTTLS required** |
| `FROM_EMAIL` / `FROM_NAME`    | `smtp`                         | Sender identity + Message-ID domain                |
| `REPLY_TO_EMAIL`              | —                              | optional                                           |
| `NEXT_PUBLIC_APP_URL`         | mode ≠ `off` (https in prod)   | Token links are built ONLY from this + fixed path  |
| `CRON_SECRET`                 | prod + mode ≠ `off`, ≥32 chars | Bearer secret for the drain route                  |
| `EMAIL_BATCH_SIZE`            | — (20)                         | rows claimed per sweep                             |
| `EMAIL_CONCURRENCY`           | — (2)                          | parallel sends inside a run                        |
| `EMAIL_RUN_BUDGET_MS`         | — (20000)                      | run stops claiming after this                      |
| `EMAIL_STALE_LOCK_SECONDS`    | — (300)                        | `sending` lease before recovery                    |

## Provider setup checklist (when a provider exists — D10)

1. Create the mailbox/API credentials at the provider (any SMTP works —
   nodemailer only, no SDK by design §3).
2. Set `EMAIL_MODE=smtp` + the `SMTP_*`/`FROM_*` values above.
3. Set `NEXT_PUBLIC_APP_URL=https://<domain>` and a ≥32-char `CRON_SECRET`.
4. Verify with `pnpm email:test -- --to you@example.com` (refuses unless
   `EMAIL_MODE=smtp`; prints a scrubbed result, never credentials).
5. Point Vercel Cron (or pg_cron + pg_net) at `GET /api/cron/email-outbox`
   with `Authorization: Bearer <CRON_SECRET>`.

## DNS checklist (when the college domain exists)

- **SPF**: `v=spf1 include:<provider> ~all` on the sending subdomain.
- **DKIM**: provider's key records (usually CNAMEs) under the same subdomain.
- **DMARC**: `v=DMARC1; p=quarantine` (start), aligned to the FROM domain.
- **Dedicated sending subdomain** (e.g. `mail.alumni.ggcb.edu.pk`): keeps the
  main domain's reputation isolated; set FROM to `@mail.alumni.ggcb.edu.pk`.
- Verify with `pnpm email:test` + a DKIM/SPF checker before going live.

## Scheduling — Vercel Cron vs pg_cron

`GET /api/cron/email-outbox` drains the outbox then runs the maintenance
purge. Bearer-secret auth, fail-closed, constant-time — sessions/roles can
never authorize it (matrix row shows 401 for every persona).

- **Vercel Hobby**: only _daily_ crons — a `*/10 * * * *` schedule fails
  deployment. `docs/ops/vercel-cron.example.json` shows the Pro-plan shape;
  do NOT commit a `vercel.json` schedule until the plan is confirmed.
- **Alternative — Supabase pg_cron + pg_net** (recommended interim):
  `select cron.schedule('drain', '* * * * *', $$ select net.http_get(url:='<app>/api/cron/email-outbox', headers:='{"Authorization":"Bearer <CRON_SECRET>"}') $$)`
  — per-minute, free, lives next to the database.

## Local Mailpit

`docker compose up mailpit` → SMTP on `:1025`, UI/API on `:8025`.
Dev env: `EMAIL_MODE=smtp`, `SMTP_HOST=localhost`, `SMTP_PORT=1025`,
`SMTP_SECURE=false`, any user/pass, `FROM_*` anything.
The db-suite's `email-mailpit.test.ts` runs against it when
`MAILPIT_API_URL` + `MAILPIT_SMTP_PORT` are set (CI provides both).

## Worker behaviour

`pending → sending → sent` (payload redacted) or `failed` (retry with
backoff ≈1m/5m/15m/1h/6h+jitter). **Dead** = `failed` AND
`attempts >= max_attempts` (no enum value). Claims use `FOR UPDATE SKIP
LOCKED` — multiple workers can run concurrently without double-sending.
Stale `sending` rows past `EMAIL_STALE_LOCK_SECONDS` are recovered to
`failed` with a counted attempt.

## Troubleshooting

- **Rows stuck `pending`**: `EMAIL_MODE=off`, or cron isn't firing —
  check the route manually with the bearer secret.
- **Rows stuck `sending`**: worker crashed mid-claim; the stale-lock sweep
  recovers them on the next run (`EMAIL_STALE_LOCK_SECONDS`).
- **Dead rows**: inspect `last_error` (scrubbed); fix the cause, then
  `UPDATE email_outbox SET status='pending', attempts=0, next_attempt_at=now()
 WHERE id='…'` to requeue.
- **Payload undecryptable**: `AUTH_SECRET` was rotated — pending payloads
  are unrecoverable by design; rows die with that scrubbed error. Re-enqueue
  from the business side if still needed (rotate only between batches).

## Key-rotation caveat

Rotating `AUTH_SECRET` invalidates all pending payload encryption (same
rotation invalidates sessions and rate-limit keys — see phase-03 report).
Plan rotations for a drained queue.

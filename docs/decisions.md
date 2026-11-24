# Architecture & product decisions

Status legend: **Locked** (from `context.md`), **Decided** (chosen this
phase, reversible only with a recorded reason), **Open-decision default**
(context.md §13 default, owner may override in a later prompt).

## Locked architecture (context.md)

- Next.js App Router + React + strict TypeScript + Tailwind; `src/` + `@/*`.
- Supabase = PostgreSQL + Storage only. **Not** Supabase Auth. Later access
  is server-side only via the `postgres` driver (prompt 2).
- NextAuth v5 for auth (prompt 3). Four roles: `superadmin`, `admin`,
  `viewer`, `alumni`.
- BS programs + departments only — no faculties, no programs table.
- Public scope is only the future E-card verification page.

## Decided this phase

- **Next.js 16.4.6 / React 19.3 / Tailwind 4** — current CNA template,
  Cache Components + Partial Prefetching enabled.
- **pnpm 12 + Node 24 LTS** — `.nvmrc` pins `24`; `engines` allows
  `>=24 <25`, `pnpm >=12`.
- **Static CSP in `next.config.ts`, not nonce-based proxy CSP** —
  a nonce CSP (`proxy.ts`) forces dynamic rendering and conflicts with
  Cache Components. `script-src` keeps `'unsafe-inline'` (Bootstrap
  0 on OWASP's CSP scale, only once fetch directives are strict) and this
  is flagged to revisit once the app becomes interactive; `unsafe-eval`
  is dev-only. See `docs/design/design-system.md` & report §6.
- **`server-only` modules live under `src/server/`**; enforced by a custom
  flat-config ESLint rule (`ggcb/no-server-imports-in-client`) that scans
  `"use client"` modules for static, re-export, and dynamic `import()`
  specifiers matching `server/` paths or `@/server*`. Proven by a unit
  test, so the boundary is tested, not convention.
- **shadcn-style primitives on Base UI (base-nova), not Radix** — the
  generated set targets `@base-ui/react`. Restyled to tokens; components
  are local source, owned by the repo.
- **`cn` is local** (`@/lib/utils` = clsx + tailwind-merge) — the `cn`
  npm package was removed; a `no-restricted-imports` ESLint rule blocks it
  from being re-introduced if a future `shadcn add` emits `from "cn"`.
- **Light-only palette** — dark-mode tokens exist in `globals.css` as a
  stub but nothing ships dark UI; Toaster is pinned `theme="light"`.
- **`FormField` wrapper** (`ui/form-field.tsx`) — label + required marker
  - hint + `role="alert"` error wired via `aria-describedby`/`useId`.
    Render-prop children so Server Components can use it.
- **Base UI choice controls are named with `aria-labelledby`** —
  Checkbox/Radio/Switch render `<span role>` elements (not labellable),
  so `htmlFor` cannot name them. Documented on `/design` and here for all
  future forms.
- **`DataTable`** (`ui/data-table.tsx`) — one `columns` definition drives
  both the real `<table>` (scrolls in its own container, page never
  scrolls horizontally) and stacked `<dl>` cards under `sm`.
- **TanStack Query only inside alumni/admin shells** — root layout stays
  lean; public pages carry no client providers.
- **`Button loading` prop** — spinner + `aria-busy` + disabled, label kept
  at `opacity-0` so there is no layout shift and no loss of accessible name.
- **husky + lint-staged + secretlint** — pre-commit formats staged files
  and scans for secrets; CI repeats the scan.
- **Empty-state, skeleton, and error conventions documented** in
  `docs/design/design-system.md` so every phase reuses them.

## Open-decision defaults adopted (context.md §13)

| #   | Default adopted                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------- |
| D1  | Name: "Government Postgraduate College Burewala (GGCB)"; neutral placeholder branding.                                |
| D2  | Existing roll number/email registrations rejected with a neutral message; admin may send a set-password invite later. |
| D3  | No seed departments — superadmin creates them later.                                                                  |
| D4  | Globally unique normalised roll number (verify against Excel later).                                                  |
| D5  | No CNIC or other government ID collected.                                                                             |
| D6  | Supabase Storage later, server-side only.                                                                             |
| D7  | No peer directory initially.                                                                                          |
| D8  | E-card later: PNG + PDF, optional photo, no expiry.                                                                   |
| D9  | Viewers cannot export data.                                                                                           |
| D10 | Vercel + Supabase assumed; SMTP provider still needs owner input.                                                     |
| D11 | Consent checkbox + privacy page planned; official wording still needed.                                               |
| D12 | Manual staff verification of roll number, department, session — no document upload.                                   |

Owner input still needed later: official logo/brand colors (D1), SMTP
provider (D10), consent wording (D11), Excel column mapping for roll
numbers (D4/D2 import phase).

## Prompt 2 � Database (phase-02-database)

- **Custom forward-only migration runner** (`scripts/lib/runner.ts`) � no
  ORM/migration framework (spec �4 forbids one; ~140 lines covers ledger,
  advisory lock, checksums, gap detection). `applied_migrations` is
  bootstrap-created by the runner, not by `0001`.
- **`postgres` (postgres.js) runtime dep** � the locked driver (context.md
  �3). `tsx` dev dep to run scripts under TypeScript � justified over
  compiling scripts to JS or duplicating them.
- **Node version**: Postgres **17** assumed (owner's Supabase major
  unknown � recorded as an open item for the report).
- **`session_version` on `users`** � added beyond �6's sketch so Prompt 3
  can invalidate outstanding JWTs on password reset/deactivation without a
  deny-list table.
- **`ggcb_app` least-privilege runtime role** (NOLOGIN, NOBYPASSRLS):
  grants + per-command RLS policies both required � a table missing either
  is unreachable AND fails `db:verify`.
- **`alumni.user_id` `ON DELETE SET NULL`** � deleting a login must never
  destroy an alumni record (imported-only records have no login).
- **`auth_tokens` `ON DELETE CASCADE`** � tokens are worthless without
  their user; the only CASCADE in the schema.
- **Gender values `male/female/other`** � mirrors the Excel-era
  conventions; extendable via a later enum migration if the college wants
  more values.
- **One pending change request per alumnus** [Recommended] � partial
  unique index; prevents duplicate review queues.
- **`email_logs.status` stored as `text`** � logs must outlive enum
  changes; the outbox itself uses the native `outbox_status` enum.
- **No `cnic`, `sap_id`, `faculty_id`, `program_id` columns** � enforced by
  `db:verify` + a test, not just convention.
- **Test interlock**: destructive DB work requires a local host AND a
  database name containing `test`; proven by `src/tests/unit/db-safety`.
- **No local Postgres on the dev machine** (owner provisions Supabase
  directly) � `test:db` runs in CI's service container and locally via
  `docker compose`; specs skip cleanly when `TEST_DIRECT_URL` is unset.

- **Supabase project exists** � ref `<project-ref>`
  (`db.<project-ref>.supabase.co`), provisioned by the owner
  2026-11-23. Its Postgres major version is whatever the project was
  created with (check `select version();` � expected 15+; migrations were
  written/tested for 17-compatible SQL that is also valid on 15/16).
  Bootstrap path: paste root `schema.sql` in the SQL editor (it
  pre-populates the ledger), or `pnpm db:migrate` with a filled
  `DIRECT_URL` + `MIGRATE_CONFIRM=yes`.

  **Postmortem (2026-11-23, same-day):** schema applied on the real
  project � **PostgreSQL 17.12** confirmed. Direct host is IPv6-only on
  the free tier, so `DIRECT_URL` uses the session pooler
  (`<pooler-host>:5432`); transaction pooler
  stays for `DATABASE_URL`. `db:verify` ran green after two real
  findings: (a) Supabase `postgres` is not a superuser ? `0007`
  role-membership grant for `SET ROLE` probes; (b) `FOR EACH ROW` audit
  triggers no-op on empty tables ? `0008` statement-level triggers.

  **Resolved (same session):** `ALTER ROLE ggcb_app WITH LOGIN PASSWORD`
  applied via `DIRECT_URL`. Supavisor REQUIRES the `role.<ref>` username
  format for custom roles � plain `ggcb_app` is refused with
  `ENOIDENTIFIER no tenant identifier provided`; working `DATABASE_URL`
  = `postgresql://ggcb_app.<project-ref>:***@<pooler-host>:6543/postgres`
  (written to `.env.local`, verified `current_user=ggcb_app` + table
  reads). Document the `.<ref>` suffix in `docs/ops/db-runtime-role.md`.

  **Password set out-of-band (owner request):** `password_hash` on the
  seeded superadmin written directly via `DIRECT_URL` using argon2id
  (`argon2@0.45.2` added � auth dep arriving early for the operational
  password set; Prompt 3's verify path reuses it). `pnpm-workspace.yaml`
  `allowBuilds` approves `argon2`/`esbuild` install scripts (pnpm 12
  strict-builds mode; sharp/unrs-resolver remain denied). Prompt 3's
  set-password flow can rotate it anytime.

## Prompt 3 — Authentication & RBAC (phase-03-auth)

- **`next-auth@5.0.0-beta.32` pinned** — Auth.js v5 (beta line is the only
  App-Router-native line; peers allow `next@^16` + `react@^19`). No
  adapter — the `users` table is the identity store.
- **Credentials-only, JWT sessions (1h)** — stateless, no session table.
  JWT carries `sub`, `name`, `role`, `sessionVersion`, `checkedAt` only —
  no email/PII (context.md §7 privacy posture).
- **`forbidden()` + `forbidden.tsx` for wrong-role (explicit 403, never 404)** — requires `experimental.authInterrupts` on Next 16.4.6 (flag
  enabled; the primitive is stable in intent, the flag gate is the only
  experimental part). Chosen over `notFound()` because a disguised 404
  both leaks less _and_ communicates less — the spec requires an explicit
  Forbidden surface.
- **Server guards are authoritative; `proxy.ts` is early routing only** —
  it redirects cookie-less users fast and sets `Cache-Control:
private, no-store`; it never _grants_ access. Every guarded
  layout/action/route rechecks server-side.
- **Cache-Components nuance discovered:** `auth()` inside RSC requires
  `await connection()` first (crypto reads are "unstable values"), and
  `redirect()`/`forbidden()` thrown inside `<Suspense>` become _streamed_
  fallbacks that cannot set HTTP 307/403 — so protected guards run
  OUTSIDE Suspense (fully dynamic protected pages, real statuses).
  Only guest-page bounces (`GuestRedirect`) accept the streamed path.
- **Session refresh ≤ 5 min + `fresh` guard** — `checkedAt` in the JWT
  triggers one `recheckUser` query (active + role + session_version) at
  most every five minutes; `fresh: true` forces it for sensitive
  operations.
- **Rate limit keyed on HMAC(secret, email|ip|pair)** — email/IP are never
  stored in `auth_attempts` (opaque `key_hash` only); three buckets:
  5 per email+ip, 30 per ip, 20 per email — 15-min rolling window, all
  failure rows written in ONE multi-row insert to respect the ≤5-query
  request budget. Blocked attempts write _nothing_ so lockouts decay.
- **Argon2id (m=19456, t=2, p=1)** — OWASP-cheatsheet parameters; verify
  is params-agnostic so `needsRehash` upgrades old hashes lazily on
  successful login. `serverExternalPackages: ["argon2"]` keeps the N-API
  binding out of the bundle.
- **Common-password blocklist: SecLists 10k-most-common (MIT)** — provenance
  - regeneration documented in `docs/security/password-blocklist.md`.
- **Later-phase env vars relaxed to optional** — `SMTP_*`, `SUPABASE_*`,
  `CRON_SECRET` were required in Phase 2 but nothing used them; Prompt 3's
  production start proved that premature. Each later prompt flips its own
  vars to required.
- **`pnpm authz:matrix`** generates `docs/security/authz-matrix.md`; a
  unit test fails when the file drifts from the route policy.

## Prompt 4 � Transactional email (phase-04-email)

- **`nodemailer@7.0.13` (+ `@types/nodemailer@7.0.12`)** � the ONLY new
  runtime dependency this phase (spec allows exactly this). Locked �3:
  SMTP via nodemailer, outbox pattern, server-side templates, no provider
  SDKs. No queue/templating framework (no BullMQ/MJML/react-email).
- **EMAIL_MODE `off` is the default** � the system is fully functional
  with no provider; `log` is dev/test-only (env validation refuses it in
  production); `smtp` requires the full SMTP_* + FROM_* set (conditional
  requirements live in `env.server.ts` superRefine).
- **Payloads encrypted at rest** � AES-256-GCM envelope in the existing
  jsonb column, key = HKDF(AUTH_SECRET, "email-outbox-payload"). Redacted
  (NULL) on send. AUTH_SECRET rotation makes pending rows undecryptable ?
  permanent failure with a scrubbed error (documented, accepted risk).
- **"Dead" is a predicate, not an enum** � `failed AND attempts >=
max_attempts`; no `outbox_status` value added (spec �4.2).
- **Idempotency via unique partial index** on `idempotency_key` +
  `ON CONFLICT � WHERE IS NOT NULL DO NOTHING` � exactly-once enqueue for
  retried business ops.
- **Throttle is silent and at insert time** � a CTE counts recent
  recipient+template rows inside the same INSERT (=2 queries total,
  usually 1); callers only learn {queued|duplicate|throttled}, never a
  user-facing signal.
- **Worker claims with FOR UPDATE SKIP LOCKED** � multiple workers need
  no coordination; fresh transporter per run (serverless-safe), strict
  timeouts, TLS =1.2, requireTLS when secure=false; Message-ID = outbox id
  @ FROM domain (provider-level dedupe for free).
- **Cron route is a separate policy kind `cron`** � fail-closed bearer
  secret with timingSafeEqual; sessions/roles NEVER authorize it; matrix
  shows 401 for every persona. No vercel.json schedule committed (Hobby
  allows only daily crons � example + pg_cron alternative documented).
- **Transient vs permanent by RFC 5321** � 4xx/timeouts retry with
  backoff+jitter (�1m,5m,15m,1h,6h); 5xx/recipient + EAUTH/render/decrypt
  die immediately. `last_error` is scrubbed (credentials, query-string
  URLs, token-like blobs) and capped at 500.
- **Audit metadata is sanitized** � secret-ish keys dropped recursively,
  ~4 KB cap, non-plain values rejected; two modes: in-transaction (fails
  the change) vs best-effort via after() (docs/security/audit-actions.md).
- **Admin sections enumerated in the route policy** (�3.2) + the
  `alumni-rejected` persona added � the matrix lists every section.
- **Mailpit** for local/CI SMTP (docker-compose + CI service container) �
  infrastructure, not an app dependency.

### Phase 6 � complete UI (prototype)

- **No new runtime dependencies.** Charts, calendar, stepper, dropzone and
  the QR placeholder are hand-built SVG/CSS/React per the prompt's default.
  Rationale: the chart set is small (4 types, static data), a library
  (recharts/d3/apexcharts ~100-200 KB) buys nothing here, and hand-built
  SVG gives exact control over a11y (focusable points, view-as-table
  fallback). Reassess if a later phase needs interaction-heavy charts.
- **Fixture world is server-side only** (`src/features/_shared/fixtures/`).
  Demo client views receive data as props; adapter factories contain logic
  only. Verified by `scripts/check-demo-leak.ts` (grep .next/static for the
  marker) and a unit test banning fixture imports in client files.
- **Persona switcher is React context state** inside the dev-only demo �
  it can never affect real auth by construction (no session, no cookie,
  no real route consumes it).
- **`/design/demo/**` inherits the `/design` devOnly route-policy entry** �
  no new policy surface; matrix shows 404 for every persona in production.
- **Native `<details>` for the landing FAQ** � zero-JS accordion, a11y for
  free, no dependency; richer accordions stay a Base UI decision if needed.
- **`registerSchema` lower-cases roll numbers** at parse time (normalized
  uniqueness rule D4 default) so client and server agree on normalization.

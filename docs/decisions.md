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

- **Supabase project exists** � ref `thgyfbnxonengnpfrmmk`
  (`db.thgyfbnxonengnpfrmmk.supabase.co`), provisioned by the owner
  2026-11-23. Its Postgres major version is whatever the project was
  created with (check `select version();` � expected 15+; migrations were
  written/tested for 17-compatible SQL that is also valid on 15/16).
  Bootstrap path: paste root `schema.sql` in the SQL editor (it
  pre-populates the ledger), or `pnpm db:migrate` with a filled
  `DIRECT_URL` + `MIGRATE_CONFIRM=yes`.

  **Postmortem (2026-11-23, same-day):** schema applied on the real
  project � **PostgreSQL 17.12** confirmed. Direct host is IPv6-only on
  the free tier, so `DIRECT_URL` uses the session pooler
  (`aws-1-ap-northeast-1.pooler.supabase.com:5432`); transaction pooler
  stays for `DATABASE_URL`. `db:verify` ran green after two real
  findings: (a) Supabase `postgres` is not a superuser ? `0007`
  role-membership grant for `SET ROLE` probes; (b) `FOR EACH ROW` audit
  triggers no-op on empty tables ? `0008` statement-level triggers.

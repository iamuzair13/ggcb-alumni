# Phase 1 completion report — Foundation

Date: 2026-03-31 · Branch: `phase-01-foundation` · Scope: Prompt 1 of 14
(discovery, initialization, tooling, design system, shared primitives, empty
audience shells). No database, auth, email, or feature modules were started.

## 1. Summary

The repo went from `context.md`-only to a working Next.js 16 foundation:

- Strict-TypeScript App Router project with the required `src/` + `@/*`
  layout and the folder skeleton specified in `context.md`.
- Four audience shells (public `/`, auth placeholders, alumni `/dashboard`,
  admin `/admin` + 8 section placeholders), all responsive, all with
  designed empty/error/not-found states.
- Token-driven design system (`docs/design/design-system.md` +
  `globals.css`) in an institutional evergreen/cream palette; 27 shadcn-style
  primitives on Base UI restyled to those tokens plus four project
  components (`FormField`, `DataTable`, `StatusBadge`, `EmptyState`,
  `PageHeader`, shells).
- Dev-only `/design` showcase (404 in production, `noindex`).
- Security headers via `next.config.ts` (CSP, HSTS, frame-ancestors,
  nosniff, referrer/permissions policies, no `x-powered-by`).
- Typed env validation (Zod) with a documented `SKIP_ENV_VALIDATION`
  escape hatch; `.env.example` carries names only.
- Enforced client→server boundary: `server-only` + a custom ESLint rule
  (`ggcb/no-server-imports-in-client`) proven by a unit test.
- Quality gates: Prettier, ESLint, Vitest (30 tests), Playwright (33 dev +
  3 prod e2e incl. axe, headers, 360px overflow, `/design` behaviour),
  secretlint + husky/lint-staged, GitHub Actions CI.

## 2. Environment

- Node `v24.19.0` (`.nvmrc` = `24`; `engines` = `node >=24 <25, pnpm >=12`)
- pnpm `12.21.0` · npm `11.17.0` (present, unused) · OS: Windows 11
- Stack: `next@16.4.6`, `react@19.3.0`, `typescript@5.9.3`,
  `tailwindcss@4.3.3`, `@tanstack/react-query@5.108.2`, `zod@4.6.7`,
  `vitest@5.1.1`, `playwright@1.65.1`, `@base-ui/react@1.9.0`.

## 3. Skills

See `docs/skills.md` for the full record. Summary: `ui-ux-pro-max` and
`find-skills` were read/invoked; `frontend-design` (Anthropic),
`web-design-guidelines` (Vercel), and `accessibility` (addyosmani) were
installed globally because the phase spec requires all three and they were
absent. Next.js/Playwright skills were evaluated and skipped — bundled
docs sufficed.

## 4. Key files / tree

```
src/
  app/
    layout.tsx  globals.css  not-found.tsx  error.tsx  global-error.tsx
    (public)/ layout.tsx page.tsx
    (auth)/   layout.tsx login/ register/ forgot-password/
    (alumni)/ layout.tsx dashboard/
    (admin)/  admin/ layout.tsx + 8 section placeholders
    api/health/route.ts
    design/  page.tsx  toast-demo.tsx
  components/
    ui/        27 primitives + form-field.tsx + data-table.tsx
    shared/    logo, skip-link, status-badge, empty-state, placeholder-page
    layout/    site-header, site-footer, page-header, alumni-nav,
               admin-nav, admin-breadcrumb
  lib/  config/ (env.server, env.public, index) · api/client.ts ·
        utils/ · constants/ (roles, statuses, navigation)
  providers/query-provider.tsx
  server/ db|auth|services/index.ts  (guarded placeholders, server-only)
  types/   (reserved for domain types, next phase)
  tests/   unit/ (5 files, 30 tests) · e2e/ (5 files) · e2e/prod/
eslint-rules/no-server-imports-in-client.mjs
docs/ design/ (design-system.md, guidelines-review.md) · decisions.md ·
      skills.md · reports/phase-01.md · ops/ perf/ security/ (reserved)
```

## 5. Dependencies (one line each)

Runtime: `next`, `react`, `react-dom` (framework) · `@base-ui/react`
(headless primitives the generated components target) · `lucide-react`
(icons) · `sonner` (toast) · `@tanstack/react-query` (query layer,
wired in alumni/admin shells) · `zod` (env + future request validation) ·
`clsx`, `tailwind-merge`, `cn` (class merging; `cn` is what the generated
code imports) · `class-variance-authority` (variant APIs) ·
`tw-animate-css` (micro-animations) · `server-only` (import-time guard for
`src/server/**`).

Dev: `typescript`, `@types/*`, `eslint`+`eslint-config-next`+
`eslint-config-prettier`, `prettier`+`prettier-plugin-tailwindcss`,
`vitest`+`jsdom`+`@vitejs/plugin-react`+`vite-tsconfig-paths`+
`@testing-library/*`, `@playwright/test`+`@axe-core/playwright`,
`husky`+`lint-staged`, `secretlint`+preset, `shadcn` (codegen CLI —
**dev-only**; never shipped).

Not installed on purpose (forbidden or unneeded): `postgres`/`pg`,
`next-auth`, `@supabase/*`, `xlsx`/any Excel lib, `next-themes` (removed —
light-only palette).

## 6. Decisions and open-decision defaults

Full record in `docs/decisions.md`. Highlights:

- **Static CSP** (not nonce/`proxy.ts`) because a nonce CSP forces dynamic
  rendering and conflicts with Cache Components; `script-src
'unsafe-inline'` is the documented Bootstrap-0 state to revisit once the
  app is interactive; `unsafe-eval` exists only in development.
- **pnpm + Node 24**; **`server-only` + custom ESLint boundary rule**;
  Base UI choice-control labelling via `aria-labelledby`; dark mode not
  adopted (tokens stubbed only); `shadcn` moved to devDeps after the audit.
- All twelve §13 defaults adopted and logged (D1 neutral branding, D2
  neutral reject message, D3 no seed departments, D4 unique roll number,
  D5 no CNIC, D6 Supabase Storage server-side later, D7 no peer directory,
  D8 PNG+PDF E-card later, D9 viewers can't export, D10 Vercel+Supabase
  assumed / SMTP owner input pending, D11 consent text pending owner
  wording, D12 manual staff verification).

## 7. Test & gate results

| Gate                   | Result     | Evidence                                                                                                                      |
| ---------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`            | pass       | 0 errors / 0 warnings                                                                                                         |
| `pnpm typecheck`       | pass       | `tsc --noEmit` clean                                                                                                          |
| `pnpm test` (unit)     | pass       | 30/30 — env validation (6), `cn`/format (4), api client (7), components (8), import-guard rule (5)                            |
| `pnpm test:e2e`        | pass       | 33/33 — 14 route smokes, admin nav completeness, `/design` dev render, axe ×6 pages, headers ×2, health ×2, 360px overflow ×8 |
| `pnpm test:e2e:prod`   | pass       | 3/3 — `/design` → 404 in production, prod headers (no `unsafe-eval`, `upgrade-insecure-requests`), health                     |
| `pnpm build`           | pass       | 15 routes; all prerendered except dynamic `/api/health`                                                                       |
| axe (serious/critical) | **0**      | 6 pages scanned; real violations found and fixed during this pass (see guidelines-review.md)                                  |
| `pnpm audit --prod`    | pass       | no known vulnerabilities                                                                                                      |
| CI                     | configured | `.github/workflows/ci.yml` — check + e2e + secret-scan on PRs; not yet run remotely (no GitHub remote configured — see §11)   |

## 8. Acceptance checklist

| #   | Item                                                                                                              | Status        | Evidence                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | `context.md` read fully, unmodified                                                                               | pass          | `git log` — single root commit, no diff                                                                |
| 2   | App Router, `src/`, strict TS, `@/*`                                                                              | pass          | `tsconfig.json`, all routes under `src/app`                                                            |
| 3   | pnpm + LTS pin + engines                                                                                          | pass          | `.nvmrc`=24, `package.json#engines`                                                                    |
| 4   | Required folder skeleton                                                                                          | pass          | `src/{app,components,components/ui,features,lib,providers,server/{db,auth,services},types,tests}`      |
| 5   | Scripts: dev/build/start/lint/typecheck/format/test/test:e2e/check                                                | pass          | `package.json` — every gate green                                                                      |
| 6   | Prettier + ESLint + Vitest + Playwright configs                                                                   | pass          | `.prettierrc.json`, `eslint.config.mjs`, `vitest.config.ts`, `playwright*.config.ts`                   |
| 7   | `.env.example` names-only + Zod validation + `SKIP_ENV_VALIDATION`                                                | pass          | `.env.example`, `src/lib/config/env.server.ts`, unit tests incl. prod-throw + skip paths               |
| 8   | Security headers incl. no `x-powered-by`, tested                                                                  | pass          | `next.config.ts`, `e2e/security-headers.spec.ts`, `e2e/prod/*`                                         |
| 9   | Client cannot import `src/server/**` — lint rule + proof                                                          | pass          | `eslint-rules/no-server-imports-in-client.mjs`, `tests/unit/server-import-guard.test.ts`               |
| 10  | No DB code; `src/server/db` ready for prompt 2                                                                    | pass          | `src/server/db/index.ts` = typed placeholder only                                                      |
| 11  | `migrations/` ready but empty                                                                                     | pass          | `migrations/.gitkeep` only                                                                             |
| 12  | Shells: public + auth + alumni + admin, 8 admin sections                                                          | pass          | routes + `smoke.spec.ts` incl. nav completeness check                                                  |
| 13  | `/api/health`, not-found, error                                                                                   | pass          | `api/health/route.ts`, `not-found.tsx`, `error.tsx`, `global-error.tsx`                                |
| 14  | `/design`: dev renders, prod 404, noindex                                                                         | pass          | `design/page.tsx` guard + metadata; dev & prod e2e                                                     |
| 15  | QueryProvider + typed API client + query-key convention                                                           | pass          | `providers/query-provider.tsx`, `lib/api/client.ts`, convention in design-system.md §10 + client TSDoc |
| 16  | Design tokens once → Tailwind mapping                                                                             | pass          | `globals.css` `@theme inline`, design-system.md                                                        |
| 17  | ~24 primitives, restyled; icon-only controls named                                                                | pass          | `components/ui/` — 27 files; Menu/MoreHorizontal labelled                                              |
| 18  | States: loading/empty/error/disabled/pending                                                                      | pass          | spinner/skeleton/empty/form-field/button-loading, showcased on `/design`                               |
| 19  | a11y: labels, focus, keyboard, semantics, reduced-motion, AA contrast                                             | pass          | axe suite green; `prefers-reduced-motion` in `globals.css`; measured ratios in design-system.md §5     |
| 20  | Tables degrade to cards or container-scroll                                                                       | pass          | `DataTable` — `dl` cards < `sm`, `overflow-x-auto` ≥ `sm`                                              |
| 21  | Unit: env, cn, api client, components                                                                             | pass          | `tests/unit/*` — 30 tests                                                                              |
| 22  | E2E: routes, headers, `/design` dev+prod, axe, mobile scroll                                                      | pass          | `tests/e2e/*` — 36 tests total                                                                         |
| 23  | No page-level horizontal scroll at 360px                                                                          | pass          | `mobile.spec.ts` across 8 routes                                                                       |
| 24  | CI: install → check → Playwright on PRs                                                                           | pass (config) | `.github/workflows/ci.yml`                                                                             |
| 25  | Secret scanning                                                                                                   | pass          | secretlint pre-commit + CI job; `.secretlintrc.json`                                                   |
| 26  | `pnpm install --frozen-lockfile` clean-clone works                                                                | pass          | verified locally (§9)                                                                                  |
| 27  | No forbidden scope: no DB/auth/email/Excel code, no Supabase packages, no mock alumni data, no faculties/SAP/etc. | pass          | dep list §5; placeholder copy uses "Sample Alumni X"                                                   |
| 28  | Docs: design-system, decisions, skills, guidelines-review, report                                                 | pass          | `docs/` tree §4                                                                                        |
| 29  | Small logical commits on `phase-01-foundation`, no direct-to-default push                                         | pass          | commits listed below                                                                                   |
| 30  | PR into default branch                                                                                            | **blocked**   | `gh` CLI unavailable, no remote configured — see §11                                                   |

## 9. Bundle size & performance

- Production chunk payload: **≈1.05 MB raw JS across 23 chunks** + one
  96 KB Tailwind stylesheet (uncompressed; Turbopack output no longer
  prints per-route First-Load JS). Every route is statically prerendered
  except `/api/health` (dynamic via `connection()`).
- Heaviest chunk contributors are shared: React runtime, Base UI
  primitives (only where imported — the auth/public pages don't load
  TanStack Query or overlay code).
- No runtime font fetch: `next/font` self-hosts all three families.
- Follow-ups for perf phases: `/api/health` is the only dynamic route by
  design; CSP is static so all static pages stay cacheable; measure
  per-route JS once real screens exist (Prompt 4+ dashboards).

## 10. Dependency audit

- `pnpm audit --prod`: **0 vulnerabilities**.
- Full audit: **1 moderate** — `minimatch@10.2.6` ReDoS
  (GHSA-g3hv-75wg-m249), reached only via the dev-time `shadcn` CLI.
  Acceptable this phase (never shipped); revisit if the advisory ages
  unresolved when Prompt 2 adds real deps.

## 11. Issues, risks, deviations

- **PR not opened** — `gh` CLI is unavailable and the repo has no remote.
  Not a code issue; created the branch + commits locally. Next step when a
  remote exists: push `phase-01-foundation` and open the PR.
- `minimatch` moderate (dev-only transitive) — see §10.
- `script-src 'unsafe-inline'` — static CSP trade-off documented in
  `docs/decisions.md`; re-evaluate once interactive pages justify nonces.
- `process.env.NODE_ENV` guard for `/design` — safe for this phase;
  `VERCEL_ENV` would be more precise once preview environments exist
  (Prompt 2+ can switch it).
- `cn` package vs `@/lib/utils` — both work; generated code uses the
  package. Normalised and documented rather than rewritten (gen-output
  compatibility for future `shadcn add`).
- Killed one stale `next dev` (PID 13548) to run e2e — no user impact.

## 12. Handoff to Prompt 2

Ready hooks that must not be rebuilt: `src/server/db/index.ts` (replace
the placeholder with the `postgres` client — pooler URL runtime, direct
URL migrations); `src/lib/config/env.server.ts` (all Prompt-2 env names
already validated); `migrations/` (empty, with `.gitkeep`); `.env.example`
(complete name list); `src/lib/constants/roles.ts` + `statuses.ts`;
`api/client.ts` + `query-provider.tsx` (fetch conventions);
`docs/decisions.md` (record every new choice there).

Prompt 2 scope per plan: `departments`/`alumni`/`staff_users`/supporting
tables per `context.md` §4, migration ledger, RLS deny-all baseline
policies, the seed superadmin, and server-side DB access layer.

Owner questions still open: logo/brand colors + contact email (D1), SMTP
provider (D10), consent wording (D11), Excel column mapping (D4).

### Exact local commands

```bash
git checkout phase-01-foundation
corepack enable  # if pnpm shim missing
pnpm install --frozen-lockfile
pnpm check          # lint + typecheck + unit + build
pnpm test:e2e       # dev-server e2e (needs: pnpm exec playwright install chromium)
pnpm test:e2e:prod  # rebuild + prod e2e
pnpm dev            # shells at / /login /register /forgot-password /dashboard /admin /design
```

### Commits on this branch

See `git log phase-01-foundation` — logical commits: scaffold+tooling →
env/config → design system tokens → UI primitives → app shells → tests →
docs/CI.

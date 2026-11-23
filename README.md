# GGCB Alumni Portal

Alumni portal for **Government Postgraduate College Burewala (GGCB)** —
registration, profiles, alumni E-cards, and community content, with a staff
administration area.

Built with Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind
CSS 4, TanStack Query, and Zod. See `context.md` (source of truth) and
`docs/` for architecture and design decisions.

## Getting started

Requirements: Node.js 24 (`engines`), pnpm 12+.

```bash
cp .env.example .env   # fill in values; see "Environment" below
pnpm install --frozen-lockfile
pnpm dev
```

## Scripts

| Command              | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `pnpm dev`           | Dev server                                           |
| `pnpm build`         | Production build                                     |
| `pnpm start`         | Serve the production build                           |
| `pnpm lint`          | ESLint (includes client→server import boundary rule) |
| `pnpm typecheck`     | `tsc --noEmit` (strict)                              |
| `pnpm format`        | Prettier write                                       |
| `pnpm format:check`  | Prettier check                                       |
| `pnpm test`          | Vitest unit tests                                    |
| `pnpm test:e2e`      | Playwright against the dev server                    |
| `pnpm test:e2e:prod` | Playwright against a production build                |
| `pnpm check`         | lint + typecheck + test + build (CI gate)            |

## Environment

`.env.example` lists every variable (names only, never values). Server env is
validated once at startup in `src/lib/config/env.server.ts` and fails closed
in production. `SKIP_ENV_VALIDATION=true` exists only for tooling/CI that
builds without a provisioned environment — never set it on real deployments.

## Architecture notes

- `src/server/**` is server-only: a custom ESLint rule
  (`ggcb/no-server-imports-in-client`, `eslint-rules/`) rejects any
  `"use client"` module importing it — proven by a unit test.
- Design tokens live in `src/app/globals.css` (documented in
  `docs/design/design-system.md`); screens use shared primitives in
  `src/components/`, not raw Tailwind.
- `/design` is the dev-only component showcase (404 in production).

## Current phase

Prompt 1 of 14 — foundation only: project setup, design system, shared
primitives, empty audience shells, quality gates. No database, auth, or
feature behaviour yet (see `docs/reports/phase-01.md` for the handoff).

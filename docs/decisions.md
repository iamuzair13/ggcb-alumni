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
- **`cn` dependency** — generated components import `cn` from the tiny
  `cn` npm package (clsx + tailwind-merge wrapper). `src/lib/utils`
  re-exports it so app code uses the `@/lib/utils` alias.
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

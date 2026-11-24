# Phase 06 report — complete UI (clickable prototype)

Branch `phase-06-complete-ui` from `phase-05-accounts`.

**No remote is configured** — nothing was pushed; all work is local commits.

## 1. Summary

- **Every remaining screen exists** as a high-fidelity, clickable,
  fixture-backed prototype — 24 demo routes across public, alumni and
  admin areas plus the two real public routes (`/`, `/privacy`).
- **Identity direction documented** in `docs/design/ui-direction.md`:
  institutional-but-modern register; warm paper + white surfaces, deep
  evergreen as the single accent, Source Serif 4 headings / Public Sans
  UI / IBM Plex Mono identifiers. The E-card artifact is the signature
  object.
- **Zero new runtime dependencies.** Charts (bar×2, line, donut),
  calendar, stepper, drop-zone, QR placeholder and file preview are
  hand-built SVG/CSS/React.
- **No backend work**: no migrations, no server actions, no DB queries,
  no env vars, no route-policy relaxation. `/design/demo/**` rides the
  existing `/design` `devOnly` policy entry.

## 2. Real routes shipped

- `/` — landing: hero with the E-card ghost card, three capability
  rows, "how it works" steps, FAQ via native `<details>`, footer with
  `[Placeholder: D1]` marks. No invented statistics/testimonials.
- `/privacy` — data-handling explainer with `[Placeholder: D11]` copy.

Per-route JS (raw, uncompressed, incl. shared runtime chunks):
`/` ≈ 660 KB across 14 chunks; `/privacy` ≈ 668 KB across 14 chunks.
Next 16's build table no longer prints First-Load JS — measured from the
emitted HTML `<script>` refs in `.next/server/app/*.html`.

## 3. Demo architecture

- `src/features/<feature>/{types,schemas,ports}.ts` for all 17 feature
  areas — backend-neutral ports so prompts 7–13 swap fixtures for real
  containers (`docs/design/wiring-guide.md` describes the contract).
- `src/features/_shared/fixtures/{engine,world}.ts` — deterministic
  seeded world: 140 alumni (95 verified / 25 under-approval / 20
  rejected), 6 departments (one empty — edge case), events,
  announcements, opportunities, stories, change requests, E-cards,
  import batches, audit rows. Same seed → same world (unit-tested).
- **Persona switcher** = React context inside the demo only. It picks
  which fixture slice + nav renders; it cannot touch sessions, cookies,
  `requireRole` or any real route — verified by construction and by the
  parity test (`demo-access.test.ts` asserts `DEMO_PERSONAS` access
  rules mirror `ROUTE_POLICY` for every mirrored path).
- `?persona=<id>` seeds the switcher — used by axe/screenshot tooling to
  reach staff surfaces deterministically.
- Demo shells replicate the real alumni/admin chrome (sticky header +
  hamburger `Sheet` at <sm/md, role-filtered nav, skip-to-content stays).
- A persistent demo banner marks every prototype route: "Demo data —
  not real. Clickable prototype for review; fixtures only."

## 4. Route coverage (all `/design/demo/…`)

| Area   | Routes                                                                                                                                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public | `public/register`, `public/check-email`, `public/verify`                                                                                                                                                           |
| Alumni | `alumni/dashboard` (verified/under-approval/rejected via persona), `profile`, `requests`, `e-card`, `events`, `announcements`, `opportunities`, `stories`, `account`                                               |
| Admin  | `admin`, `alumni`, `alumni/[id]`, `departments`, `content` (events/announcements/opportunities/stories-review/featured tabs), `import-export` (5-step wizard + export builder), `analytics`, `audit-logs`, `users` |
| Index  | `demo` — route map + persona switcher + forbidden-state previews                                                                                                                                                   |

States covered: loading (500 ms skeletons on analytics), empty
(`EmptyState` + `ChartOrEmpty`), error/recovery (register throttled
toggle, reject dialogs, not-found record), success (toasts), disabled
(expired opportunity Apply, viewer read-only, `DemoForbidden` 403s,
`adminRouteAllowed` gates for viewer/admin on import-export, audit-logs
and users).

## 5. New shared components (`components/shared/`)

`charts.tsx` (ChartCard + BarChartH/V + LineChart + DonutChart with
view-as-table toggle, focusable points, sr-only summaries),
`calendar-grid.tsx`, `stepper.tsx`, `drop-zone.tsx`,
`deadline-badge.tsx`, `completeness-meter.tsx`, `diff-table.tsx`,
`ecard-artifact.tsx`, `paragraph-text.tsx`, `kpi-card.tsx`,
`date-block.tsx`. All documented on `/design` (dev-only) and in
`docs/design/design-system.md`.

## 6. Production safety

- Every demo page: `if (NODE_ENV === "production") notFound()` —
  prerenders to a static 404 at build; `demo-prod.spec.ts` asserts 404
  on `next start` for a route sample.
- `demo-boundary.test.ts` — no `views/`, `components/` or `app/` client
  file may import `features/**/fixtures/**`.
- `scripts/check-demo-leak.ts` — greps every client chunk referenced by
  a real route's emitted HTML for fixture markers; dev-only chunks may
  carry fixture strings because their routes never serve. Current:
  24 chunks across 19 real routes, marker-free.
- CSP, headers, middleware/proxy untouched; no remote assets anywhere.

## 7. Verification evidence

- **Screenshots:** `design-review/phase-06/` — 29 routes ×
  {360, 768, 1280}px via `scripts/design-screenshots.mjs`.
- **360px sweep:** zero page-level horizontal scroll on all routes
  (script asserts `scrollWidth == clientWidth`). It initially caught
  23 violations — root causes fixed: `min-w-0` on grid children,
  `flex-wrap` on action rows, `overflow-x-auto` on `TabsList`s, donut
  svg capped, demo topbar wraps (see guidelines-review §Prompt 6).
- **Keyboard:** tab order on `/forgot-password` verified previously;
  chart "View as table" toggle, announcement expanders
  (`aria-expanded`), filter chips, stepper and all dialogs are
  `button`-based and Tab-reachable; Escape closes Sheet/Dialog/menus
  (Base UI). Focus rings use the `ring-3` pattern everywhere.
- **axe:** `a11y.spec.ts` extended — real public routes + all demo
  routes incl. `?persona=` staff variants.

## 8. Gates

| Gate                  | Result                                               |
| --------------------- | ---------------------------------------------------- |
| `pnpm check`          | lint + typecheck + test + build — all clean          |
| `pnpm test` (Vitest)  | 33 files / 354 tests                                 |
| `pnpm authz:matrix`   | regenerated (`/privacy` added as public)             |
| `check-demo-leak`     | 24 real-route chunks marker-free                     |
| `pnpm test:e2e` (dev) | 75 passed / 9 env-skipped (incl. 35-route axe sweep) |
| `test:e2e:prod`       | 8 passed — demo routes all 404 under `next start`    |

## 9. Placeholder content (unchanged decisions)

- D1 branding: "GGCB" wordmark + `[Placeholder: crest/logo]`.
- D3 departments: six sample departments.
- D11 privacy/consent wording: `[Placeholder: …]` markers in register
  form + privacy page.
- Alumni-office contact: `[Placeholder: alumni office contact]` on the
  rejected-state dashboard.
- All fixture people/orgs carry the "Sample " prefix.

## 10. How to explore

```powershell
pnpm dev
# open http://localhost:3000/design/demo
# persona switcher (top-right) swaps alumni/staff/anon fixture slices
```

Five screens worth reviewing first: `/design/demo/alumni/dashboard`
(verified persona → under-approval persona), `/design/demo/alumni/e-card`,
`/design/demo/admin/alumni` (tabs + filters + selection bar),
`/design/demo/admin/import-export` (5-step wizard), and
`/design/demo/admin/analytics` (hand-built charts + view-as-table).

## 11. Dependency changes

None — zero additions, zero upgrades.

## 12. Deferred to prompts 7–14

Wiring fixtures → real containers per `wiring-guide.md` (registration,
directory/approvals, profile, E-card, content, import/export,
analytics), then hardening + deployment in prompt 14.

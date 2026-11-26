# UI direction — Phase 6 (aesthetic thesis)

Written after reading `context.md`, `ui-blueprint.md`, `design-system.md`,
`guidelines-review.md`, Phase 1–5 reports, `decisions.md`, `authz-matrix.md`,
and applying the **frontend-design** skill (plus a UI/UX Pro Max
`--design-system` query, whose blue-generic output we deliberately declined —
see "rejections").

## 1. Thesis — "The College Ledger"

A government college's alumni portal is, at heart, a **record office**: roll
numbers, sessions, passing years, card numbers, approvals entered into a
register. The thesis for the public/alumni experience is therefore **the
ledger as a design language** — ordered rows, ruled columns, a stamped card
— rendered warm and modern rather than bureaucratic.

Signature elements (all original SVG/CSS, no stock imagery):

1. **The ledger rule.** A double hairline — a thin rule with a heavier tick
   at its left edge — used as the section divider on public/alumni pages and
   as a faint background texture behind the landing hero. It encodes "rows
   of records" and is drawn by one `LedgerRule` component, not sprinkled ad
   hoc.
2. **Roll numbers as ornament.** `IBM Plex Mono` identifiers already carry
   the data role; on expressive surfaces (hero, E-card, dashboard status
   card) a roll-number / card-number sits visibly in the design — on the
   verified dashboard the alumnus' own roll number is the card's watermark.
3. **The E-card as a crafted artifact.** Not a generic bordered box: a
   die-cut silhouette (notch/clip-path), crest placeholder, mono card number
   on a baseline rule, photo placeholder with a dashed frame, and a QR
   placeholder that is visibly a placeholder (crossed grid). It is the
   product's memorable object; the landing page shows a small ghost of it.
4. **One orchestrated reveal.** On the landing page only: the hero line,
   the ledger rule, then the two CTAs enter in a single staggered
   CSS animation (~450 ms total, `prefers-reduced-motion` → static).
   Everything else on the site is static or interaction-driven.

## 2. Two registers, one system

| Register    | Surfaces                                                          | Vocabulary                                                                                          |
| ----------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Expressive  | `/`, `/privacy`, register flow, alumni dashboard, E-card, stories | Source Serif display, ledger rules, brass accent, generous whitespace, ghost artifacts, longer copy |
| Quiet/dense | Everything `/admin/*`                                             | Public Sans, compact tables/cards, hairline borders, no ornament beyond status chips and mono ids   |

Same tokens, same components, same focus and error behaviour — the register
difference is _decoration density_, not different styles. Admin reads as the
"back office" of the same record office; alumni pages are the "front desk".

## 3. Tokens — what changes and what does not

**No colour changes.** The Phase-1 palette (warm paper `#FAF9F5`, evergreen
`#1D4A34`, brass `#F4EBD7/#6B4E10`) already implements the thesis and every
measured pair passes AA (design-system.md §3, AAA on text pairs). Adding a
hue would weaken the single-accent identity. One addition only:

- `--pattern-ledger`: a CSS background-image token (encoded SVG, tint of
  `--border` at low alpha) for the hero/footer texture. Decorative, carries
  no information → no contrast obligation; the text over it is the already-
  verified `foreground on background` (15.12:1).

Type scale, radii, shadows, spacing: unchanged.

**Rejected alternatives** (per frontend-design "check the default"):
blue-trust palette + gradient hero (the query's default answer for
"government"); cream+terracotta editorial look; card-grid-of-icons for
"What you can do" (replaced by a ledger-style list — see §5); numbered
01/02/03 markers where content is not a sequence (kept only for the real
sequence "How it works").

## 4. Motion rules

- One orchestrated page-load reveal on `/` (staggered translate+fade, CSS
  keyframes, no JS). Disabled under `prefers-reduced-motion` (the global
  rule already zeroes all animation; verified).
- Interaction answers only: dialogs/sheets/tabs use the existing component
  transitions; toasts slide once. No scroll-linked effects anywhere.
- Skeletons instead of spinners for content areas; simulated demo delays
  use the same skeletons.

## 5. Component additions (planned before building)

Public/expressive:
`LedgerRule`, `PatternBlock` (section w/ ledger texture), `Faqs` (native
`<details>` accordion — no dependency), `LandingHero`, `SiteFooter`,
`EcardArtifact` (the crafted card, reused by the real `/ecard` later).

Alumni:
`StatusCard` (verify_status → copy + action), `CompletenessMeter`,
`DateBlock` (event tile day/month), `DeadlineBadge`, `PhotoPlaceholder`,
`PhotoUploader` (picker + preview + validation UI), `DiffTable`
(change-request old/new), `CharCount`, `StickyBar` (mobile actions),
`ParagraphText` (plain-text → <p> renderer — never HTML).

Admin/quiet:
`Charts` = `BarChart` (h+v), `LineChart`, `DonutChart`, `ChartCard`
(title, tooltip, "view as table", SR summary), `CalendarGrid`,
`ImportStepper` (5 steps), `DropZone`, `ColumnMapTable`,
`ValidationTable`, `ExportBuilder`, `FilterPopover`/`FilterSheet`
(desktop popover vs mobile sheet), `SelectionBar` (bulk actions),
`QrPlaceholder`, `KpiCard`, `DetailSheet` (Sheet reuse),
`RejectDialog` (ConfirmDialog + required reason + templated reasons).

Demo-only:
`DemoShell`, `DemoBanner`, `PersonaSwitcher` (context + UI),
`DemoNav` (basePath-parameterised shells).

## 6. Copy tone

Plain, institutional, a touch warm. Sentence case everywhere.

- Headings: "The alumni record, kept properly." / "Staff users" (not
  "Manage Users").
- Empty states: "No alumni match these filters. Adjust or clear them to
  see everyone." / "No stories yet. Yours could be the first — tell the
  college what you've been up to."
- Errors: "That file is larger than 10 MB. Compress it or split it, then
  try again." (what happened + what to do — never blame).
- Confirmations: "Registration received." / "Sample Staff A invited."
- Neutral flows: "If this record can be registered, you will receive an
  email with next steps." (identical for every outcome).
- Status copy: Under approval → "The college is checking your record —
  usually a few working days." / Rejected → reason verbatim + how to
  contact the college **[Placeholder: contact]**.

## 7. Non-goals

No dark mode (decided), no remote imagery/fonts/scripts (CSP), no
statistics/testimonials/rankings on real pages, no invented departments or
contact details — every `[Placeholder]` is visibly marked.

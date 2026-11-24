# GGCB Alumni Portal — Design System

Status: Phase 1 foundation. This document is the single source of truth for the
visual language. Every screen must consume these tokens; no one-off styling.

Process followed (per `context.md` §9): UI/UX Pro Max `--design-system` query,
Anthropic `frontend-design`, and Vercel `web-design-guidelines` were read before
any UI code was written.

## 1. Visual direction

**Calm, credible, collegiate.** The portal serves a government postgraduate
college: the interface should feel like a well-run registrar's office — ordered,
permanent, quietly confident — not like a SaaS marketing template.

What that means concretely:

- **Warm paper neutrals**, not sterile white or cool greys. The background is a
  warm off-white; cards are pure white so content surfaces "lift" one step.
- **Deep evergreen** as the single accent hue. It reads institutional and
  collegiate, and deliberately avoids both generic SaaS-blue and any claim on
  the college's real (unknown) brand colour.
- **A serif voice for headings** (Source Serif 4) paired with a workhorse
  government-grade sans (Public Sans). Two typefaces, clearly distinct — one for
  titles, one for everything else.
- **Restraint elsewhere.** Subtle borders instead of heavy shadows, generous
  whitespace, one accent action per view, minimal motion. The memorable element
  is the typographic pairing + evergreen identity, not decoration.

Anti-patterns explicitly avoided (from `frontend-design`): purple/blue gradient
washes, tracked-out all-caps eyebrows, numbered markers on non-sequences,
accent-a-single-word headlines, identical rounded cards everywhere, fade-slide
entrances on every section.

## 2. Brand placeholders (context.md §13-D1)

The college's official name form, logo, and brand colours are **not yet
supplied**. Everything brand-ish is a placeholder:

- Name: **Government Postgraduate College Burewala (GGCB)** — the D1 default.
- Logo: a single `Logo` component (`src/components/shared/logo.tsx`) rendering a
  neutral evergreen "GGCB" wordmark/monogram. Rebranding = edit this one file.
- Colours: the evergreen/natural palette below is a _placeholder identity_, not
  presented as the college's official brand. Rebranding = change token values in
  `globals.css` only. No component may hard-code a colour.

## 3. Colour tokens

All tokens are CSS custom properties in `src/app/globals.css`, mapped into
Tailwind via `@theme inline`. Components only ever use semantic token classes
(`bg-primary`, `text-muted-foreground`, `border-border`…), never raw values.

### Semantic roles

| Token                                    | Value                      | Role                                                  |
| ---------------------------------------- | -------------------------- | ----------------------------------------------------- |
| `--background`                           | `#FAF9F5`                  | Page background (warm paper)                          |
| `--foreground`                           | `#1B241F`                  | Primary text (green-tinged ink)                       |
| `--card` / `--card-foreground`           | `#FFFFFF` / `#1B241F`      | Raised surfaces                                       |
| `--popover` / `--popover-foreground`     | `#FFFFFF` / `#1B241F`      | Overlays                                              |
| `--primary` / `--primary-foreground`     | `#1D4A34` / `#F8F7F3`      | Primary actions, links, identity                      |
| `--secondary` / `--secondary-foreground` | `#EFEDE5` / `#1B241F`      | Quiet actions, secondary surfaces                     |
| `--muted` / `--muted-foreground`         | `#EFEDE5` / `#4F5B53`      | Subtle fills; secondary text                          |
| `--accent` / `--accent-foreground`       | `#F4EBD7` / `#6B4E10`      | Brass highlight (sparing: featured, pending emphasis) |
| `--destructive`                          | `#B42318`                  | Danger actions/errors                                 |
| `--destructive-foreground`               | `#FFFFFF`                  | Text on solid danger                                  |
| `--success` / `--success-foreground`     | `#EAF4EC` / `#1F6A3C`      | Positive status surface                               |
| `--warning` / `--warning-foreground`     | `#FBF1DF` / `#7A3B06`      | Warning status surface                                |
| `--info` / `--info-foreground`           | `#EAF3F8` / `#1F5F7A`      | Informational status surface                          |
| `--border`                               | `#DCD7CB`                  | Default hairline borders                              |
| `--input`                                | `#C9C3B4`                  | Form control borders (one step darker)                |
| `--ring`                                 | `#1D4A34`                  | Focus ring (equals primary)                           |
| `--sidebar-*`                            | paper/ink/evergreen family | Admin shell chrome                                    |

Status chips pair a tinted surface token with its foreground token
(`bg-success text-success-foreground`). Interactive states darken/lighten the
same token (`hover:bg-primary/90`) so states always stay in-family.

### Verified contrast (WCAG 2.1 AA — measured, sRGB)

| Pair                                        | Ratio   | Required | Result                                                                      |
| ------------------------------------------- | ------- | -------- | --------------------------------------------------------------------------- |
| foreground on background                    | 15.12:1 | 4.5      | ✅ AAA                                                                      |
| muted-foreground on background              | 6.75:1  | 4.5      | ✅ AA                                                                       |
| muted-foreground on card                    | 7.11:1  | 4.5      | ✅ AA                                                                       |
| primary-foreground on primary (buttons)     | 9.41:1  | 4.5      | ✅ AAA                                                                      |
| primary on background (links, icon buttons) | 9.58:1  | 4.5      | ✅ AAA                                                                      |
| secondary-foreground on secondary           | 13.59:1 | 4.5      | ✅ AAA                                                                      |
| accent-foreground on accent                 | 6.51:1  | 4.5      | ✅ AA                                                                       |
| white on destructive                        | 6.57:1  | 4.5      | ✅ AA                                                                       |
| destructive on background (error text)      | 6.24:1  | 4.5      | ✅ AA                                                                       |
| warning-foreground on warning               | 7.64:1  | 4.5      | ✅ AA                                                                       |
| success-foreground on success               | 5.86:1  | 4.5      | ✅ AA                                                                       |
| info-foreground on info                     | 6.27:1  | 4.5      | ✅ AA                                                                       |
| ring vs background (focus, non-text)        | 9.58:1  | 3.0      | ✅ AAA                                                                      |
| border vs background (hairline, decorative) | 1.36:1  | 3.0*     | intentional — non-semantic hairline only; interactive borders use `--input` |

\* WCAG 1.4.11 applies to UI components and meaningful graphics. Hairline card
borders carry no information; anything stateful (input border, focus ring,
icon) meets ≥3:1.

## 4. Typography

Two families, loaded with `next/font/google` (self-hosted, `font-display: swap`,
no external render-blocking request, no layout shift):

| Role                  | Font                          | Weights  | Fallback                                         |
| --------------------- | ----------------------------- | -------- | ------------------------------------------------ |
| Display / headings    | **Source Serif 4** (variable) | 400–700  | Georgia, "Times New Roman", serif                |
| Body / UI             | **Public Sans** (variable)    | 400–700  | system-ui, -apple-system, "Segoe UI", sans-serif |
| Identifiers / numbers | **IBM Plex Mono**             | 400, 500 | ui-monospace, "Cascadia Mono", monospace         |

Why these: Public Sans was designed for US government services — legible at
small sizes on cheap phones, deliberately undecorated. Source Serif 4 gives the
collegiate voice without being ornate. IBM Plex Mono is reserved for things
that are _read as data_ (roll numbers, card numbers, codes) — never for UI
chrome. `font-variant-numeric: tabular-nums` on numeric table cells.

**Scale** (modular ≈ 1.25, Tailwind utilities): `text-xs` 0.75, `text-sm` 0.875,
`text-base` 1.0 (16 px floor — never smaller for body), `text-lg` 1.125,
`text-xl` 1.25, `text-2xl` 1.5, `text-3xl` 1.875, `text-4xl` 2.25.
Headings use the serif + `text-balance`/`text-pretty`; body line-height 1.5–1.65;
prose measure ≤ 75 ch (`max-w-prose`).

## 5. Spacing, radius, shadow, z-index

- **Spacing**: Tailwind 4 px scale. Page gutters `px-4 sm:px-6 lg:px-8`; section
  rhythm `space-y-8`/`py-8`; card padding `p-4 sm:p-6`; generous whitespace is a
  feature, not a bug.
- **Radius**: `--radius: 0.5rem` (8 px) base → `rounded-sm` 4.8, `md` 6.4,
  `lg` 8, `xl` 11.2 px. Modest radii = institutional; no fully-rounded blobs
  except badges/avatar.
- **Shadow**: one restrained elevation language. Cards are flat with a hairline
  border (no shadow at rest); overlays (dialog/sheet/dropdown/toast) use a
  single soft shadow (`shadow-lg` default). No decorative gradient washes.
- **z-index scale** (documented, do not invent new layers): base 0 · sticky
  chrome 30 · sidebar/topbar 40 · overlay backdrop 50 · dialog/sheet/popover
  50–60 · tooltip 70 · toast 80.

## 6. Motion

- Durations: micro 100–150 ms (hover/press), standard 200 ms (disclosure,
  overlay enter), exit ≤ 150 ms. Easing: `ease-out` enter, `ease-in` exit;
  tw-animate-css presets on overlay primitives.
- Only `transform` + `opacity` are animated (compositor-friendly). Never
  `transition: all`.
- `prefers-reduced-motion: reduce` disables animation and smooth scrolling
  globally (base CSS); motion-sensitive components rely on the same media
  query through tw-animate-css.

## 7. Dark mode — **decided: NO for v1**

Rationale: the audience (government college staff and alumni, mostly phones,
often outdoors/low-end devices) benefits more from one excellent, fully
contrast-verified light theme than two half-audited ones. Dark mode would
double the accessibility verification surface (every token pair twice) for a
feature that is not in `context.md`'s priorities. The token architecture is
theme-ready — a future `.dark` set can be added in `globals.css` alone without
touching a single component. `next-themes` is present only because `sonner`
requires it for its `theme` prop.

## 8. Iconography & imagery

- **Lucide only** (`lucide-react`), default 16–20 px, `stroke-width` 2. No
  emoji-as-icon, no mixed icon sets, decorative icons get `aria-hidden`.
- Images via `next/image` with explicit `width`/`height`/`sizes`; below-fold
  lazy, never CLS. Logo placeholder is SVG text (not an image file) so
  rebranding is trivial.

## 9. Density rules

- Public/alumni surfaces: comfortable (`text-base`, 44 px touch targets, roomy
  cards).
- Admin tables: compact but not cramped — cell padding `px-3 py-2`, `text-sm`,
  `tabular-nums` on numeric columns, sticky header inside a scroll container.
- Tables never cause page-level horizontal scroll: they scroll inside their own
  `overflow-x-auto` container, and on < 640 px render as stacked cards
  (`DataTable` documented pattern in `src/components/ui/data-table.tsx`).

## 10. Accessibility contract (WCAG 2.1 AA)

Labelled inputs (never placeholder-only), visible `:focus-visible` ring on
every interactive element, full keyboard operability, ≥ 44 px touch targets on
coarse pointers, error text adjacent to the field, `aria-live` for toasts and
async validation, correct dialog/sheet semantics via Base UI primitives,
skip link on every shell.

## 11. Composite patterns (Phase 5)

These are app-level patterns built FROM the primitives above � they are the
only way lists, dialogs, and forms may be assembled (blueprint �2).

- **`ListToolbar`** (`components/shared/list-toolbar.tsx`) � search box +
  select filters + active-filter chips + clear-all. Writes all state into
  URL search params (`q`, filter keys, resets `page`) so lists are
  shareable and the back button works. Server does the filtering.
- **`Pager`** (`components/shared/pager.tsx`) � "Showing x�y of n" +
  previous/next links that carry the full param set. Server component.
- **`RowActions`** (`components/shared/row-actions.tsx`) � the labelled
  "More actions" dropdown for table rows. Disabled items stay visible with
  a reason (`disabledReason`) so safety rules are legible.
- **`ConfirmDialog`** (`components/shared/confirm-dialog.tsx`) �
  destructive/sensitive confirmations. The object is named and the verb is
  explicit ("Deactivate Sample Staff A", never "OK").
- **`FormDialog`** (`components/shared/form-dialog.tsx`) � quick
  create/edit dialogs (= 6 fields): pending state, generic error alert,
  server `fieldErrors` routed back to fields, closes + toasts on success.
- **`PasswordField`** (`components/shared/password-field.tsx`) �
  show/hide toggle (accessible name + `aria-pressed`), `autocomplete`,
  live policy hint (10+ characters, match state). Never clears on error.
- **`InlineAlert`** (`components/shared/inline-alert.tsx`) � persistent
  notices in four variants (`info`/`success`/`warning`/`destructive`);
  `role="alert"` for destructive, `role="status"` otherwise.
- **`UserStatusBadge`** (`components/shared/user-status-badge.tsx`) �
  staff-user status chips (Active/Invited/Inactive): icon + text + colour,
  never colour alone.
- **`EmptyState`** (`components/shared/empty-state.tsx`, existing) �
  title (what is missing) + one sentence (what to do) + optional action.
- **`list-params`** (`src/lib/list-params.ts`) � pure URL-param
  parse/build helpers shared by list pages and `Pager`.

Result types shared across the server/client boundary live in
`src/lib/result.ts` (`ActionResult`, `ServiceResult`, `ConsumeResult`,
`NeutralResult`, `UserStatus`) � plain data, importable anywhere.

Screen previews with fixtures live under `/design/screens/*` (dev-only,
404 in production): `account`, `users`, `departments`.

## 12. Phase 6 � the "college ledger" direction + feature components

The aesthetic direction lives in `docs/design/ui-direction.md`: a
government college's record office � ledgers, roll numbers, card numbers �
rendered warm. Expressive surfaces (public + alumni) use the ledger motif;
admin stays quiet and dense. **No token changes** � the Phase-1 palette was
already the right register; the only CSS additions are the `animate-reveal`
landing keyframes and `print-ecard` print rules in `globals.css`.

Signature + feature components (`components/shared/`):

- **`LedgerRule` / `LedgerPattern`** � the signature divider (tick + rule)
  and the faint ruled-paper texture for expressive sections. Decorative,
  `aria-hidden`.
- **`EcardArtifact`** � the alumni E-card rendered as a crafted object:
  die-cut notches, crest placeholder, dashed photo frame, mono card number
  on a baseline rule, and a deliberately-not-scannable QR placeholder
  (labelled "QR PLACEHOLDER"). States: `active` / `revoked` / `unissued`.
  `.print-ecard` isolates it for `window.print()`.
- **`ParagraphText`** � the ONLY renderer for user/staff-authored plain
  text (stories, announcements, bio): blank-line ? `<p>`. Never HTML,
  never markdown.
- **Charts** (`charts.tsx`): `ChartCard` (title + "View as table" toggle +
  sr-only summary), `BarChartH`, `BarChartV`, `LineChart`, `DonutChart` �
  hand-built SVG, focusable data points (`tabIndex`+`<title>`), values
  always drawn so colour is never the only signal. `axisTicks`/`thinLabels`
  are unit-tested pure functions.
- **`CalendarGrid`** � Monday-first month grid with keyboard nav of months
  and event chips; `monthGrid` math unit-tested.
- **`Stepper`** � numbered wizard header (Upload?Map?Validate?Review?Commit);
  `aria-current="step"`, done = check.
- **`DropZone`** � labelled drop area + file button; validates extension and
  size with inline copy (no silent reject).
- **`DateBlock`**, **`DeadlineBadge`**, **`KpiCard`**,
  **`CompletenessMeter`** (`role="progressbar"`), **`DiffTable`** (old vs
  new for change requests), **`PersonaSwitcher`** + **`DemoBanner`** +
  **`Demo*Shell`** (demo-only, under `components/demo/`).

Copy patterns: empty state = title + one sentence + action; errors say
what happened and what to do; destructive confirms name the object.

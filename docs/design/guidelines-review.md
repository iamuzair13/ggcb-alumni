# UI review against web-design-guidelines

Final pass over the phase-1 UI files with the `web-design-guidelines`
skill. Findings are grouped by file; status is **fixed** (changed this
phase) or **verified** (already conforming). Nothing left as "won't fix"
without a note.

## Interaction & composition

| File                                            | Finding                                                                                                                                                                                   | Status |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `src/components/ui/button.tsx`                  | `loading` kept the label `visibility:hidden` → killed the accessible name (axe `button-name`, critical). Now `opacity-0` (keeps name AND layout — no CLS).                                | fixed  |
| `src/components/ui/button.tsx`                  | `render={<Link/>}` needs `nativeButton={false}` or Base UI warns and semantics degrade.                                                                                                   | fixed  |
| `src/app/design/page.tsx`                       | Base UI `render` prop: children must live on the rendered element, not the Trigger — empty trigger buttons fixed.                                                                         | fixed  |
| `src/app/design/page.tsx` + `ui/form-field.tsx` | Base UI choice controls render `<span role="checkbox/radio/switch">` — `htmlFor` can't name them (names the visually-hidden input instead). Demo + future pattern uses `aria-labelledby`. | fixed  |
| `src/components/ui/form-field.tsx`              | Was `"use client"` + render-prop children → broke the RSC boundary. `useId` works in Server Components, so the directive was removed.                                                     | fixed  |
| `src/components/ui/tabs.tsx`                    | Inactive tabs used `text-foreground/60` (~4.1:1, axe `color-contrast`). Now `text-muted-foreground` (6.75:1).                                                                             | fixed  |
| `src/components/ui/tabs.tsx` + `ui/sonner.tsx`  | `transition-all` → explicit `transition-colors`; `next-themes` dropped entirely (light-only palette, Toaster pinned `light`).                                                             | fixed  |

## Typography & reading

| File                     | Finding                                                                                                                 | Status   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| `src/app/layout.tsx`     | `antialiased` on `html` only once; fallbacks declared on every `next/font` family; `h1` only in page headers.           | verified |
| `globals.css`, all pages | Long-form text uses `text-pretty`/`text-balance` (headings) and `max-w-prose` on paragraphs — no unbounded line length. | verified |
| `globals.css`            | `tnum` variant for table numbers; `font-mono` reserved for identifiers (roll numbers, card IDs).                        | verified |

## Layout & responsive

| File                                                      | Finding                                                                                                                                                                                                | Status   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| All pages                                                 | No global `overflow-x` hack; horizontal overflow prevented by a container-level `overflow-x-auto` on `DataTable`/table wrappers only. Proven by the 360px Playwright sweep (8 routes, no page scroll). | verified |
| `src/components/ui/data-table.tsx`                        | Tables degrade to stacked `dl` cards under `sm` and scroll inside their own box above it — exactly the documented pattern.                                                                             | verified |
| `src/app/(alumni)/layout.tsx`, `(admin)/admin/layout.tsx` | Mobile navigation via Base UI `Sheet`; `md:hidden`/`md:flex` splits; skip-link before everything.                                                                                                      | verified |
| `src/components/ui/spinner.tsx`                           | `role="status"` + `aria-label` + visible label on the demo; aria-hidden when embedded inside a labelled button.                                                                                        | verified |

## States & feedback

| File                                                     | Finding                                                                                                                | Status   |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| `src/components/ui/empty.tsx`, `shared/empty-state.tsx`  | Empty states carry icon + title + action-oriented description — all placeholder pages use them instead of blank space. | verified |
| `src/app/not-found.tsx`, `error.tsx`, `global-error.tsx` | Designed 404, boundary-aware error (console.log now, monitoring later), and a self-contained root-layout fallback.     | verified |
| All controls                                             | `disabled:` + `aria-disabled:` styles with `cursor-not-allowed` + `opacity-50`; loading shown via Button `loading`.    | verified |

## Accessibility

| File                                                                  | Finding                                                                                                                                              | Status   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `src/app/(auth)/*`                                                    | Inline links relied on hover-only underlines (axe `link-in-text-block`). Now permanently underlined with a soft `decoration-primary/40`.             | fixed    |
| `src/app/(auth)/layout.tsx`, `(alumni)/layout.tsx`, `site-header.tsx` | `aria-label` on a logo link that contains text violated Label-in-Name — removed; accessible name now comes from the visible wordmark.                | fixed    |
| `globals.css`                                                         | `@media (prefers-reduced-motion: reduce)` collapses animation/transition durations; focus ring is 3px `ring-ring/50` on every interactive primitive. | verified |
| `src/components/ui/sheet.tsx`                                         | `SheetDescription` added as `sr-only` in nav sheets (Base UI requires a description for a11y).                                                       | verified |
| Colour tokens                                                         | All measured pairs ≥ 4.5:1 (see design-system.md §5); `border`/`input` (1.36:1) is documented as decorative-only.                                    | verified |

## Icons & images

- lucide-react only; every decorative icon carries `aria-hidden="true"`;
  icon-only controls (`Menu`, `MoreHorizontal`) carry `aria-label`.
- `Avatar` uses initials fallback — no remote images this phase.

## What the guidelines could not fully check

- `serious`/`critical` axe results are now **zero** across `/design`, `/`,
  `/login`, `/register`, `/dashboard`, `/admin` (Playwright axe suite,
  retained as a regression gate).
- Manual keyboard walkthrough of dialog/sheet/menu is covered by unit
  tests (open, content exposed) rather than a visual pass — acceptable at
  placeholder fidelity; real flows get interactive checks in later phases.

## Prompt 3 additions

- `/login` is a real form now: `FormField` (label + `aria-describedby` +
  `role="alert"`), `autocomplete="username"`/`"current-password"` (password
  managers + axe), a labelled show/hide password toggle, submit with
  `loading` state, and a distinct inline state for `EMAIL_NOT_VERIFIED`
  (the resend action is Prompt 5). Generic credential errors — never
  enumeration.
- `403` surface at `/forbidden` (and the `forbidden()` interrupt) shares
  the carded layout of `not-found`/`error` — explicit "you don't have
  access", links back to role home + sign-out.
- Role-filtered nav: the admin sidebar is rendered server-side from
  `ADMIN_NAV` entries filtered by `roles` — a viewer never sees
  `Import/Export`, `Users`, `Audit Logs` links at all (not just disabled).
- Signed-out state: `SignOutButton` (client) posts to `signOut()`;
  admin shell shows the signed-in name next to it; alumni shell shows
  name/avatar + `verify_status` copy for pending/rejected alumni.

## Prompt 5 additions

- **GET never consumes.** Token pages (`/verify-email`, `/reset-password`,
  `/set-password`) render a confirm/action form only � the token is spent
  by the POST server action, so mail-scanner prefetch can never burn it
  (e2e asserts zero POSTs on load + `no-store`/`no-referrer` headers;
  `TokenStrip` removes `?token=` from the visible URL after mount).
- **New composites** (`components/shared/`): `InlineAlert` (four variants,
  `role="alert"` only for destructive), `PasswordField` (labelled
  show/hide toggle + live policy hint, never clears on error),
  `ConfirmDialog` (names the object + explicit verb � "Deactivate Sample
  Staff A", never "OK"), `FormDialog` (pending + server `fieldErrors`
  routed back to fields), `RowActions` (labelled "Actions for X" menu;
  disabled items stay visible WITH the reason), `UserStatusBadge`
  (icon + text + colour � never colour alone), `ListToolbar` (URL-bound
  search/filters/chips), `Pager` ("Showing x�y of n").
- **Base UI Select gotcha found via screenshots:** `Select.Value` resolves
  the item label only while the popup is mounted, so a closed trigger
  displayed the raw `__any__` sentinel. Triggers now render an explicitly
  computed label span � worth remembering for every future Select with
  sentinel values.
- **Viewer is genuinely read-only:** `/admin/users` and
  `/admin/departments` render no write controls at all for viewers (the
  server page decides � not just disabled buttons), and the actions
  return `forbidden` server-side anyway.
- **Mobile tables:** the staff/department lists reuse `DataTable`'s
  stacked `dl` card rendering under `sm` (verified at 360px in
  `design-review/phase-05/`), keeping the row-action trigger reachable.
- **Keyboard:** Escape closes `RowActions` menu (component test); dialog
  focus management is Base UI AlertDialog/Dialog; destructive actions
  always route through `ConfirmDialog` so the confirm button is
  explicitly labelled with the object name.
- **Previews:** `/design/screens/{account,users,departments}` render
  every state (idle/loading/success/error/empty/read-only) with fixtures
  in dev; `notFound()` in production. axe covers them in dev.
- **`useSearchParams` discipline:** `ListToolbar` and the login form run
  inside Suspense boundaries; token pages read `searchParams` inside a
  nested `<Suspense>` (Cache Components requirement � build verified).

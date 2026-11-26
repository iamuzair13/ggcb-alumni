# Phase 05 report — account flows + staff/department administration

Branch `phase-05-accounts` from `phase-04-email` @ `3756f9c`.

**No remote is configured** — nothing was pushed; all work is local commits.

## 1. Summary

- **Account self-service**: `requestPasswordReset` (forgot→reset),
  `resendVerification`, `verifyEmail`, `setPassword` (invite). Every
  request flow returns the same neutral response for existing and
  non-existing accounts — no enumeration.
- **GET never consumes.** Token pages render a confirm form; the token is
  spent only by the POST server action, inside a transaction
  (`consumeToken` + password/verification write commit or roll back
  together). Mail-scanner prefetch is harmless.
- **Staff administration** at `/admin/users`: invite, edit, deactivate,
  reactivate, resend invitation, send password reset — with the safety
  rules in `staff-rules.ts` (role hierarchy, last-superadmin lock,
  self-protection) enforced server-side and shown as disabled rows with
  reasons in the UI.
- **Departments** at `/admin/departments`: CRUD with normalized unique
  name/code (`citext`-style trim+case-fold), delete guard when alumni
  are assigned, alumni counts, audit records; viewers get a read-only
  surface (no controls rendered, server still refuses writes).
- **Reusable composites** in `components/shared/`: `InlineAlert`,
  `PasswordField`, `ConfirmDialog`, `FormDialog`, `RowActions`,
  `UserStatusBadge`, `ListToolbar`, `Pager`, plus `lib/list-params.ts`
  and shared result types in `lib/result.ts` (client-safe imports —
  client modules never import `src/server`).
- **Dev-only previews** `/design/screens/{account,users,departments}`
  cover idle/loading/success/error/empty/read-only states; `notFound()`
  in production.

## 2. Housekeeping answers

- `docs/design/ui-blueprint.md` — created from the supplied blueprint
  (13,763 bytes) and read alongside `design-system.md` before any UI work.
- `instant = false` — **kept, and only on `(admin)` and `(alumni)` layouts**:
  those groups are session-guarded, so there is no shell that could be
  prerendered "instantly"; marking them blocking preserves real
  redirect/403 statuses. `next.config.ts` sets `cacheComponents` +
  `partialPrefetching` only — no global `instant` flag.
- The token pages' `searchParams` read sits inside a `<Suspense>`
  boundary per page (Cache Components requirement; `next build`
  verified).

## 3. Migration 0010

`migrations/0010_auth_attempt_kinds.sql` — widens the `auth_attempts.kind`
check from `('login')` to `('login','password_reset','email_verify',
'set_password','staff_invite','staff_reset')` — the new account/request
kinds recorded by `request-limits.ts`. Applied to the remote Supabase
database via `pnpm db:migrate` (10 migrations total); `pnpm db:verify`
green; `docs/ops/schema-bootstrap.sql` regenerated.

## 4. Route policy

- New public routes added to `ROUTE_POLICY` as `public` ops:
  `/verify-email`, `/reset-password`, `/set-password` (account token
  group). `/forgot-password` stays public in `(auth)`.
- `src/proxy.ts` unchanged — it is still only an optimistic redirect +
  cache-header layer; authorization lives in server guards
  (`requireStaff`/`requireRole`) and action-level `policyFor` checks.
- `docs/security/authz-matrix.md` regenerated (`pnpm authz:matrix`);
  `authz-matrix` unit tests green.

## 5. Account flows (`server/services/account.ts`)

- `requestFlow` pattern: normalize → per-kind hashed rate-limit
  (`request-limits.ts`, email+IP keys, `auth_attempts`) → neutral
  `ActionResult` → schedule work via `after()` so response timing does
  not depend on whether the account exists.
- `verifyEmail`/`resetPassword`/`setPassword` consume hashed tokens
  inside `withTransaction`; a policy failure inside the transaction
  **throws** so the consumed token rolls back instead of committing a
  burned token with a failed outcome (correctness fix during review).
- Token TTLs per kind; single-use; hashed at rest (Phase-3 token
  utilities reused).

## 6. Staff + departments

- `staff-rules.ts` (pure, 11 unit tests): which actor roles may
  invite/edit which roles; last-active-superadmin protection;
  self-deactivation rules.
- `staff.ts` service: invite issues a `set_password` token + email via
  `after()`; deactivate invalidates sessions (revalidation via
  `recheckUser`); all writes audited (`audit/index.ts` extended with the
  staff/department action union).
- `departments.ts` service: normalized unique name/code, alumni-count
  join, delete blocked `has_alumni`, `is_active` soft-delete alternative
  offered in UI.
- Actions in `lib/actions/{staff,departments}.ts` — `defineAction`
  wrappers (Zod validation → service → `ActionResult`), policy-checked.

## 7. Screens

- Public: `/forgot-password` (real form, neutral confirmation),
  `/login` (unverified-account notice + inline `ResendVerification`,
  `password-changed` banner), `/verify-email`, `/reset-password`,
  `/set-password` under a new `(account)` group — auth shell styling
  without `GuestRedirect` (token flows must remain reachable when
  signed in).
- Admin: `/admin/users`, `/admin/departments` — server container pages
  (`requireRole` + data fetch) feeding client views; viewers get the
  read-only variant; `EMAIL_MODE=off` surfaces an outbox-filling warning
  banner.
- `TokenStrip` removes `?token=` from the visible URL after mount.

## 8. UI verification

- Screenshots at 360/768/1280 into `design-review/phase-05/` (21 shots,
  `scripts/screenshots.ts`); reviewed — mobile stacked cards, read-only
  variant, empty states, banners all render per blueprint.
- Found-and-fixed via screenshots: Base UI `Select.Value` shows the raw
  value for closed selects (items unmount with the popup) → triggers now
  render a computed label; `DropdownMenuLabel` needs `Menu.Group` in
  Base UI 1.9 → wrapped.
- Keyboard: `/forgot-password` tab order verified (logo → email →
  submit → back link); Escape-dismiss on `RowActions` menu is a
  component test; dialog focus trap is Base UI.
- axe: 12-page scan incl. new token pages + all three previews — no
  serious/critical violations.
- `docs/design/guidelines-review.md` and `/design` page + `design-system.md`
  updated with the new composites.

## 9. Gates

| Gate                        | Result                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm lint`                 | clean                                                                               |
| `pnpm typecheck`            | clean                                                                               |
| `pnpm test` (Vitest)        | 27 files / 274 tests                                                                |
| `pnpm build`                | clean (token pages partial-prerendered via Suspense)                                |
| `pnpm test:e2e` (dev)       | 52 passed / 9 skipped (persona tests need test DB)                                  |
| `pnpm db:verify`            | green (applied 0010)                                                                |
| e2e `account-pages.spec.ts` | 5 tests — zero POSTs on GET, no-store headers, token stripped, neutral confirmation |

## 10. Notable debugging record

- **Dev-only reload loop:** mid-session, `/login` and `/forgot-password`
  intermittently re-navigated every ~1s in `next dev` while
  production (`pnpm start`) stayed at 2 navigations. It stopped after a
  dev restart — Turbopack dev-cache churn, not a code bug; noted in case
  it recurs (delete `.next` if it does).
- **jsdom + `useTransition` flake:** the choose-password test raced the
  pending label ("Saving…"); assertions now use `findByRole` and
  `fireEvent.submit` so they wait for the settled UI.

## 11. Deferred to later prompts (unchanged)

Alumni registration/approvals, E-cards, content modules
(events/jobs/announcements/stories), analytics, Excel import/export,
moderation, audit-log browsing — per the roadmap.

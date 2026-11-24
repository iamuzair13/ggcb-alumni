# GGCB Alumni Portal — UI Blueprint

Every UI-facing Devin prompt (5 → 13) must read this file, the design system
(`docs/design/design-system.md`) and the three installed UI skills (UI/UX Pro
Max, frontend-design, web-design-guidelines) before writing UI. If a screen
here conflicts with `context.md`, context.md wins and the conflict is
reported.

Status legend: **[Confirmed]** from the owner/context,
**[Recommended]** architect default, **[Placeholder]** content the college
must supply later (never invent institutional facts).

## 1. Principles

- **Clarity first.** One primary action per screen. Plain language, sentence
  case, no jargon. Tone: calm, respectful, institutional.
- **Mobile-first.** Most alumni use phones. Design 360 px first, then 768 px,
  then 1280 px. Nothing scrolls horizontally at page level.
- **Every screen has every state:** loading (skeleton shaped like the
  content), empty (explains and offers the next action), error (says what
  happened and how to recover, with retry), success (toast), disabled/pending
  (no double submit, no layout shift).
- **Trust signals.** A government college portal must feel official and safe:
  consistent branding slot, visible status of the user's record, clear privacy
  language, no dark patterns, no decorative noise.
- **Consistency over novelty.** Only components from the design system; new
  components are added to the system and `/design` first.
- **Accessible by default:** WCAG 2.1 AA, keyboard operable, visible focus,
  labelled controls, status never conveyed by colour alone, reduced-motion.
- **Fast:** server components and server actions by default, skeletons not
  spinners, next/image with sizes, TanStack Query only where client-driven
  interaction needs it (for example instant filtering in the directory).

## 2. Global conventions

### Layout

| Area   | Container                                              | Notes                                                                                    |
| ------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Public | max 1120 px, generous vertical rhythm                  | Header: name/logo slot + Login/Register; footer: contact placeholders, Privacy           |
| Auth   | single card, max 440 px, centred                       | No navigation chrome beyond a back-to-home link                                          |
| Alumni | content max 960 px                                     | Top bar + bottom/side nav on mobile as a sheet; user menu (Account, Sign out)            |
| Admin  | sidebar 256 px (sheet on mobile) + content max 1280 px | Breadcrumb, page title, description, primary action at top right (below title on mobile) |

### Admin list page anatomy (used by every list)

`PageHeader` (title, one-line description, primary CTA) → `Toolbar` (search,
filter controls, active-filter chips, clear all) → table (cards below
640 px) → `Pagination` ("Showing 21–40 of 132", page size ≤ 100). List state
lives in URL search params (`q`, `page`, `sort`, filters) so links are
shareable and the back button works. Table headers are sortable where the
server supports it; row actions live in a labelled "More actions" menu.

### Forms

- Single column, max 560 px; labels above, hints below, required marker,
  errors inline next to the field plus a summary at the top of long forms.
- Server is authoritative; client validation is a convenience and mirrors it.
- Long forms (profile) use sections with headings and a sticky action bar on
  mobile; warn before leaving with unsaved changes.
- Passwords: show/hide toggle, `autocomplete` attributes, paste allowed,
  live policy hint (10+ characters, avoid common passwords), never clear on
  error unless security-relevant.

### Surfaces

- **Dialog** for quick create/edit (≤ 6 fields) and confirmations.
- **Sheet** (drawer) for record detail/preview from a list.
- **Full page** for complex editing (profile, content with long text).
- Confirm dialogs name the object and use the explicit verb ("Deactivate
  Sample Staff A", not "OK").
- Toasts for success and non-blocking info; inline alerts for errors that
  need action. No `browser alert()`.

### Status vocabulary (chip = icon + text + colour)

| Domain         | Values                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------- |
| Alumni record  | Under approval (amber), Verified (green), Rejected (red)                                  |
| Staff user     | Active, Inactive, Invited (no password yet)                                               |
| Change request | Pending, Approved, Rejected                                                               |
| Content        | Draft, Published, Expired (opportunities), Pending review / Approved / Rejected (stories) |
| E-card         | Active, Revoked                                                                           |

### Content and formatting

- Dates `12 Mar 2026`; times 12-hour with AM/PM; display timezone
  Asia/Karachi from one config constant; store UTC. Numbers use tabular
  figures. Names are never truncated without a tooltip/accessible full value.
- Empty-state copy pattern: title (what is missing), one sentence
  (why/what to do), primary action when the user can act.
- Microcopy: errors say what happened and what to do next; never blame the
  user; never expose internals.

### Responsiveness

Breakpoints 360 / 768 / 1280. Tables become stacked cards under 640 px.
Sidebars become a sheet. Touch targets ≥ 44 px. Test every new screen at the
three widths.

### Previews and fixtures (standing rule for every UI slice)

Each screen is split into a **container** (guard + data loading + actions)
and a **presentational view** that takes plain props. A dev-only preview
route (`/design/screens/<name>`, 404 in production, noindex) renders each
view with clearly fake fixtures (for example "Sample Alumni A",
`@example.invalid`) in all its states (loading, empty, error, populated,
mobile). This lets the owner review UI without logging in or a database,
and lets Devin run axe and capture screenshots. Fixtures never appear in
production code paths.

## 3. Screen inventory

### 3.1 Public and account screens

| Route                               | Screen                       | Key elements                                                                                                                                                                                                                             | States                                                                    | Slice                  |
| ----------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------- |
| `/`                                 | Landing                      | Hero (portal name, one-line value, Register + Login CTAs), "What you can do" (profile, E-card, events, opportunities), "How it works" (Register → College verifies → Access), short FAQ, footer with contact [Placeholder], Privacy link | static, mobile                                                            | P6                     |
| `/privacy`                          | Privacy notice               | Plain-language data use, retention, contact [Placeholder: wording from the college, D11]                                                                                                                                                 | —                                                                         | P6                     |
| `/login`                            | Sign in                      | Email, password, show/hide, forgot link, register link, generic error, unverified-email notice with Resend                                                                                                                               | idle, pending, error, rate-limited, unverified                            | built (P3) → polish P5 |
| `/register`                         | Registration                 | Name, roll number, department (select), session/passing year, email, phone, password + confirm, consent checkbox ([Placeholder] wording), neutral duplicate message                                                                      | idle, pending, validation errors, "already registered" neutral, throttled | P6                     |
| `/register/check-email`             | Check your email             | Explains next step, resend (throttled), change email link                                                                                                                                                                                | idle, resent, throttled                                                   | P6                     |
| `/verify-email`                     | Verify email                 | Confirm button (a GET must never consume the token), success → continue, invalid/expired → request a new link                                                                                                                            | valid, success, invalid                                                   | P5                     |
| `/forgot-password`                  | Forgot password              | Email field, always the same neutral confirmation                                                                                                                                                                                        | idle, pending, sent, throttled                                            | P5                     |
| `/reset-password` / `/set-password` | Choose a password            | New + confirm, policy hint, success → sign in; invalid/expired → request again                                                                                                                                                           | valid, success, invalid, policy error                                     | P5                     |
| `/verify/[token]`                   | E-card verification (public) | Name, department, passing year, "Verified GGCB alumnus", card status; nothing else                                                                                                                                                       | valid, revoked, invalid (generic)                                         | P9                     |
| 403 / 404 / error                   | System pages                 | On-brand, link home                                                                                                                                                                                                                      | —                                                                         | built (P1/P3)          |

### 3.2 Alumni area

| Route                      | Screen             | Key elements                                                                                                                                                                                | Slice                  |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `/dashboard`               | Home               | Record status card (Under approval / Verified / Rejected with reason and next step), profile completeness meter, E-card tile, upcoming events, latest announcements, opportunities          | P6 (status), P8 (full) |
| `/profile`                 | My profile         | Sections: personal, academic (read-only, "Request a change"), location, work, social links, preferences (mentor opt-in); photo uploader with crop/preview and limits; unsaved-changes guard | P8                     |
| `/profile/requests`        | My change requests | List with status chips, details, withdraw if pending                                                                                                                                        | P8                     |
| `/ecard`                   | E-card             | Card preview (name, department, session, card no., photo, QR), Download PNG/PDF, status                                                                                                     | P9                     |
| `/events`, `/events/[id]`  | Events             | Upcoming/past tabs, cards with date block, detail                                                                                                                                           | P10                    |
| `/announcements`           | Announcements      | Pinned first, expandable, attachment                                                                                                                                                        | P10                    |
| `/opportunities`           | Opportunities      | Filter by type (job/internship/scholarship/other), deadline badge, apply link                                                                                                               | P10                    |
| `/stories`, `/stories/new` | Stories            | Featured stories gallery; my submissions with status; submit form (title, body, optional image)                                                                                             | P10                    |
| `/account`                 | Account            | Change password, email shown read-only, sign out everywhere                                                                                                                                 | P8                     |

Rules: under-approval and rejected alumni see only `/dashboard` (status
view) and `/account`; every other alumni route returns the standard 403
until verified (matches the route policy).

### 3.3 Admin area

| Route                  | Screen                   | Key elements                                                                                                                                                                                                                                                                                                                     | Slice |
| ---------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `/admin`               | Dashboard                | KPI cards (total, verified, pending, rejected, E-cards issued), pending-approvals queue, recent registrations, mini trend                                                                                                                                                                                                        | P12   |
| `/admin/alumni`        | Alumni                   | Tabs: Verified / Under approval / Rejected / Change requests (badge counts); toolbar with search + 8–10 filters (department, passing year, session, city, district/country, employer/sector, gender, featured); server-driven table; selection with bulk approve/reject/feature; detail sheet; approve/reject dialog with reason | P7    |
| `/admin/alumni/[id]`   | Alumni detail/edit       | Read view with edit mode, audit-friendly history, change-request review panel                                                                                                                                                                                                                                                    | P7    |
| `/admin/departments`   | Departments              | Table + create/edit dialog (name, code), activate/deactivate, delete only when unused (else guided to deactivate), alumni count per department; viewer read-only                                                                                                                                                                 | P5    |
| `/admin/content`       | Content                  | Tabs: Events / Announcements / Opportunities / Stories review; each tab a list + create/edit (dialog or page by size), publish toggle, featured alumni manager                                                                                                                                                                   | P10   |
| `/admin/import-export` | Import / Export          | Stepper: Upload → Map columns → Validate → Review errors → Commit; batch history; export builder using current filters                                                                                                                                                                                                           | P11   |
| `/admin/analytics`     | Analytics                | Charts: by department, by passing year, by city/district, registrations over time, top employers/sectors; one aggregate query set, cached                                                                                                                                                                                        | P12   |
| `/admin/users`         | Staff users (superadmin) | Table (name, email, role, status, last login); Invite staff dialog; row actions: edit, deactivate/reactivate, resend invitation, send password reset; banner when email delivery is not configured                                                                                                                               | P5    |
| `/admin/audit-logs`    | Audit logs               | Read-only filterable table (actor, action, entity, date range), detail drawer showing sanitized metadata                                                                                                                                                                                                                         | P12   |

Navigation visibility follows the role matrix (viewer: 5 sections; admin:
7; superadmin: 8). Hiding is cosmetic; guards are the control.

## 4. Delivery slices (replaces the earlier prompt order)

Each prompt below is a vertical slice: real backend + finished UI +
previews. Tests are still written, but see the testing note in each prompt.

| #   | Slice                                                                                                   | Why this order                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1–5 | Foundation, DB, Auth, Email, Account flows + Staff + Departments                                        | Done                                                                                                    |
| 6   | **Complete UI** — every remaining screen as a clickable prototype (`/design/demo/**`)                   | Done — real `/` + `/privacy` shipped; views/schemas/ports ready to wire (`docs/design/wiring-guide.md`) |
| 7   | Wire: landing CTAs, **registration**, verify handoff, under-approval dashboard, `/register/check-email` | First public-facing experience                                                                          |
| 8   | Wire: **admin alumni** (directory, filters, approvals, change requests) + demo-data tool                | Gives registrations somewhere to go                                                                     |
| 9   | Wire: **alumni profile hub**, account, dashboard, photo upload                                          | Verified alumni can manage their record                                                                 |
| 10  | Wire: **E-card** (issue, QR, download, public verify)                                                   | Depends on verified alumni                                                                              |
| 11  | Wire: **content** (events, announcements, opportunities, stories, featured)                             | Engagement features                                                                                     |
| 12  | Wire: **import / export**                                                                               | Needs stable alumni schema                                                                              |
| 13  | Wire: **analytics, admin dashboard, audit logs**                                                        | Needs real data shapes                                                                                  |
| 14  | Security hardening, run all deferred suites, history cleanup, deployment                                | Includes running all deferred suites, history rewrite, CSP tightening, production verification          |

**Hard gate [Recommended]:** nothing is deployed publicly and no real
alumni data is collected before Prompt 14 has executed the skipped database
and e2e suites. Local and dev-project use with fake data is fine until
then.

## 5. UI definition of done (per slice)

- Every new screen has a container, a presentational view, and a dev-only
  preview with fixtures covering all states.
- Reviewed at 360 / 768 / 1280 px; no page-level horizontal scroll.
- Axe scan of every previewable screen passes (no serious/critical).
- Keyboard-only walkthrough documented in the report (tab order, focus
  management in dialogs/sheets, escape to close).
- New components added to `/design` and `docs/design/design-system.md`.
- `docs/design/guidelines-review.md` updated against
  web-design-guidelines.
- Copy follows §2; no invented institutional facts (use `[Placeholder]`).
- Screenshots of previews at the three widths saved to a git-ignored
  `design-review/<slice>/` folder and listed in the report.

GGCB Alumni Portal — Build Context

Context for building a new alumni portal for Government Postgraduate College Burewala (GGCB). This is a fresh application. It is derived from the University of Lahore (UOL) alumni portal design, but is deliberately smaller. Keep the modules in §4, never build anything in §5, apply the engineering standards in §7, and treat every item in §13 (Open Decisions) as not decided — do not invent an answer; stop and ask, or use the stated default and record it.

Status legend used in this document

[Confirmed] — decided by the project owner.
[Recommended] — architect's recommendation; treat as the default unless overridden.
[Assumed] — working assumption, not yet verified; flagged so it can be corrected.
[Open] — undecided; see §13.
1. Purpose & Audiences

A portal where GGCB alumni register, maintain a profile, receive an E-card, and engage with community content (events, jobs/opportunities, announcements, success stories), while staff manage the alumni database, moderate content, view analytics, and import the college's existing Excel alumni records.

Alumni — register (after an existence check), verify email, log in, manage profile, request changes to restricted fields, get/download E-card, submit success stories, view events / opportunities / announcements, optionally appear in the alumni directory.
Staff — admin dashboard: searchable/filterable alumni list, approval of registrations, change-request review, Excel import/export, content moderation, analytics, department management, user management, audit logs.
Public visitors — only the E-card verification page (§4.5). A public website/API is out of scope for now [Confirmed].
Scope
BS programs only [Confirmed]. The data model must not hard-code assumptions that make adding other degree levels (e.g. Intermediate, ADP, MSc) impossible later, but no multi-degree UI or logic is built now.
Source of existing data: the college's Excel sheets, roughly two years of records [Confirmed]. Column headers will be adjusted later, so the importer must use a configurable column mapping (§4.9).
Roles [Confirmed]
Role	Access
superadmin	Everything, including user management (/setup) and system settings
admin	All operational modules (alumni, approvals, content, import/export, departments, analytics)
viewer	Read-only across admin modules; no writes, no export of personal contact data unless §13-D9 says otherwise
alumni	Own profile, E-card, story/content submission, alumni-facing pages

Single RBAC layer: a role enum on the user record. No per-user resource scopes, no legacy/second permission system. (Department-scoped staff can be added later by a migration if needed.)

2. Decisions Locked by the Project Owner
Decision	Choice
Institution	Government Postgraduate College Burewala; abbreviation GGCB (also the domain)
Degree level	BS only for now
Organisation structure	Departments only, with a departments CRUD. No faculties, no programs table
Alumni identifier	Roll number
Registration	Same model as the UOL implementation: check existence first, register only if no matching record exists. No claim-your-record flow
RBAC	superadmin, admin, viewer, alumni
Alumni card	No physical card printing. An E-card is provided instead
Public website / external API	Not yet
Auth	NextAuth with Supabase as the database only (Supabase Auth is NOT used)
Database	Supabase-hosted PostgreSQL
Priorities	1) feature reliability, 2) security, 3) UI quality (top priority alongside the first two), then performance/space efficiency
3. Stack
Layer	Choice	Notes
Framework	Next.js (App Router) + React + TypeScript	Latest stable at project start
Styling / UI	Tailwind + a component layer (shadcn/ui or equivalent)	See §9 for the UI process
Client data	TanStack Query	Sensible staleTime, no polling below 60 s, no waterfalls
Auth	NextAuth v5 (Auth.js), Credentials provider, JWT sessions (~1 h)	Passwords hashed with argon2id (or bcrypt ≥ 12 rounds). Google OAuth for staff is not built [Recommended]
Database access	postgres (postgres.js) server-side only against the Supabase pooler connection string	With a transaction-mode pooler, disable prepared statements (prepare: false). Keep a separate direct URL for migrations only
Validation	Zod, shared between client and server	Every route validates input server-side
Email	nodemailer (SMTP)	Timeouts set; sent via an outbox, never blocking a request (§4.11)
File storage	Supabase Storage (private buckets), accessed server-side only [Recommended — see §13-D6]	Vercel has no persistent disk, so the UOL "disk uploads" design cannot be copied
Hosting	Vercel + Supabase [Assumed]	Confirm in §13-D10
Testing	Vitest (unit/integration) + Playwright (e2e, authz)	
Supabase-specific rules [Recommended]
The app connects to Postgres directly with a server-side role. The browser never talks to Supabase directly and never receives a Supabase key. Therefore do not install @supabase/supabase-js in client code. (supabase-js may be used server-side only for Storage, with the service role key held in a server-only env var.)
Enable Row Level Security on every table in public, with no permissive policies. The app's server role bypasses RLS; this only exists so that the auto-exposed Supabase Data API (anon/authenticated keys) can never read anything even if a key leaks. This is a safety net, not the authorization layer — authorization is the NextAuth role check in the server code (§7).
Never log or return connection strings, service role keys, or AUTH_SECRET.
Use pooled connections with a small max (max: 1–5 per serverless instance) to avoid exhausting Supabase connection limits.
Migrations are numbered SQL files applied with a ledger (§7-10). Never edit the production schema by hand.
4. Modules to Build
4.1 Auth + RBAC
Credentials login (email + password) for staff and alumni, hashed with argon2id or bcrypt ≥ 12.
Email verification required for alumni (token emailed, stored hashed, expiring).
Forgot/reset password via emailed token link (stored hashed, single use, expiring ~1 h). Never email a raw password.
Roles per §1. Role is on the users table (one table for staff and alumni login identities; see §6 for the alumni relation).
Login rate limiting persisted in the database (auth_attempts: by email + IP, rolling window, lockout with expiry). Not an in-memory Map.
Every server route and server action calls one shared guard (requireRole(...)) — authorization is never implemented ad hoc in pages.
JWT sessions ~1 h; role refresh from DB at most once per refresh using a single query. Inactive users (is_active = false) cannot log in or refresh.
4.2 Registration (check-existence model) [Confirmed model]

Same behaviour as the UOL portal. A new alumnus registers only if no existing record matches.

Flow:

Public form: full name, roll number, department, session / passing year, email, phone, password (+ confirm).
Existence check before any insert (inside a transaction, backed by unique indexes so that races cannot create duplicates):
roll number (normalized: trimmed, case-folded) already exists → reject;
email already exists → reject.
Neutral error messaging to avoid account enumeration (e.g. "If this record can be registered you will receive an email") where the product allows it; the exact policy is §13-D2.
If no match: create the user + alumni record with verify_status = under_approval and send the verification email.
Admin reviews the registration → verified or rejected (with reason). Only verified alumni can use alumni-only features (E-card, stories, directory). under_approval alumni can log in and see a status page, edit their own pending data, and nothing else.

There is no "claim an imported record" flow. How imported Excel records interact with registration (a duplicate-roll-number rejection that tells the alumnus to contact the college) is an Open Decision (§13-D2). Do not build a claim/merge flow unless the owner reverses this decision.

4.3 Profile Hub
Alumni can view and edit allowed fields immediately: phone, city, district, country, employer, job title, sector, bio, social links, profile photo, optional "available to mentor" flag.
Restricted fields (full name, roll number, department, session, passing year, gender) are not directly editable after verification. An edit creates a pending change request; admin approves/rejects; approval applies the change in one transaction and writes an audit row.
Profile photo upload: validate type, size, and dimensions server-side; re-encode/resize (e.g. max 512 px) and store in private storage; serve via an authenticated or signed URL route.
"Required profile completeness" indicator on the alumni dashboard (UI).
4.4 Alumni Directory + Filters (admin)
Tabbed list: verified / under approval / rejected. (Featured/distinguished is a flag filter, not a separate surface.)
Filters (≈ 8–10 only, since the dataset is small) [Recommended]: department, passing year, session, city, district/country, employer / sector, gender, verify status, featured flag, plus text search (name, roll number, email).
Server-side pagination (limit ≤ 100 by default, hard cap 500), sortable columns. No unbounded lists.
One GET /api/alumni/filter-options endpoint returning option lists in a single round-trip, parallelised server-side, cached briefly (TTL).
A counts endpoint for tab badges using COUNT(*) FILTER (...).
Bulk actions on selection: approve, reject (with reason), feature/unfeature. Each bulk action runs in a transaction and writes audit rows.

Alumni-facing directory (optional phase) [Recommended, requires §13-D7]: verified alumni can browse a limited peer directory. Rules: opt-in visibility, per-field privacy (email and phone hidden by default), search by name / department / passing year / city, pagination, no export. Build only after the admin directory is stable.

4.5 E-Card (replaces the physical alumni card) [Confirmed: E-card; details Recommended]

No application, printing, delivery, or hold workflow.

When an alumnus becomes verified, an E-card is issued automatically (one per alumnus): card_no, issue date, status (active/revoked), unguessable verify_token.
Alumni dashboard shows the E-card (name, department, session / passing year, roll number, photo if present, card no., QR code) and offers a download as PNG and/or PDF [Open: §13-D8].
Public verification route GET /verify/[token] shows only: name, department, passing year, card status, "Verified GGCB alumnus". It never shows email, phone, address, or roll number. Rate-limited; invalid tokens return a generic 404.
Admin can revoke / re-issue a card (audit logged). The E-card also serves as the lightweight stand-in for "membership".
4.6 Success Stories + Featured Alumni
Alumni submit success stories (title, content, optional image) → staff review (approve / reject with reason / edit) → published to alumni-facing feeds.
Featured alumni: staff flag selected alumni as featured with a short achievement text. No separate medalist / category management surfaces.
4.7 Events, Announcements, Opportunities
Events CRUD: type enum (reunion, seminar, talk, other), date/time, venue, description, optional image; upcoming/past views and a simple calendar/list view. (UOL "alumni talks" are folded into this.)
Announcements CRUD: title, body, optional attachment/image, publish window, optional pin. (Replaces UOL "newsletters".)
Opportunities CRUD: type enum (job, internship, scholarship, other), organisation, description, apply link or contact, deadline, status (active/expired derived from deadline). This is the lightweight home for the UOL scholarship idea (posting scholarship notices) without any scholarship workflow.
Alumni-facing pages list published, non-expired items. Staff manage all. Optional later: alumni can submit an opportunity for staff approval.
4.8 Analytics (single dashboard)
One admin dashboard: totals, verified vs under-approval vs rejected, registrations over time, alumni by department, by passing year, by city/district, top employers/sectors, E-cards issued.
Implemented as a small set of parallel aggregate queries (or one SQL function), cached server-side for 30–60 s. Client does not poll faster than 60 s. No materialised views, no "command center", at this data size.
4.9 Bulk Import / Export

Import

Admin uploads Excel (.xlsx) or CSV. Limit ~10 MB / ~10 000 rows [Recommended].
Configurable column mapping: a mapping config (in code/constants file or admin-editable mapping stored in DB) maps source headers → target fields, so header changes do not require code changes. UI lets admin confirm/adjust the mapping before validating.
DB-backed staging: import_batches and import_rows (not an in-memory Map). Flow: upload → parse → stage → server-side validation (departments and roll-number duplicates preloaded once) → admin reviews per-row errors → commit.
Commit runs in one transaction with batched inserts; per-row error report downloadable. Dry-run supported. Idempotent: re-importing the same file does not create duplicates (roll-number uniqueness).
Imported records are created as alumni data records with datasource = 'import'. They are not login accounts (no password); see §13-D2 for how an alumnus gets access.

Export

GET /api/alumni/export honours the same filters. Explicit column list; never SELECT *. Stream or chunk the response. Only admin/superadmin can export; export is audit logged.
4.10 Departments + User Management
Departments CRUD (admin/superadmin): name, short code, is_active. Delete is blocked when alumni reference the department (deactivate instead). Seed values are not invented — the owner supplies the department list (§13-D3).
/setup (superadmin): create/edit/deactivate staff users, assign roles (admin, viewer), force a password-reset email. Superadmin cannot be deleted or demoted by anyone but another superadmin; the last active superadmin can never be removed.
4.11 Email + Audit
Transactional email via nodemailer with connection/socket timeouts set.
Outbox pattern [Recommended]: a request inserts an email_outbox row; the send runs after the response (after() or a Vercel Cron route) with retries and a max-attempt limit. A serverless function can be frozen right after responding, so a bare "fire-and-forget" is not reliable on Vercel.
Emails: email verification, registration received, approved, rejected (with reason), password reset, E-card issued, story approved/rejected, change-request outcome.
Templates are server-side, plain, mobile-friendly, and branded with the GGCB name (the official name is confirmed in §13-D1).
Audit tables: email_logs, admin_activity_logs, login_logs. Audit writes never break a request (catch and log). Admin actions that change data (approve, reject, edit, delete, import commit, export, role change, E-card revoke) always produce an audit row.
5. Explicit Non-Goals

Do not build, scaffold, or carry tables for any of these:

Physical card application / printing / delivery / on-hold workflow.
Scholarships, facility memberships, upskilling, mentorship as workflows (a scholarship notice is just an Opportunity of type scholarship; mentoring is only an opt-in profile flag).
Chapters, association, association leadership, committee workflows.
ERP / SAP integration, SAP IDs, sync scripts.
Merchants and benefits.
Alumni birthdays with gift images and social post URLs.
Faculties and programs tables; per-user resource scopes; legacy RBAC.
Form-template builder.
Public website, external API keys, API-key feeds, CORS allowlists (all deferred, not designed here).
Supabase Auth, Supabase client in the browser, Supabase Realtime.
Google OAuth, Redis, background-job platforms, microservices.
Payments of any kind.
CNIC collection (do not add a CNIC field unless §13-D5 says the college requires it).

If any excluded module is needed later, add it through a new migration. Do not carry unused tables "just in case".

6. Data Model (fresh schema sketch)

Naming: snake_case, singular concept names, real FKs, timestamptz for all times, uuid primary keys (gen_random_uuid()), created_at / updated_at on every table. Identity/academic field names below are proposals; the Excel header mapping (§4.9) is applied later.

Table	Purpose / key columns
users	login identities: id, email (unique, citext), password_hash, role enum (superadmin,admin,viewer,alumni), name, is_active, email_verified_at, last_login_at
departments	id, name (unique), code (unique), is_active
alumni	id, user_id (nullable unique FK → users; null for imported-only records), roll_number (normalized, unique — exact uniqueness rule §13-D4), full_name, email, phone, gender, department_id FK, degree (default 'BS'), session_start_year, session_end_year, passing_year, city, district, country, employer, job_title, sector, bio, social_links JSONB, photo_path, mentor_available bool, directory_visible bool, show_email/show_phone bool (default false), verify_status enum (under_approval,verified,rejected), reject_reason, verified_by, verified_at, is_featured, achievement, datasource enum (registration,import)
alumni_change_requests	alumni_id FK, changes JSONB (old/new), status enum, reviewed_by, reviewed_at, review_note
alumni_ecards	alumni_id unique FK, card_no unique, status (active,revoked), verify_token unique (high-entropy), issued_at, revoked_at
stories	alumni_id FK, title, content, image_path, status enum, reviewed_by, review_note
events	type enum, title, description, starts_at, ends_at, venue, image_path, is_published
announcements	title, body, attachment_path, publish_at, expires_at, is_pinned, is_published
opportunities	type enum, title, organization, description, apply_url/contact, deadline, is_published
import_batches / import_rows	staging: batch status, mapping used, file name, counts; per-row raw data, normalized data, status, error list
auth_attempts	persisted login rate-limit counters / lockouts
auth_tokens	hashed email-verification and password-reset tokens: user_id, type, token_hash, expires_at, used_at
email_outbox	to, template, payload, status, attempts, next_attempt_at, last_error
email_logs, admin_activity_logs, login_logs	audit
applied_migrations	migration ledger

Indexing rule: every filter/search predicate gets a usable index. Use citext or an expression index that matches the exact predicate shape (e.g. a unique index on lower(btrim(roll_number))). Add B-tree indexes on department_id, passing_year, verify_status, city, and a trigram or tsvector index for the name/roll/email search only if EXPLAIN shows it is needed at real data size. Avoid redundant indexes — the data is small and space efficiency matters.

7. Engineering Standards

Carried over from the UOL portal because they fix real, known failures.

Hash all passwords (argon2id / bcrypt ≥ 12). Never store, log, compare, or email plaintext. Use set/reset-password links.
No SELECT * across a response boundary. Explicit column lists per route; a test deep-scans responses for credential keys (password_hash, tokens, verify_token on non-owner routes, etc.).
Transactions around every multi-statement write path (registration, approval + E-card issue, change-request approval, import commit).
Pagination mandatory on every list endpoint, including export (chunked).
Query fan-out budget: ≤ 5 queries per typical request; parallelise independent queries; a dev-only DB_QUERY_STATS counter proves it.
No per-process mutable state for anything that must survive or be shared: rate limits in DB, import staging in DB, caches bounded and TTL'd.
External calls are bounded: SMTP and any HTTP client have timeouts; no sequential fallback chains inside a request.
Indexes designed from predicates, verified with an EXPLAIN baseline script committed under docs/perf/ (kept proportionate to data size).
Authz as a tested matrix: generated route × role status-code matrix (docs/security/authz-matrix.md) + snapshot test. A new route without a matrix entry fails CI.
Migrations ledger: numbered migrations + applied_migrations; never rely on memory of what ran; no manual production schema edits.
Input validation everywhere (Zod) and output encoding; parameterised queries only; no string-built SQL.
Security headers (CSP, HSTS, X-Content-Type-Options, frame protections), secure cookies, CSRF-safe mutation handling, file-upload validation by magic bytes (not just extension).
Least privilege & privacy: personal contact data is returned only to roles that need it; public E-card verification exposes minimal data.
Env names only (never commit values): DATABASE_URL (pooler), DIRECT_URL (migrations), AUTH_SECRET, AUTH_URL/NEXTAUTH_URL as required by the NextAuth version, SMTP_*, FROM_*, SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (server-only, Storage), STORAGE_BUCKET_*, CRON_SECRET, DB_QUERY_STATS (dev).
8. Performance & Space Efficiency
Server components for read-heavy pages; client components only where interactivity needs them. Avoid fetching in effects when a server component can load the data.
TanStack Query: one query key per list+filters, keepPreviousData on paginated tables, debounced search (≥ 300 ms), invalidate narrowly after mutations, no refetch-on-focus for admin lists unless justified.
Resize and compress uploaded images on the server (profile ≤ ~100–200 KB stored); enforce a total storage quota and per-file limits (Supabase free tier storage is limited).
Select only needed columns; use COUNT(*) FILTER for badge counts; cache filter options and analytics with short TTLs.
No N+1 queries: join or batch-load.
Lazy-load heavy UI (charts, calendar); next/image with explicit sizes.
9. UI / UX Standard (top priority)

UI quality is one of the owner's top three priorities. The following process is mandatory for every UI-facing phase.

Before writing any UI code, read and follow the installed skills: UI/UX Pro Max, frontend-design (Anthropic), and web-design-guidelines (Vercel). If a skill is not available in the environment, report that instead of silently skipping it.
Find additional skills only when needed with the globally installed find-skills tool (e.g. npx skills find <topic>). Install only skills that clearly help the current phase (examples of topics: Next.js App Router, TanStack Query, Supabase/Postgres, NextAuth, Playwright testing, accessible forms, data tables). Report each skill installed and why. Do not install duplicates of skills already present, and do not install anything that would change project dependencies without noting it.
Design system first (Phase 1/2 of the build): define tokens once — colour palette (with dark mode if adopted), typography scale, spacing, radii, shadows, motion rules — and a small shared component set (button, input, select, table, dialog, toast, badge, card, empty state, skeleton, page header). All screens must use it; no one-off styling.
Look and feel [Recommended]: a calm, credible, institutional-but-modern style appropriate to a government college; strong typography, generous whitespace, clear hierarchy; a distinctive but restrained identity rather than a generic template. Brand colours/logo come from the college (§13-D1); use neutral placeholders until supplied.
Mobile-first and responsive: most alumni will use phones. Tables degrade to cards or horizontally scroll inside their own container.
States everywhere: loading skeletons, empty states, error states with recovery actions, success toasts, disabled/pending states on submit.
Accessibility: WCAG 2.1 AA target — labelled inputs, visible focus, keyboard operability, colour-contrast compliance, reduced-motion support, correct semantics and aria on dialogs/tables.
Forms: inline validation, clear error messages, password strength guidance, no layout shift.
Final UI audit phase: review finished screens against the web-design-guidelines skill and fix violations before launch.
10. Authorization Matrix (summary)
Area	superadmin	admin	viewer	alumni (verified)	alumni (under approval)
/setup user management	✅	❌	❌	❌	❌
Departments CRUD	✅	✅	read	❌	❌
Alumni list / approve / reject	✅	✅	read	❌	❌
Import	✅	✅	❌	❌	❌
Export	✅	✅	§13-D9	❌	❌
Content CRUD (events, announcements, opportunities, stories review)	✅	✅	read	❌	❌
Analytics	✅	✅	read	❌	❌
Audit logs	✅	✅ (read)	❌	❌	❌
Own profile / change request	n/a	n/a	n/a	✅	limited
E-card (view/download)	n/a	n/a	n/a	✅	❌
Submit story	n/a	n/a	n/a	✅	❌
Alumni-facing content	n/a	n/a	n/a	✅	❌

The generated authz matrix test (§7-9) is the source of truth; this table is a design summary.

11. Deployment [Assumed]
Vercel (app) + Supabase (database, private Storage bucket).
Separate environments: local, preview/staging, production, each with its own Supabase project or branch and its own secrets.
Migrations applied by a controlled step, never by app startup in production.
Backups: Supabase automated backups confirmed enabled; document the restore procedure in docs/ops/.
Error monitoring (e.g. Sentry) and basic uptime check [Recommended].
A production verification checklist (smoke test of login, registration, approval, E-card, import dry-run, email delivery) is run after each deploy.
12. Data Import Note

The college's existing alumni records are Excel sheets (about two years). Plan: map columns (§4.9) → stage → validate → commit through the bulk import pipeline. Imported rows become alumni data records without login credentials. Registration for an alumnus whose roll number already exists follows the decision in §13-D2.

13. Open Decisions (do not invent — ask or use the stated default and record it)
ID	Decision needed	Default if the owner does not answer
D1	Exact official name for UI/emails (Government Postgraduate College Burewala vs short form), logo, brand colours, contact email, support phone	Use "Government Postgraduate College Burewala (GGCB)" and neutral placeholder branding
D2	What happens when someone registers with a roll number/email that already exists (including imported Excel records): hard reject with "contact the college/admin", or admin-triggered "send set-password invite" for imported records. (No self-service claim flow either way.)	Reject with a neutral message that points to the college/admin; admin may send a set-password invite for an imported record
D3	List of departments to seed (and whether any BS discipline names are needed beyond the department)	No seed data; superadmin creates departments through the CRUD before import
D4	Roll-number uniqueness: globally unique, or unique per (department, session)? Format/pattern of a roll number?	Globally unique normalized value; verify against the Excel sample before building
D5	Is CNIC (or any government ID) required by the college?	Not collected
D6	File storage choice: Supabase Storage (server-side, private) vs other. NextAuth + "Supabase as DB only" leaves this open	Supabase Storage, accessed only from server code
D7	Should verified alumni see a peer directory?	Not built at first; add later behind opt-in privacy fields
D8	E-card format and fields: PNG, PDF, both; photo required? card number format? validity period?	Both PNG and PDF; photo optional; no expiry
D9	Can viewer export data?	No export for viewer
D10	Hosting target and domain (Vercel assumed) and SMTP provider	Vercel + Supabase; SMTP provider to be supplied by owner
D11	Retention/privacy policy and an alumni consent text for data processing	Include a short consent checkbox and privacy page; wording supplied by the college
D12	Which verification evidence does an admin use to approve a registration (e.g. match against college records, phone call)?	Admin decides manually using roll number + department + session; no document upload
14. Reference

SYSTEM_DESIGN_CONTEXT.md (UOL, if present in the repo) documents what the old system's kept modules did and its performance risks. Use it to understand what a module did, never how to rebuild it, and never import its SAP, scholarship, chapter, merchant, or legacy RBAC concepts.
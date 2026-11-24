# Authorization matrix

<!-- GENERATED — do not edit by hand. Regenerate with `pnpm authz:matrix`. -->
<!-- The snapshot test (src/tests/unit/authz-matrix.test.ts) fails when this drifts. -->

Expected outcomes per persona for every entry in the central route
policy (`src/server/auth/route-policy.ts`). Guards enforce it server-
side; the e2e matrix spec asserts the real statuses.

- `→ /login` — HTTP 307 to `/login?callbackUrl=<safe path>` (proxy
  for cookie-less requests, layout guard otherwise)
- `403` — real HTTP 403 Forbidden page (guards run outside Suspense;
  never a 404 for wrong-role)
- `→ /admin` / `→ /dashboard` — signed-in users bounced off guest pages
- `404 (prod)` — dev-only surface, notFound() in production builds
- `401` (cron row) — bearer-secret auth; no session, cookie, or role
  ever authorizes it, so every persona gets 401 without the secret

| Route | anonymous | alumni-under_approval | alumni-rejected | alumni-verified | viewer | admin | superadmin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` (page) | 200 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/login` (page) | 200 | → /dashboard | → /dashboard | → /dashboard | → /admin | → /admin | → /admin |
| `/register` (page) | 200 | → /dashboard | → /dashboard | → /dashboard | → /admin | → /admin | → /admin |
| `/forgot-password` (page) | 200 | → /dashboard | → /dashboard | → /dashboard | → /admin | → /admin | → /admin |
| `/verify-email` (page) | 200 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/reset-password` (page) | 200 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/set-password` (page) | 200 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/design` (page) | 404 (prod) | 404 (prod) | 404 (prod) | 404 (prod) | 404 (prod) | 404 (prod) | 404 (prod) |
| `/api/health` (api) | 200 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/api/auth/me` (api) | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/api/auth` (api) | 200 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/api/cron/email-outbox` (cron) | 401 | 401 | 401 | 401 | 401 | 401 | 401 |
| `/dashboard` (page) | → /login | 200 | 200 | 200 | 403 | 403 | 403 |
| `/admin/users` (page) | → /login | 403 | 403 | 403 | 403 | 403 | 200 |
| `/admin/import-export` (page) | → /login | 403 | 403 | 403 | 403 | 200 | 200 |
| `/admin/audit-logs` (page) | → /login | 403 | 403 | 403 | 403 | 200 | 200 |
| `/admin/alumni` (page) | → /login | 403 | 403 | 403 | 200 | 200 | 200 |
| `/admin/departments` (page) | → /login | 403 | 403 | 403 | 200 | 200 | 200 |
| `/admin/content` (page) | → /login | 403 | 403 | 403 | 200 | 200 | 200 |
| `/admin/analytics` (page) | → /login | 403 | 403 | 403 | 200 | 200 | 200 |
| `/admin` (page) | → /login | 403 | 403 | 403 | 200 | 200 | 200 |

Alumni verification: `under_approval`/`rejected` alumni reach only the
dashboard (any `alumniVerified` entry would gate `verified` alumni).

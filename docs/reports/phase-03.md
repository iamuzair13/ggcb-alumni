# Phase 3 report — Authentication & RBAC

Scope: Prompt 3/14. Branch `phase-03-auth` (from `phase-02-database`).
No schema changes; the Prompt-2 tables (`users`, `auth_attempts`,
`auth_tokens`, `login_logs`, `admin_activity_logs`) fit the design exactly.

## 1. Summary

- Real credentials sign-in via **Auth.js v5 + argon2id against `users`**
  — verified end-to-end against the live Supabase database (real session
  issued for the seeded superadmin).
- **One server-side authorization layer** — `requireUser/Role/Staff/Alumni`
  guards (authoritative), a central `ROUTE_POLICY` with a completeness
  test, `defineRoute`/`defineAction` wrappers, a generated route×role
  matrix, and `proxy.ts` as early routing only.
- **DB-backed rate limiting** — three HMAC'd buckets, rolling 15-minute
  windows, one multi-row insert per failure.
- **Reusable hashed-token service** for Prompts 4/5 (create/consume/
  invalidate-prior; atomic single-use).
- **Sign-out, role redirects, role-filtered nav, explicit 403** — all
  persona behaviour driven by the central policy.
- `pnpm auth:set-password` — hidden-prompt CLI: argon2id hash, session
  bump, audit row.

## 2. Housekeeping (§3) results

- Real Supabase ref/host + personal email **scrubbed from committed
  docs** (housekeeping commit `1c445c4`); `git grep` for both strings
  now returns **zero hits** in tracked files.
- `schema.sql` moved to `docs/ops/schema-bootstrap.sql`; `pnpm db:schema`
  regenerates it and CI diffs it (no drift possible).
- `.env.local` never committed; `.gitignore` covers `.env*`; secretlint
  runs in lint-staged + CI — **clean on every commit**.
- `git grep` for the seeded password — zero hits (hash only, ever).

## 3. Dependencies added

| dep         | version         | why                                                                                                                             |
| ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `next-auth` | `5.0.0-beta.32` | Auth.js v5 — the only App-Router-native line; peers allow `next@^16`, `react@^19` (verified against `next@16.4.6`). No adapter. |
| `argon2`    | `0.45.2`        | Already added Phase 2 for the out-of-band seed — reused here.                                                                   |

`serverExternalPackages: ["argon2"]` keeps the N-API binding external
(native). The common-password blocklist is **data, not a dep** (see §7).

## 4. Auth core

- `src/auth.ts` — Credentials provider; `jwt`/`session` callbacks; cookie
  `__Host-authjs.session-token` (HttpOnly, Secure, SameSite=Lax, 1h);
  `trustHost` from `AUTH_TRUST_HOST`; `AUTH_URL` respected.
- JWT = `{ sub, name, role, sessionVersion, checkedAt }` — **no email,
  no PII, no hash**. `checkedAt` gates the ≤5-min `recheckUser` query
  (is_active + role + session_version — one query, fresh role returned).
- `authorizeLogin` returns `{ ok, user?, code?, post() }` — **all DB
  writes deferred to `post()`** so a failed attempt stays at 2 queries
  (rate-check + user) and success at ≤5.
- Timing: unknown-email and missing-hash paths run a real argon2 verify
  against a precomputed dummy hash (~97–106 ms measured locally,
  m=19456/t=2/p=1 — OWASP cheatsheet params).
- Passwords: `hashPassword`/`verifyPassword`/`verifyPasswordWithTiming`;
  `needsRehash` triggers a lazy `UPDATE password_hash` on login when the
  stored params drift (verified: a m=4096/t=1 hash verifies + flags
  rehash). Policy = 10–128 code points, no composition rules, blocklist,
  no email/name containment.
- `keys.ts` — HKDF-SHA256 `deriveAuthKey(label, secret)` (cache keyed by
  label+secret — a bug I caught in review), `hashAttemptKey` = opaque
  HMAC-SHA256 for every `auth_attempts` row (raw email/IP never stored).
- `tokens.ts` — `createAuthToken` (256-bit raw, sha256 stored,
  invalidate-prior-per-type in one transaction), `consumeAuthToken`
  (single `UPDATE ... used_at = now() WHERE token_hash AND used_at IS
NULL AND expires_at > now() RETURNING user_id` — concurrent double-
  consume proven impossible in the db suite).

## 5. Authorization layer

- `session.ts` — `getSession` (React-cached per request;
  `await connection()` required under Cache Components), `requireUser`
  (`callbackPath` sanitized), `requireRole`, `requireStaff`,
  `requireAlumni({verified})`, `requireUser({fresh})` (forces recheck),
  `invalidateUserSessions` (`session_version+1`).
- `route-policy.ts` — central `ROUTE_POLICY` (longest-prefix match);
  completeness test scans `src/app` and **fails if a route has no policy**
  (fixture test proves detection).
- `route.ts` — `defineRoute`/`defineAction` → **authorize → validate →
  handler** (anonymous = 401 JSON, wrong role = 403 JSON /
  `forbidden()`); `assertSameOrigin` blocks cross-origin mutations.
- **403 decision: `forbidden()`** (Next's explicit-403 interrupt; needs
  `experimental.authInterrupts` — enabled) over a custom page — it's the
  framework-native surface (`/forbidden` + `forbidden.tsx` both exist),
  and wrong-role must never look like 404.
- `proxy.ts` exists — matcher `/admin|/dashboard|/api/auth/me` only:
  cookie-less → 307 `/login?callbackUrl=…`; otherwise sets
  `Cache-Control: private, no-store`. **It never grants** — every
  guard rechecks server-side (belt + braces).

## 6. Rate limiting

`auth_attempts` rows keyed by `HMAC(secret, email|ip|pair)` — opaque
hashes only. Buckets/limits (constants in `rate-limit.ts`):

| bucket     | limit / 15-min rolling window |
| ---------- | ----------------------------- |
| email + ip | 5                             |
| ip         | 30                            |
| email      | 20                            |

- One multi-row `INSERT` per failure (3 bucket rows, one query).
- **Blocked attempts write nothing** — lockouts decay instead of
  self-sustaining (test asserts zero rows).
- Purge of stale rows via a bounded `DELETE` (kept cheap, off the hot
  path).

## 7. Password blocklist

SecLists `10k-most-common.txt` — MIT, provenance + regen steps in
`docs/security/password-blocklist.md`; 10 001 entries compiled to a
`Set` (no fs at runtime).

## 8. UI

- `/login` — real `LoginForm` (client) posting to `signIn` server action;
  `FormField` a11y (`aria-describedby`/`role="alert"`),
  `autocomplete=username|current-password`, labelled show/hide toggle,
  loading state, `EMAIL_NOT_VERIFIED` distinct copy, generic creds error,
  safe `callbackUrl` validated twice (client hidden field + `sanitize`).
- `GuestRedirect` — signed-in visitors bounced to role home (streamed
  redirect under Cache Components).
- Admin shell: `requireStaff` + role-filtered `ADMIN_NAV` (viewer sees 5
  links, not 8), signed-in name, `SignOutButton`.
- Alumni shell: `requireAlumni` + `verify_status` copy; superadmin-locked
  pages (`users`, `import-export`, `audit-logs`) guard with
  `requireRole(["superadmin"])`.
- `forbidden.tsx` + `app/(errors)/forbidden` — explicit, on-brand 403.

## 9. Cache Components findings (worth knowing)

- `auth()` inside RSC **must** be preceded by `await connection()` —
  its crypto reads are "unstable values" under Cache Components
  (was a hard error before the fix).
- **`forbidden()`/`redirect()` inside `<Suspense>` cannot set HTTP
  statuses** — the shell has already streamed, so a guarded layout
  emits a broken streamed fallback ("could not validate instant", status
  200). The guards were moved OUTSIDE Suspense: protected layouts await
  `requireStaff`/`requireRole` at the top level, so wrong-role gets a
  real **403** and anonymous a real **307** (cookie-less users also get
  an early 307 from `proxy.ts`). Consequence: protected pages are fully
  dynamic — correct, since there is no shareable static shell.
- Guest pages (`/login` etc.) keep `GuestRedirect` inside Suspense —
  a signed-in user hitting a guest page is a UX bounce, not a security
  boundary, and the streamed redirect is correct there.
- `searchParams` awaits must live inside Suspense too.

## 10. Results

| suite                | local result                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint` + `tsc`  | clean, zero warnings                                                                                                       |
| `pnpm test` (unit)   | **114 passed / 15 files**                                                                                                  |
| `pnpm test:db`       | **44 skipped** — `TEST_DIRECT_URL` unset locally (CI has a real PG17 service; specs cover login, lockout, tokens, budgets) |
| `pnpm test:e2e`      | **38 passed**, 7 skipped (persona tests need `E2E_AUTH=1` + local test db — wired in CI)                                   |
| `pnpm test:e2e:prod` | **3 passed** (build → `/design` 404s, headers, health)                                                                     |
| `pnpm build`         | green; no `postgres`/auth code in client chunks (grep: 0)                                                                  |
| secretlint           | clean                                                                                                                      |

**Not run locally** (needs a local Postgres `*test*` db — none exists on
this machine): the `test:db` suite and the `E2E_AUTH` persona-matrix e2e
block. Both are wired into CI's `postgres:17-alpine` service and skip
cleanly without it — `test:db` reported `44 skipped` locally.

## 11. Real-world verification performed locally

- `pnpm build` + `next start` → `POST /api/auth/callback/credentials`
  for the real seeded superadmin → **302 + `__Host-authjs.session-token`
  (Secure, HttpOnly, SameSite=Lax)**; `/api/auth/session` returned
  `{id, name:"Uzair Shafqat", role:"superadmin", sessionVersion:1}`;
  `/api/auth/me` → `{id,name,role}` + `Cache-Control: private,no-store`;
  wrong password → `code=invalid_credentials` (generic).
- `GET /admin` with session → 200 (name rendered); anonymous → 307
  `/login?callbackUrl=/admin`.
- Cookie-less vs cookie-bearing paths both verified (proxy 307 vs
  streamed redirect).

## 12. Issues / risks / deviations

- **`forbidden()` needs `experimental.authInterrupts`** — flagged as
  experimental in Next 16.4.6; the feature is the standard 403 surface,
  risk is the flag's name/enablement changing on upgrade (report notes it).
- **Later-phase env vars relaxed to optional** — `SMTP_*`, `SUPABASE_*`,
  `CRON_SECRET` were required in Phase 2 but unused; production start
  proved that was premature. Each later prompt flips its own to required.
- Client-side guest-redirect (not 307) is inherent to PPR streaming —
  documented in the matrix, behaviour is correct.
- `AUTH_SECRET` rotation invalidates every session + all HMAC'd attempt
  keys — documented in the runbook.

## 13. Owner action items

1. **Rotate the superadmin password now** — it was seeded out-of-band
   (`ggcbadmin@12`, deliberately weak):
   `pnpm auth:set-password --email <your-email>` — hidden prompt, bumps
   `session_version` (kills other sessions), writes an audit row.
   See `docs/ops/auth-runbook.md`.
2. **DB-backed + persona e2e tests run in CI**, not locally — a local
   `*test*` Postgres (docker-compose exists) makes them run locally too.
3. **Vercel env vars for Prompt 4+** (names only):
   `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`,
   `AUTH_TRUST_HOST`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
   `SMTP_PASSWORD`, `SMTP_SECURE`, `FROM_EMAIL`, `FROM_NAME`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET_PRIVATE`,
   `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`.
4. `proxy.ts` vs `forbidden()` choices + Cache-Components notes are in
   `docs/decisions.md` §Prompt 3.

## 14. Prompt 4 handoff

Reuse as-is: `defineAction`/`defineRoute` (authorize→validate),
`createAuthToken`/`consumeAuthToken` (password-reset + email-verify —
tokens already have the right expiry constants), `writeLoginLog` /
`admin_activity_logs` helper in `audit.ts` (the `after()`-ready
structured writer), `invalidateUserSessions`, the route policy (add
entries → completeness test enforces guards), `RateLimitStore` for
verify/resend endpoints, `assertSameOrigin` for mutation actions, and
`docs/ops/auth-runbook.md`. Flip `SMTP_*`, `FROM_*`, `CRON_SECRET` to
required in `env.server.ts` when the outbox is implemented.

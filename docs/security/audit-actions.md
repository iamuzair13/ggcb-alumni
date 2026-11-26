# Audit actions + write modes

`admin_activity_logs` is append-only (grant + trigger). Two write modes
from `src/server/audit/index.ts`:

| Mode           | API                                      | Failure behaviour                       | Use when                                             |
| -------------- | ---------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| In-transaction | `recordAdminActivity(e, {tx})`           | throws → the business change rolls back | The audit row IS part of the critical change         |
| Best-effort    | `recordAdminActivitySafe(e)` / `after()` | swallowed + logged without data         | Nice-to-have events where the response must not wait |

**Rule of thumb**: if the audit row would be missed in an incident review
(approvals, rejections, role changes, import commits, exports, E-card
revoke, password set/reset) → in-transaction. Everything else (drain
ticks, reads worth noting) → best-effort.

## Metadata contract

`metadata` is sanitized before insert (`sanitizeAuditMetadata`):

- keys matching `/pass(word)?|token|secret|hash|authorization|cookie/i`
  dropped recursively (nested too);
- non-plain values (functions, class instances, symbols) dropped;
- arrays capped at 100 entries, depth at 8;
- total JSON capped at ~4 KB (long strings truncated, `__truncated` marker).

Never hand-build metadata containing raw tokens, password material, or
request headers — the sanitizer is a backstop, not a license.

## Action union (`ADMIN_ACTIONS`)

| Action                                    | Mode                                      | Producer                      |
| ----------------------------------------- | ----------------------------------------- | ----------------------------- |
| `auth.password_set`                       | in-tx                                     | `pnpm auth:set-password` (P3) |
| `auth.sessions_invalidated`               | in-tx                                     | session_version bump (P3)     |
| `email.outbox_drained`                    | n/a — worker logs to `email_logs` instead | cron (P4)                     |
| `user.registered`                         | in-tx                                     | registration (P5)             |
| `auth.email_verified`                     | in-tx                                     | verification consume (P5)     |
| `auth.password_reset`                     | in-tx                                     | reset consume (P5)            |
| `alumni.change_request_created`           | in-tx                                     | change request (P6)           |
| `alumni.change_request_decided`           | in-tx                                     | request review (P7)           |
| `admin.registration_decided`              | in-tx                                     | registration review (P7)      |
| `admin.user_created`                      | in-tx                                     | staff user create (P7)        |
| `admin.user_role_changed`                 | in-tx                                     | role change (P7)              |
| `admin.user_deactivated`                  | in-tx                                     | deactivation (P7)             |
| `ecard.issued` / `.revoked` / `.reissued` | in-tx                                     | E-card ops (P8)               |
| `content.moderated`                       | in-tx                                     | story moderation (P9)         |
| `content.featured_changed`                | in-tx                                     | feature/unfeature (P9)        |
| `import.committed`                        | in-tx                                     | import commit (later)         |
| `alumni.bulk_action`                      | in-tx                                     | bulk approve/reject/feature   |
| `export.completed`                        | in-tx                                     | alumni export (later)         |

`login_logs` has its own writer (`writeLoginLog`, Phase 3 contract) —
always best-effort, sanitised (ua capped 300, reason single-lined 200).

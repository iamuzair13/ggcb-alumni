# Template catalogue

`src/server/email/templates.ts` — every transactional email the product
will send, defined in Prompt 4. HTML + text for each; all interpolated
values escaped (`escapeHtml` / `singleLine` / `cappedText`); links built
only from `NEXT_PUBLIC_APP_URL` + a fixed path + a token (`tokenLink`).

Token-link paths (implemented by **Prompt 5**): `/verify-email`,
`/reset-password`, `/set-password` — the token travels in `?token=`.

| Template                 | Payload fields                              | Enqueued by         | Throttle (per recipient) |
| ------------------------ | ------------------------------------------- | ------------------- | ------------------------ |
| `email_verification`     | name, token, expiresHours                   | P5 (registration)   | 3 / hour                 |
| `registration_received`  | name                                        | P5                  | 10 / hour                |
| `registration_approved`  | name                                        | P7 (admin decide)   | 10 / hour                |
| `registration_rejected`  | name, reason                                | P7                  | 10 / hour                |
| `password_reset`         | name, token, expiresHours                   | P5 (forgot)         | 3 / hour                 |
| `password_changed`       | name                                        | P5 (set/reset done) | 10 / hour                |
| `staff_invitation`       | name, role, token, expiresHours             | P7 (create staff)   | 3 / hour                 |
| `ecard_issued`           | name                                        | P8                  | 10 / hour                |
| `story_approved`         | name, title                                 | P9                  | 10 / hour                |
| `story_rejected`         | name, title, reason                         | P9                  | 10 / hour                |
| `change_request_decided` | name, decision (approved/rejected), reason? | P6/P7               | 10 / hour                |
| `smtp_test`              | note?                                       | `pnpm email:test`   | 20 / hour                |

Rules baked into the catalogue (spec §4.4):

- Single-column, mobile-friendly HTML; inline CSS only. **No** remote
  images, tracking pixels, web fonts, scripts, attachments, or external CSS.
- Subjects are single-line (CR/LF stripped) and capped.
- Names/reasons/titles are length-capped at the schema and again at render.
- Payloads are Zod-`.strict()` — unknown keys rejected at enqueue.
- Payloads are encrypted at rest (AES-256-GCM) and nulled after send.
- Templates NEVER take a caller-supplied URL — open-redirect-proof.
- Branding text lives in `src/server/email/brand.ts` (the single D1
  placeholder — change it there only).

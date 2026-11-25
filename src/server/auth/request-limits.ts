import type postgres from "postgres";
import type { AttemptKeys } from "./rate-limit";

/**
 * Rate limiting for PUBLIC request flows (password reset, email
 * verification resend) — migration 0010 added these `auth_attempts.kind`
 * values.
 *
 * DIFFERENCE from the login limiter (documented in 0010): these kinds
 * record EVERY request, not only failures — each request has a real cost
 * (an email) even when the address is bogus. The limit check therefore
 * ignores `succeeded`; `false` is written by convention.
 *
 * Buckets (rolling 60 minutes):
 *   - per (email, IP) pair: 3/hour  — the template throttle (3/hr for
 *     password_reset/email_verification payloads) is the second line.
 *   - per IP: 20/hour — one address cannot spray many emails.
 *
 * A limited request still gets the neutral response; nothing in the
 * outcome reveals whether the email exists or was limited.
 */
export const REQUEST_LIMITS = {
  WINDOW_MINUTES: 60,
  PAIR_MAX: 3,
  IP_MAX: 20,
} as const;

export type RequestKind = "password_reset" | "email_verify";

/** One query: request counts in the window for the two buckets. */
export async function checkRequestLimit(
  sql: postgres.Sql | postgres.TransactionSql,
  kind: RequestKind,
  keys: AttemptKeys,
  now: Date = new Date(),
): Promise<{ limited: boolean }> {
  const windowStart = new Date(
    now.getTime() - REQUEST_LIMITS.WINDOW_MINUTES * 60_000,
  );
  const [row] = await sql<{ pair: number; ip: number }[]>`
    SELECT
      count(*) FILTER (WHERE key_hash = ${keys.pair})::int AS pair,
      count(*) FILTER (WHERE key_hash = ${keys.ip})::int   AS ip
    FROM auth_attempts
    WHERE kind = ${kind} AND attempted_at >= ${windowStart}
  `;
  return {
    limited:
      row.pair >= REQUEST_LIMITS.PAIR_MAX || row.ip >= REQUEST_LIMITS.IP_MAX,
  };
}

/** Every request writes its two bucket rows in one statement. */
export async function recordRequest(
  sql: postgres.Sql | postgres.TransactionSql,
  kind: RequestKind,
  keys: AttemptKeys,
): Promise<void> {
  await sql`
    INSERT INTO auth_attempts (kind, key_hash, succeeded)
    VALUES (${kind}, ${keys.pair}, false), (${kind}, ${keys.ip}, false)
  `;
}

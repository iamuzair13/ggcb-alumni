/**
 * DB-backed login rate limiting (context.md §4.1 — persisted, never an
 * in-memory Map; multi-instance safe).
 *
 * Three failure buckets in a rolling 15-minute window, checked BEFORE
 * password verification. Keys are HMAC-SHA256 (HKDF-derived key) of the
 * normalised identifier — raw emails/IPs are never stored (§4.4).
 *
 * Design note on rows: the schema pins `kind='login'` (CHECK constraint),
 * so the bucket dimension is carried in the HASH PREIMAGE — each FAILED
 * attempt writes one row per bucket it belongs to with a distinct
 * key_hash (`email:…` / `ip:…` / `pair:…` inputs), keeping every bucket
 * query a single index lookup. A BLOCKED attempt writes NOTHING to
 * auth_attempts (it is recorded in login_logs only) — the rule that
 * prevents a lockout from refreshing its own window and becoming
 * self-sustaining.
 */
import type postgres from "postgres";
import { hashAttemptKey } from "./keys";

export const RATE_LIMIT = {
  /** Rolling window, minutes. */
  WINDOW_MINUTES: 15,
  /** Failures per (email, IP) pair. */
  EMAIL_IP_MAX: 5,
  /** Failures per IP (any email). */
  IP_MAX: 30,
  /** Failures per email (any IP). */
  EMAIL_MAX: 20,
  /** Opportunistic purge probability per login attempt. */
  PURGE_FRACTION: 0.01,
  /** Rows older than this (days) are housekeeping-only — forensic window. */
  PURGE_KEEP_DAYS: 15,
} as const;

export interface AttemptKeys {
  email: string;
  ip: string;
  pair: string;
}

export function attemptKeys(
  email: string,
  ip: string | null,
  secret: string,
): AttemptKeys {
  const e = `email:${email}`;
  const i = `ip:${ip ?? "unknown"}`;
  return {
    email: hashAttemptKey(e, secret),
    ip: hashAttemptKey(i, secret),
    pair: hashAttemptKey(`${e}|${i}`, secret),
  };
}

export interface RateLimitStore {
  /**
   * One query: failure counts for all three buckets in the window.
   * Returns [pair, ip, email] counts.
   */
  bucketCounts(
    keys: AttemptKeys,
    windowStart: Date,
  ): Promise<{ pair: number; ip: number; email: number }>;
  /** Insert attempt rows — batched into ONE statement. */
  insert(
    rows: { kind: string; keyHash: string; succeeded: boolean }[],
  ): Promise<void>;
  /** Delete rows older than the window (housekeeping, best-effort). */
  purge(olderThan: Date): Promise<void>;
}

export function dbAttemptStore(sql: postgres.Sql): RateLimitStore {
  return {
    async bucketCounts(keys, windowStart) {
      const [row] = await sql<{ pair: number; ip: number; email: number }[]>`
        SELECT
          count(*) FILTER (WHERE key_hash = ${keys.pair})::int  AS pair,
          count(*) FILTER (WHERE key_hash = ${keys.ip})::int    AS ip,
          count(*) FILTER (WHERE key_hash = ${keys.email})::int AS email
        FROM auth_attempts
        WHERE kind = 'login' AND attempted_at >= ${windowStart} AND succeeded = false
      `;
      return row;
    },
    insert(rows) {
      return sql`
        INSERT INTO auth_attempts (kind, key_hash, succeeded)
        ${sql(rows.map((r) => ({ kind: r.kind, key_hash: r.keyHash, succeeded: r.succeeded })))}
      `.then(() => undefined);
    },
    async purge(olderThan) {
      const minutes = Math.floor((Date.now() - olderThan.getTime()) / 60_000);
      await sql`SELECT public.purge_auth_attempts(${`${minutes} minutes`}::interval)`;
    },
  };
}

export type RateCheckResult = { limited: true } | { limited: false };

/**
 * Checks all three buckets BEFORE password verification. `limited`
 * means "too many attempts" — the caller returns a generic rate-limit
 * outcome that reveals nothing about account existence.
 */
export async function checkRateLimit(
  store: RateLimitStore,
  keys: AttemptKeys,
  now: Date = new Date(),
): Promise<RateCheckResult> {
  const windowStart = new Date(
    now.getTime() - RATE_LIMIT.WINDOW_MINUTES * 60_000,
  );
  const c = await store.bucketCounts(keys, windowStart);
  const limited =
    c.pair >= RATE_LIMIT.EMAIL_IP_MAX ||
    c.ip >= RATE_LIMIT.IP_MAX ||
    c.email >= RATE_LIMIT.EMAIL_MAX;
  return { limited };
}

/**
 * Record the outcome. Failures write one row per bucket dimension;
 * a BLOCKED attempt writes nothing at all — writing a failure row
 * would refresh the window for the pair bucket and make the lockout
 * self-sustaining. (The blocked attempt is still recorded in
 * login_logs by the caller.) Success writes nothing: failures age out.
 */
export async function recordAttempt(
  store: RateLimitStore,
  keys: AttemptKeys,
  outcome: "failed" | "blocked" | "success",
): Promise<void> {
  if (outcome !== "failed") return;
  // ONE statement, three rows — one per bucket dimension (distinct key_hashes).
  await store.insert([
    { kind: "login", keyHash: keys.pair, succeeded: false },
    { kind: "login", keyHash: keys.ip, succeeded: false },
    { kind: "login", keyHash: keys.email, succeeded: false },
  ]);
}

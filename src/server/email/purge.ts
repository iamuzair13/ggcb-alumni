import "server-only";
/**
 * Maintenance purge (spec §4.8) — runs inside the cron invocation.
 * Every delete is BOUNDED via a LIMIT'd CTE so a run can never hold a
 * long lock. Idempotent. NEVER touches email_logs / admin_activity_logs /
 * login_logs (retention is Open Decision D11).
 */
import type postgres from "postgres";
import { sql as pool } from "@/server/db";

const DELETE_CAP = 1000; // rows per statement per run

export interface PurgeCounts {
  authAttempts: number;
  authTokens: number;
  outboxSent: number;
  outboxDead: number;
}

export async function runMaintenancePurge(
  sql: postgres.Sql = pool,
): Promise<PurgeCounts> {
  const counts: PurgeCounts = {
    authAttempts: 0,
    authTokens: 0,
    outboxSent: 0,
    outboxDead: 0,
  };

  // Login rate-limit rows older than a day (existing helper).
  const [r1] = await sql<{ n: bigint | number }[]>`
    SELECT public.purge_auth_attempts(interval '1 day') AS n
  `;
  counts.authAttempts = Number(r1.n);

  // Consumed or expired auth_tokens older than 7 days.
  const r2 = await sql`
    WITH doomed AS (
      SELECT id FROM auth_tokens
      WHERE (used_at IS NOT NULL OR expires_at < now())
        AND created_at < now() - interval '7 days'
      LIMIT ${DELETE_CAP}
    )
    DELETE FROM auth_tokens WHERE id IN (SELECT id FROM doomed)
    RETURNING id
  `;
  counts.authTokens = r2.length;

  // Delivered outbox rows older than 7 days (payload already NULL).
  const r3 = await sql`
    WITH doomed AS (
      SELECT id FROM email_outbox
      WHERE status = 'sent' AND sent_at < now() - interval '7 days'
      LIMIT ${DELETE_CAP}
    )
    DELETE FROM email_outbox WHERE id IN (SELECT id FROM doomed)
    RETURNING id
  `;
  counts.outboxSent = r3.length;

  // Dead/failed rows older than 30 days (incl. last_error; payload stays
  // until here so failures can be diagnosed — spec §4.3).
  const r4 = await sql`
    WITH doomed AS (
      SELECT id FROM email_outbox
      WHERE status = 'failed'
        AND attempts >= max_attempts
        AND updated_at < now() - interval '30 days'
      LIMIT ${DELETE_CAP}
    )
    DELETE FROM email_outbox WHERE id IN (SELECT id FROM doomed)
    RETURNING id
  `;
  counts.outboxDead = r4.length;

  return counts;
}

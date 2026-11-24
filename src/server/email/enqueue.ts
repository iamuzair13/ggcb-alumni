import "server-only";
/**
 * enqueueEmail — the ONLY way mail enters the outbox (spec §4.5).
 *
 * - Accepts a transaction handle so callers enqueue inside their business
 *   transaction (the outbox guarantee: the email exists iff the change does).
 * - Validates recipient + payload, encrypts the payload at rest.
 * - ONE statement: CTE counts recent sends (throttle) + conditional INSERT
 *   + ON CONFLICT idempotency — ≤2 queries including tx reuse.
 * - Returns a coarse status — never the payload, never a "throttled" flag
 *   that callers could accidentally surface to end users.
 */
import type postgres from "postgres";
import { getServerEnv } from "@/lib/config/env.server";
import { sql as pool } from "@/server/db";
import { encryptPayload } from "./crypto";
import { isValidEmailAddress } from "./escape";
import { isTemplateName, TEMPLATES, type TemplateName } from "./templates";

export interface EnqueueInput {
  to: string;
  template: TemplateName;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

export type EnqueueStatus = "queued" | "duplicate" | "throttled";
export interface EnqueueResult {
  status: EnqueueStatus;
  id?: string;
}

export class EnqueueError extends Error {
  constructor(
    public readonly code: "INVALID_TO" | "INVALID_TEMPLATE" | "INVALID_PAYLOAD",
    message: string,
  ) {
    super(message);
    this.name = "EnqueueError";
  }
}

/**
 * Enqueue inside `tx` when given, else on the shared pool. The insert is a
 * single statement: throttle count + conditional insert + idempotent
 * conflict, so the whole call costs exactly 1 query.
 */
export async function enqueueEmail(
  input: EnqueueInput,
  opts: {
    tx?: postgres.Sql | postgres.TransactionSql;
    /** Overrides env AUTH_SECRET (tests). */
    secret?: string;
  } = {},
): Promise<EnqueueResult> {
  const to = input.to.trim().toLowerCase();
  if (!isValidEmailAddress(to)) {
    throw new EnqueueError("INVALID_TO", "invalid recipient address");
  }
  if (!isTemplateName(input.template)) {
    throw new EnqueueError("INVALID_TEMPLATE", "unknown template");
  }
  const tpl = TEMPLATES[input.template];
  const parsed = tpl.payloadSchema.safeParse(input.payload);
  if (!parsed.success) {
    throw new EnqueueError("INVALID_PAYLOAD", "payload failed schema");
  }
  const secret = opts.secret ?? getServerEnv().AUTH_SECRET;
  const envelope = encryptPayload(
    parsed.data as Record<string, unknown>,
    secret,
  );
  const key =
    input.idempotencyKey != null && input.idempotencyKey.length > 0
      ? input.idempotencyKey.slice(0, 255)
      : null;
  const { max, windowSeconds } = tpl.throttle;
  const exec = (opts.tx ?? pool) as postgres.Sql;

  const rows = await exec<
    { inserted: boolean; had_key: boolean; recent_n: number }[]
  >`
    WITH recent AS (
      SELECT count(*)::int AS n
      FROM email_outbox
      WHERE to_email = ${to} AND template = ${input.template}
        AND created_at > now() - make_interval(secs => ${windowSeconds})
    ), key_row AS (
      SELECT id FROM email_outbox
      WHERE ${key}::text IS NOT NULL AND idempotency_key = ${key}
      LIMIT 1
    ), ins AS (
      INSERT INTO email_outbox (to_email, template, payload, idempotency_key)
      SELECT ${to}, ${input.template}, ${exec.json(envelope)}, ${key}
      WHERE (SELECT n FROM recent) < ${max}
      ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
      DO NOTHING
      RETURNING id
    )
    SELECT
      (SELECT count(*) FROM ins) > 0 AS inserted,
      EXISTS (SELECT 1 FROM key_row) AS had_key,
      (SELECT n FROM recent) AS recent_n
  `;
  const { inserted, had_key, recent_n } = rows[0];
  if (inserted) return { status: "queued" };
  if (had_key) return { status: "duplicate" };
  if (recent_n >= max) return { status: "throttled" };
  // Under the cap with no visible key row yet still not inserted → a
  // concurrent same-key insert won the race (ON CONFLICT swallowed ours).
  if (key !== null) return { status: "duplicate" };
  return { status: "throttled" };
}

/**
 * kickOutbox — best-effort nudge to drain a few rows after an enqueue.
 * Intended for Next's `after()`: fire-and-forget is unreliable on
 * serverless, so this NEVER delays the response and swallows all errors —
 * the cron drain remains the authoritative worker (spec §2).
 */
export function kickOutbox(): void {
  void import("./worker")
    .then(({ processOutbox }) =>
      processOutbox({ budgetMs: 5_000, batchSize: 10 }),
    )
    .catch((e) => {
      console.warn(
        "[email] kickOutbox failed:",
        e instanceof Error ? e.message : e,
      );
    });
}

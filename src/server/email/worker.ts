import "server-only";
/**
 * processOutbox — drains email_outbox (spec §4.6).
 *
 *  claim     one UPDATE … FOR UPDATE SKIP LOCKED — concurrent workers can
 *            never double-send
 *  recover   stale 'sending' rows (lease expired) → 'failed', counted attempt
 *  send      template render + transport.sendMail with strict timeouts
 *  outcome   sent → redact payload | transient → backoff | permanent → dead
 *  log       every terminal attempt writes an immutable email_logs row
 *
 * EMAIL_MODE=off returns immediately WITHOUT touching rows. Returns
 * counts only — never message content or identifiers.
 */
import type postgres from "postgres";
import { getServerEnv } from "@/lib/config/env.server";
import { sql as pool } from "@/server/db";
import { backoffMs, classifySendError } from "./classify";
import { decryptPayload } from "./crypto";
import { emailBaseUrl } from "./links";
import { scrubError } from "./scrub";
import { isTemplateName, TEMPLATES } from "./templates";
import { transportForCurrentMode, type MailTransport } from "./transport";

export interface OutboxCounts {
  claimed: number;
  sent: number;
  retried: number;
  dead: number;
  skipped: number;
}

interface ClaimedRow {
  id: string;
  to_email: string;
  template: string;
  payload: unknown;
  attempts: number;
  max_attempts: number;
}

const CLAIM_SQL = `
  UPDATE email_outbox
  SET status = 'sending', locked_at = now(), attempts = attempts + 1
  WHERE id IN (
    SELECT id FROM email_outbox
    WHERE status IN ('pending','failed')
      AND next_attempt_at <= now()
      AND attempts < max_attempts
    ORDER BY next_attempt_at
    LIMIT $1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id, to_email, template, payload, attempts, max_attempts
`;

/** Stale 'sending' rows → 'failed' + counted attempt (one statement). */
const RECOVER_SQL = `
  UPDATE email_outbox
  SET status = 'failed', locked_at = NULL,
      next_attempt_at = now(), attempts = attempts + 1,
      last_error = 'stale send lock recovered'
  WHERE status = 'sending' AND locked_at < now() - make_interval(secs => $1)
  RETURNING id
`;

async function logAttempt(
  sql: postgres.Sql,
  row: ClaimedRow,
  status: "sent" | "failed",
  error: string | null,
): Promise<void> {
  try {
    await sql`
      INSERT INTO email_logs (outbox_id, to_email, template, status, error)
      VALUES (${row.id}, ${row.to_email}, ${row.template}, ${status}, ${error})
    `;
  } catch {
    // Audit writes never break the worker.
  }
}

export interface ProcessOutboxDeps {
  sql?: postgres.Sql;
  transport?: MailTransport;
  /** Injected for deterministic tests; defaults to env-derived. */
  mode?: "off" | "log" | "smtp";
  baseUrl?: string;
  from?: string;
  replyTo?: string;
  batchSize?: number;
  concurrency?: number;
  budgetMs?: number;
  staleLockSeconds?: number;
  rand?: () => number;
  /** Overrides env AUTH_SECRET for payload decryption (tests). */
  secret?: string;
}

export async function processOutbox(
  deps: ProcessOutboxDeps = {},
): Promise<OutboxCounts> {
  const env = getServerEnv();
  const mode = deps.mode ?? env.EMAIL_MODE;
  const counts: OutboxCounts = {
    claimed: 0,
    sent: 0,
    retried: 0,
    dead: 0,
    skipped: 0,
  };
  if (mode === "off") return counts; // never touches rows (spec §4.1)

  const sql = deps.sql ?? pool;
  const transport =
    deps.transport ??
    (mode === "log" || mode === "smtp" ? transportForCurrentMode() : null);
  if (!transport) return counts;

  const batchSize = deps.batchSize ?? env.EMAIL_BATCH_SIZE;
  const concurrency = deps.concurrency ?? env.EMAIL_CONCURRENCY;
  const budgetMs = deps.budgetMs ?? env.EMAIL_RUN_BUDGET_MS;
  const staleSecs = deps.staleLockSeconds ?? env.EMAIL_STALE_LOCK_SECONDS;
  const rand = deps.rand ?? Math.random;
  const secret = deps.secret ?? env.AUTH_SECRET;
  const deadline = Date.now() + budgetMs;

  const fromName = env.FROM_NAME ?? "GGCB Alumni Portal";
  const fromAddr = env.FROM_EMAIL ?? "no-reply@localhost";
  const from = deps.from ?? `${fromName} <${fromAddr}>`;
  const replyTo = deps.replyTo ?? env.REPLY_TO_EMAIL;
  const messageIdDomain = fromAddr.split("@")[1] ?? "localhost";
  const baseUrl = deps.baseUrl ?? emailBaseUrl();

  // 1. Recover stale locks first (lease expired on a dead worker).
  const recovered = await sql.unsafe(RECOVER_SQL, [staleSecs]);
  counts.skipped += recovered.length;

  // 2. Claim + send until empty or out of budget.
  while (Date.now() < deadline) {
    const claimed = await sql.unsafe<ClaimedRow[]>(CLAIM_SQL, [batchSize]);
    if (claimed.length === 0) break;
    counts.claimed += claimed.length;

    for (
      let i = 0;
      i < claimed.length && Date.now() < deadline;
      i += concurrency
    ) {
      const chunk = claimed.slice(i, i + concurrency);
      await Promise.all(
        chunk.map((row) =>
          deliverOne(row, {
            sql,
            transport,
            from,
            replyTo,
            baseUrl,
            messageIdDomain,
            rand,
            secret,
            counts,
          }),
        ),
      );
    }
    if (claimed.length < batchSize) break; // drained
  }
  return counts;
}

interface DeliverCtx {
  sql: postgres.Sql;
  transport: MailTransport;
  from: string;
  replyTo?: string;
  baseUrl: string;
  messageIdDomain: string;
  rand: () => number;
  secret: string;
  counts: OutboxCounts;
}

async function deliverOne(row: ClaimedRow, ctx: DeliverCtx): Promise<void> {
  const { sql, counts } = ctx;

  // 3a. Decrypt — undecryptable (key rotation/tamper) is PERMANENT.
  let payload: Record<string, unknown>;
  try {
    payload = decryptPayload(row.payload, ctx.secret);
  } catch {
    await sql`
      UPDATE email_outbox
      SET status = 'failed', attempts = max_attempts, locked_at = NULL,
          last_error = 'payload undecryptable (key rotated or tampered)'
      WHERE id = ${row.id}
    `;
    await logAttempt(sql, row, "failed", "payload undecryptable");
    counts.dead++;
    return;
  }

  // 3b. Render — unknown template/invalid payload is PERMANENT (bug).
  let subject: string, html: string, text: string;
  try {
    if (!isTemplateName(row.template)) throw new Error("unknown template");
    const tpl = TEMPLATES[row.template];
    const p = tpl.payloadSchema.parse(payload) as Record<string, unknown>;
    subject = tpl.subject(p);
    html = tpl.html(p, { baseUrl: ctx.baseUrl });
    text = tpl.text(p, { baseUrl: ctx.baseUrl });
  } catch (e) {
    const err = scrubError(e);
    await sql`
      UPDATE email_outbox
      SET status = 'failed', attempts = max_attempts, locked_at = NULL,
          last_error = ${`render: ${err}`}
      WHERE id = ${row.id}
    `;
    await logAttempt(sql, row, "failed", `render: ${err}`);
    counts.dead++;
    return;
  }

  // 3c. Send.
  try {
    await ctx.transport.sendMail({
      from: ctx.from,
      to: row.to_email,
      replyTo: ctx.replyTo,
      subject,
      text,
      html,
      headers: { "Message-ID": `<${row.id}@${ctx.messageIdDomain}>` },
    } as Parameters<MailTransport["sendMail"]>[0]);
    await sql`
      UPDATE email_outbox
      SET status = 'sent', sent_at = now(), locked_at = NULL,
          payload = NULL, last_error = NULL
      WHERE id = ${row.id}
    `;
    await logAttempt(sql, row, "sent", null);
    counts.sent++;
  } catch (e) {
    const err = scrubError(e);
    // Dead = status 'failed' AND attempts >= max_attempts (no enum value —
    // spec §4.2). A transient failure that used the last attempt is dead.
    if (
      classifySendError(e) === "permanent" ||
      row.attempts >= row.max_attempts
    ) {
      await sql`
        UPDATE email_outbox
        SET status = 'failed', attempts = max_attempts, locked_at = NULL,
            last_error = ${err}
        WHERE id = ${row.id}
      `;
      await logAttempt(sql, row, "failed", err);
      counts.dead++;
    } else {
      const delayMs = backoffMs(row.attempts, ctx.rand);
      await sql`
        UPDATE email_outbox
        SET status = 'failed', locked_at = NULL,
            next_attempt_at = now() + make_interval(secs => ${delayMs / 1000}),
            last_error = ${err}
        WHERE id = ${row.id}
      `;
      await logAttempt(sql, row, "failed", err);
      counts.retried++;
    }
  }
}

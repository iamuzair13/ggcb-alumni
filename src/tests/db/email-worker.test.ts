import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type postgres from "postgres";
import {
  closeTestConns,
  getAppSql,
  hasTestDb,
  setupTestDatabase,
} from "./helpers";
import { enqueueEmail } from "@/server/email/enqueue";
import { processOutbox } from "@/server/email/worker";
import type { MailTransport } from "@/server/email/transport";

const SECRET = "db-test-secret-".repeat(3);

/**
 * Worker state machine (spec §4.6/§7): SKIP LOCKED claiming under
 * concurrency, stale-lock recovery, backoff/dead transitions, payload
 * redaction, off-mode no-op. Fake transport counts sends — no network.
 */
describe.skipIf(!hasTestDb)("processOutbox worker", () => {
  let sql: postgres.Sql;
  beforeAll(async () => {
    await setupTestDatabase();
    sql = getAppSql();
  }, 60_000);
  afterAll(closeTestConns);

  function deps(over: Partial<Parameters<typeof processOutbox>[0]> = {}) {
    return {
      sql,
      mode: "smtp" as const,
      secret: SECRET,
      baseUrl: "https://alumni.example.test",
      batchSize: 20,
      concurrency: 4,
      budgetMs: 30_000,
      rand: () => 0.5,
      ...over,
    };
  }

  async function seedRow(to: string, note = "x") {
    const r = await enqueueEmail(
      { to, template: "smtp_test", payload: { note } },
      { secret: SECRET },
    );
    expect(r.status).toBe("queued");
    return to;
  }

  it("off mode returns zeros and NEVER touches rows", async () => {
    await seedRow(`off-${Date.now()}@t.test`);
    const counts = await processOutbox(deps({ mode: "off" }));
    expect(counts).toEqual({
      claimed: 0,
      sent: 0,
      retried: 0,
      dead: 0,
      skipped: 0,
    });
    const [row] =
      await sql`SELECT status FROM email_outbox WHERE to_email LIKE 'off-%'`;
    expect(row.status).toBe("pending");
    // clean up for other tests
    await sql`DELETE FROM email_outbox WHERE to_email LIKE 'off-%'`;
  });

  it("sends, marks sent, redacts payload, writes email_logs", async () => {
    const to = `send-${Date.now()}@t.test`;
    const sent: unknown[] = [];
    const transport: MailTransport = {
      sendMail: async (m) => {
        sent.push(m);
        return { messageId: "x" };
      },
    };
    const counts = await processOutbox(deps({ transport }));
    expect(counts.sent).toBeGreaterThanOrEqual(1);
    const [row] = await sql<
      { status: string; payload: unknown; last_error: unknown }[]
    >`
      SELECT status, payload, last_error FROM email_outbox WHERE to_email = ${to}`;
    expect(row.status).toBe("sent");
    expect(row.payload).toBeNull();
    expect(row.last_error).toBeNull();
    const logs =
      await sql`SELECT status FROM email_logs WHERE to_email = ${to}`;
    expect(logs.map((l) => l.status)).toContain("sent");
    const msg = sent[0] as {
      to: string;
      subject: string;
      headers?: Record<string, string>;
    };
    expect(msg.to).toBe(to);
    expect(msg.headers?.["Message-ID"]).toContain("@");
  });

  it("two concurrent workers never claim the same row", async () => {
    const to = `race-${Date.now()}@t.test`;
    for (let i = 0; i < 10; i++) await seedRow(`${i}-${to}`, "race");
    let sends = 0;
    const transport: MailTransport = {
      sendMail: async () => {
        sends++;
        return { messageId: "x" };
      },
    };
    const [a, b] = await Promise.all([
      processOutbox(deps({ transport })),
      processOutbox(deps({ transport })),
    ]);
    expect(sends).toBe(10); // exactly once each — no double send
    expect(a.sent + b.sent).toBe(10);
    const rows =
      await sql`SELECT status FROM email_outbox WHERE to_email LIKE '%-${to}'`;
    expect(rows.every((r) => r.status === "sent")).toBe(true);
  });

  it("stale 'sending' rows are recovered and retried", async () => {
    const to = `stale-${Date.now()}@t.test`;
    await seedRow(to);
    // Simulate a worker that died mid-claim (6-min-old lock).
    await sql`
      UPDATE email_outbox SET status = 'sending', locked_at = now() - interval '6 minutes'
      WHERE to_email = ${to}`;
    const transport: MailTransport = {
      sendMail: async () => ({ messageId: "x" }),
    };
    const counts = await processOutbox(
      deps({ transport, staleLockSeconds: 300 }),
    );
    expect(counts.skipped).toBeGreaterThanOrEqual(1); // stale recovered
    const [row] =
      await sql`SELECT status, attempts FROM email_outbox WHERE to_email = ${to}`;
    // Recovered row counted an attempt, then the send either completed or
    // sits failed for the next sweep — either way it isn't stuck 'sending'.
    expect(row.status).not.toBe("sending");
  });

  it("transient failures back off and go dead at max_attempts", async () => {
    const to = `retry-${Date.now()}@t.test`;
    await seedRow(to);
    const transport: MailTransport = {
      sendMail: async () => {
        const e = new Error("try later") as Error & { responseCode: number };
        e.responseCode = 421;
        throw e;
      },
    };
    const c1 = await processOutbox(deps({ transport }));
    expect(c1.retried).toBeGreaterThanOrEqual(1);
    let [row] = await sql<
      {
        status: string;
        attempts: number;
        max_attempts: number;
        next_attempt_at: Date;
      }[]
    >`
      SELECT status, attempts, max_attempts, next_attempt_at FROM email_outbox WHERE to_email = ${to}`;
    expect(row.status).toBe("failed");
    expect(row.attempts).toBe(1);
    expect(row.next_attempt_at.getTime()).toBeGreaterThan(Date.now() + 30_000); // ~1min+jitter

    // Force the remaining attempts to now and watch it die at max_attempts.
    for (let i = 0; i < 4; i++) {
      await sql`UPDATE email_outbox SET next_attempt_at = now() WHERE to_email = ${to}`;
      await processOutbox(deps({ transport }));
    }
    [row] =
      await sql`SELECT status, attempts, max_attempts FROM email_outbox WHERE to_email = ${to}`;
    expect(row.attempts).toBe(row.max_attempts);
    expect(row.status).toBe("failed");
    // Never claimed again.
    const c2 = await processOutbox(deps({ transport }));
    expect(c2.claimed).toBe(0);
  });

  it("permanent failures die on the first attempt", async () => {
    const to = `dead-${Date.now()}@t.test`;
    await seedRow(to);
    const transport: MailTransport = {
      sendMail: async () => {
        const e = new Error("user unknown") as Error & { responseCode: number };
        e.responseCode = 550;
        throw e;
      },
    };
    const counts = await processOutbox(deps({ transport }));
    expect(counts.dead).toBe(1);
    const [row] =
      await sql`SELECT status, attempts, max_attempts, last_error FROM email_outbox WHERE to_email = ${to}`;
    expect(row.attempts).toBe(row.max_attempts);
    expect(row.status).toBe("failed");
    expect(row.last_error).toContain("user unknown");
  });

  it("last_error is scrubbed — secrets never persist", async () => {
    const to = `scrub-${Date.now()}@t.test`;
    await seedRow(to);
    const transport: MailTransport = {
      sendMail: async () => {
        const e = new Error(
          "535 auth failed password=SUPERSECRET\nmore",
        ) as Error & { responseCode: number };
        e.responseCode = 421;
        throw e;
      },
    };
    await processOutbox(deps({ transport }));
    const [row] = await sql<{ last_error: string }[]>`
      SELECT last_error FROM email_outbox WHERE to_email = ${to}`;
    expect(row.last_error).not.toContain("SUPERSECRET");
    expect(row.last_error).toContain("[redacted]");
    expect(row.last_error.length).toBeLessThanOrEqual(500);
  });
});

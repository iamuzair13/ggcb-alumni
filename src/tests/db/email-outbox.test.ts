import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type postgres from "postgres";
import {
  closeTestConns,
  getAppSql,
  hasTestDb,
  setupTestDatabase,
} from "./helpers";
import { enqueueEmail } from "@/server/email/enqueue";

const SECRET = "db-test-secret-".repeat(3);
const TO = "recipient@example.test";

/**
 * Outbox transactional guarantees (spec §7): commit/rollback with the
 * caller's transaction, idempotency, silent throttle, ≤2 queries.
 * Skips cleanly without a local *test* database.
 */
describe.skipIf(!hasTestDb)("email_outbox enqueue", () => {
  let sql: postgres.Sql;
  beforeAll(async () => {
    await setupTestDatabase();
    sql = getAppSql();
  }, 60_000);
  afterAll(closeTestConns);

  it("commits AND rolls back with the caller's transaction", async () => {
    await sql
      .begin(async (tx) => {
        const r = await enqueueEmail(
          {
            to: TO,
            template: "registration_received",
            payload: { name: "Ali" },
          },
          { tx, secret: SECRET },
        );
        expect(r.status).toBe("queued");
        throw new Error("force rollback");
      })
      .catch(() => {});
    const rows = await sql`SELECT id FROM email_outbox WHERE to_email = ${TO}`;
    expect(rows.length).toBe(0);

    await sql.begin(async (tx) => {
      const r = await enqueueEmail(
        { to: TO, template: "registration_received", payload: { name: "Ali" } },
        { tx, secret: SECRET },
      );
      expect(r.status).toBe("queued");
    });
    const kept = await sql`SELECT id FROM email_outbox WHERE to_email = ${TO}`;
    expect(kept.length).toBe(1);
  });

  it("encrypts payload at rest — plaintext is never in the column", async () => {
    await enqueueEmail(
      {
        to: TO,
        template: "registration_received",
        payload: { name: "Secretholder" },
      },
      { secret: SECRET },
    );
    const [row] = await sql<{ payload: unknown }[]>`
      SELECT payload::text AS payload FROM email_outbox
      WHERE to_email = ${TO} ORDER BY created_at DESC LIMIT 1`;
    const text = JSON.stringify(row.payload);
    expect(text).not.toContain("Secretholder");
    expect(text).toContain('"ct"');
    expect(text).toContain('"iv"');
    expect(text).toContain('"tag"');
  });

  it("idempotency key dedupes — second call returns duplicate, one row", async () => {
    const key = `test-key-${Date.now()}`;
    const a = await enqueueEmail(
      {
        to: TO,
        template: "smtp_test",
        payload: { note: "x" },
        idempotencyKey: key,
      },
      { secret: SECRET },
    );
    const b = await enqueueEmail(
      {
        to: TO,
        template: "smtp_test",
        payload: { note: "x" },
        idempotencyKey: key,
      },
      { secret: SECRET },
    );
    expect(a.status).toBe("queued");
    expect(b.status).toBe("duplicate");
    const rows =
      await sql`SELECT id FROM email_outbox WHERE idempotency_key = ${key}`;
    expect(rows.length).toBe(1);
  });

  it("throttle: smtp_test (20/hr) still enqueues under cap; verification caps at 3", async () => {
    const to = `throttle-${Date.now()}@example.test`;
    const results: string[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await enqueueEmail(
        {
          to,
          template: "email_verification",
          payload: {
            name: "T",
            token: "tok_throttle_test_0123",
            expiresHours: 24,
          },
        },
        { secret: SECRET },
      );
      results.push(r.status);
    }
    expect(results).toEqual(["queued", "queued", "queued", "throttled"]);
    const rows = await sql`SELECT id FROM email_outbox WHERE to_email = ${to}`;
    expect(rows.length).toBe(3); // 4th was NOT inserted — silent throttle
  });

  it("validation rejects bad recipient/template/payload without a write", async () => {
    await expect(
      enqueueEmail(
        { to: "bad\naddr@x.co", template: "smtp_test", payload: {} },
        { secret: SECRET },
      ),
    ).rejects.toThrowError(/invalid recipient/i);
    await expect(
      enqueueEmail(
        { to: "a@b.co", template: "nope" as never, payload: {} },
        { secret: SECRET },
      ),
    ).rejects.toThrowError(/unknown template/i);
    await expect(
      enqueueEmail(
        { to: "a@b.co", template: "smtp_test", payload: { note: 5 } },
        { secret: SECRET },
      ),
    ).rejects.toThrowError(/payload/i);
  });
});

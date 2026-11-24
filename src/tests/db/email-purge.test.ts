import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type postgres from "postgres";
import {
  closeTestConns,
  getAppSql,
  hasTestDb,
  setupTestDatabase,
} from "./helpers";
import { runMaintenancePurge } from "@/server/email/purge";
import { recordAdminActivity, recordAdminActivitySafe } from "@/server/audit";

/**
 * Maintenance purge (spec §4.8): bounded deletes of exactly the intended
 * rows; audit/log tables are NEVER touched. Plus the §4.9 audit helpers.
 */
describe.skipIf(!hasTestDb)("maintenance purge + audit helpers", () => {
  let sql: postgres.Sql;
  beforeAll(async () => {
    await setupTestDatabase();
    sql = getAppSql();
  }, 60_000);
  afterAll(closeTestConns);

  it("deletes used/expired auth_tokens >7d, sent outbox >7d, dead outbox >30d — nothing else", async () => {
    // Seed one of each kind.
    const [u] = await sql<{ id: string }[]>`
      INSERT INTO users (email, password_hash, name, role, is_active)
      VALUES ('purge@test.local', 'x', 'P', 'viewer', true) RETURNING id`;
    await sql`
      INSERT INTO auth_tokens (user_id, type, token_hash, expires_at, used_at, created_at)
      VALUES
        (${u.id}, 'password_reset', ${"a".repeat(64)}, now() - interval '8 days', now() - interval '8 days', now() - interval '8 days'),
        (${u.id}, 'password_reset', ${"b".repeat(64)}, now() + interval '1 day', NULL, now()),
        (${u.id}, 'password_reset', ${"c".repeat(64)}, now() - interval '8 days', NULL, now() - interval '8 days')`;
    await sql`
      INSERT INTO email_outbox (to_email, template, status, attempts, max_attempts, sent_at, updated_at, created_at)
      VALUES
        ('s@t.test', 'smtp_test', 'sent', 1, 5, now() - interval '8 days', now() - interval '8 days', now() - interval '8 days'),
        ('d@t.test', 'smtp_test', 'failed', 5, 5, NULL, now() - interval '31 days', now() - interval '31 days'),
        ('f@t.test', 'smtp_test', 'failed', 2, 5, NULL, now() - interval '31 days', now() - interval '31 days'),
        ('n@t.test', 'smtp_test', 'sent', 1, 5, now() - interval '2 days', now() - interval '2 days', now() - interval '2 days')`;
    await sql`INSERT INTO auth_attempts (kind, key_hash, succeeded, attempted_at)
      VALUES ('login', ${"d".repeat(64)}, false, now() - interval '2 days')`;

    const counts = await runMaintenancePurge(sql);

    expect(counts.authAttempts).toBe(1);
    expect(counts.authTokens).toBe(2); // used + expired, both old
    expect(counts.outboxSent).toBe(1); // only the 8-day-old 'sent'
    expect(counts.outboxDead).toBe(1); // only attempts>=max AND old

    const remaining =
      await sql`SELECT to_email, status FROM email_outbox ORDER BY to_email`;
    expect(remaining.map((r) => r.to_email)).toEqual(["f@t.test", "n@t.test"]);

    // Audit tables untouched (empty + still insertable).
    const logs = await sql`SELECT count(*)::int AS n FROM login_logs`;
    expect(logs[0].n).toBe(0);
  });

  it("recordAdminActivity: in-transaction mode + sanitized metadata", async () => {
    const [u] = await sql<{ id: string }[]>`
      SELECT id FROM users WHERE email = 'purge@test.local'`;
    await sql.begin(async (tx) => {
      await recordAdminActivity(
        {
          actorUserId: u.id,
          action: "admin.user_created",
          entityType: "user",
          entityId: u.id,
          metadata: { note: "ok", password: "GONE", nested: { token: "GONE" } },
        },
        { tx },
      );
    });
    const [row] = await sql<{ metadata: Record<string, unknown> }[]>`
      SELECT metadata FROM admin_activity_logs WHERE actor_user_id = ${u.id} LIMIT 1`;
    const j = JSON.stringify(row.metadata);
    expect(j).not.toContain("GONE");
    expect(j).toContain('"note":"ok"');
  });

  it("best-effort mode swallows failures", async () => {
    // A bad FK would throw in-tx; safe mode must swallow.
    await expect(
      recordAdminActivitySafe({
        actorUserId: "00000000-0000-0000-0000-000000000000",
        action: "admin.user_created",
      }),
    ).resolves.toBeUndefined();
  });
});

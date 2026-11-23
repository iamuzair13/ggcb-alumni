import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { seedSuperadmin } from "../../../scripts/lib/seed";
import { closeTestConns, createFreshDb, dropDb, hasTestDb } from "./helpers";
import { runMigrations } from "../../../scripts/lib/runner";

describe.skipIf(!hasTestDb)("superadmin seed (real postgres)", () => {
  const dbs: postgres.Sql[] = [];
  const names: string[] = [];

  async function seededDb(name: string) {
    const sql = await createFreshDb(name);
    dbs.push(sql);
    names.push(name);
    await runMigrations(sql);
    return sql;
  }

  afterAll(async () => {
    await Promise.all(dbs.map((s) => s.end().catch(() => {})));
    await Promise.all(names.map((n) => dropDb(n).catch(() => {})));
    await closeTestConns();
  });

  it("creates a password-less superadmin and an audit row; is idempotent", async () => {
    const sql = await seededDb("ggcb_test_seed_main");
    const first = await seedSuperadmin(sql, {
      email: "Admin@Test.com",
      name: "Root Admin",
      allowAdditional: false,
    });
    expect(first.outcome).toBe("created");

    const [user] = await sql<
      {
        password_hash: string | null;
        role: string;
        email_verified_at: Date | null;
      }[]
    >`
      SELECT password_hash, role::text, email_verified_at FROM users WHERE email = 'admin@test.com'
    `;
    expect(user.role).toBe("superadmin");
    expect(user.password_hash).toBeNull();
    expect(user.email_verified_at).not.toBeNull();

    const logs = await sql`
      SELECT id FROM admin_activity_logs WHERE action = 'seed.superadmin'
    `;
    expect(logs.length).toBe(1);

    const second = await seedSuperadmin(sql, {
      email: "admin@test.com",
      name: "Ignored",
      allowAdditional: false,
    });
    expect(second.outcome).toBe("already-exists");
    const count =
      await sql`SELECT count(*)::int AS n FROM users WHERE email = 'admin@test.com'`;
    expect(count[0].n).toBe(1);
  });

  it("never escalates an existing non-superadmin user", async () => {
    const sql = await seededDb("ggcb_test_seed_noesc");
    await sql`INSERT INTO users (email, name, role) VALUES ('staff@test.com', 'Staff', 'viewer')`;
    const result = await seedSuperadmin(sql, {
      email: "staff@test.com",
      name: "Sneaky",
      allowAdditional: false,
    });
    expect(result.outcome).toBe("already-exists");
    const [u] =
      await sql`SELECT role::text AS role FROM users WHERE email = 'staff@test.com'`;
    expect(u.role).toBe("viewer");
  });

  it("blocks a second superadmin unless --allow-additional", async () => {
    const sql = await seededDb("ggcb_test_seed_second");
    await seedSuperadmin(sql, {
      email: "one@test.com",
      name: "One",
      allowAdditional: false,
    });
    const blocked = await seedSuperadmin(sql, {
      email: "two@test.com",
      name: "Two",
      allowAdditional: false,
    });
    expect(blocked.outcome).toBe("blocked");
    const allowed = await seedSuperadmin(sql, {
      email: "two@test.com",
      name: "Two",
      allowAdditional: true,
    });
    expect(allowed.outcome).toBe("created");
  });

  it("rejects invalid input", async () => {
    const sql = await seededDb("ggcb_test_seed_bad");
    await expect(
      seedSuperadmin(sql, {
        email: "not-an-email",
        name: "X",
        allowAdditional: false,
      }),
    ).rejects.toThrow(/valid email/);
    await expect(
      seedSuperadmin(sql, {
        email: "a@b.c",
        name: "  ",
        allowAdditional: false,
      }),
    ).rejects.toThrow(/non-empty/);
  });
});

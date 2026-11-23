import {
  mkdtempSync,
  readdirSync,
  copyFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type postgres from "postgres";
import { runMigrations } from "../../../scripts/lib/runner";
import { runVerify } from "../../../scripts/lib/verify";
import {
  asRole,
  closeTestConns,
  createFreshDb,
  dropDb,
  getAppSql,
  getDirectSql,
  hasTestDb,
} from "./helpers";

const MIGRATIONS = join(process.cwd(), "migrations");

describe.skipIf(!hasTestDb)("security baseline (real postgres)", () => {
  afterAll(() => closeTestConns());

  it("db:verify passes on the real schema", async () => {
    expect(await runVerify(getDirectSql())).toEqual([]);
  });

  it("every public table has RLS enabled", async () => {
    const rows = await getDirectSql()<
      { relname: string; relrowsecurity: boolean }[]
    >`
      SELECT c.relname, c.relrowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
    `;
    expect(rows.length).toBeGreaterThanOrEqual(11);
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
  });

  it("anon/authenticated cannot read or write anything (NOLOGIN roles, SET ROLE)", async () => {
    const sql = getDirectSql();
    for (const role of ["anon", "authenticated"]) {
      await asRole(sql, role, async () => {
        await expect(sql`SELECT id FROM users LIMIT 1`).rejects.toThrow();
        await expect(
          sql`INSERT INTO departments (name, code) VALUES ('x', 'x')`,
        ).rejects.toThrow();
        await expect(
          sql`SELECT nextval('auth_attempts_id_seq')`,
        ).rejects.toThrow();
        await expect(sql`SELECT public.set_updated_at()`).rejects.toThrow();
      });
    }
  });

  it("ggcb_app can perform only its granted operations", async () => {
    const app = getAppSql();
    // granted: SELECT/INSERT/UPDATE on users
    await app`SELECT id FROM users LIMIT 1`;
    const [u] = await app<{ id: string }[]>`
      INSERT INTO users (email, name, role) VALUES ('app@test.com', 'App', 'viewer') RETURNING id
    `;
    await app`UPDATE users SET name = 'App2' WHERE id = ${u.id}`;
    // not granted: DELETE on users, INSERT on applied_migrations
    await expect(app`DELETE FROM users WHERE id = ${u.id}`).rejects.toThrow();
    await expect(
      app`INSERT INTO applied_migrations (id, name, checksum) VALUES (999, 'x', 'x')`,
    ).rejects.toThrow();
    // no DDL, no TRUNCATE, audit tables read-only
    await expect(app.unsafe("CREATE TABLE nope (id int)")).rejects.toThrow();
    await expect(app.unsafe("TRUNCATE users")).rejects.toThrow();
    await expect(
      app.unsafe("UPDATE email_logs SET status = 'x'"),
    ).rejects.toThrow();
    await expect(app.unsafe("DELETE FROM email_logs")).rejects.toThrow();
  });

  it("ggcb_app can append to audit tables and SELECT the ledger", async () => {
    const app = getAppSql();
    await app`SELECT id FROM applied_migrations LIMIT 1`;
    await app`
      INSERT INTO admin_activity_logs (action, entity_type)
      VALUES ('test.audit-write', 'test')
    `;
    await app`
      INSERT INTO login_logs (email_attempted, success)
      VALUES ('a@b.c', false)
    `;
    await app`
      INSERT INTO email_logs (to_email, template, status)
      VALUES ('a@b.c', 'test', 'sent')
    `;
  });

  it("a scratch table without the RLS/grant boilerplate fails db:verify", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ggcb-migrations-bad-"));
    const dbName = "ggcb_test_verify_negative";
    let sql: postgres.Sql | undefined;
    try {
      for (const f of readdirSync(MIGRATIONS).filter((f) =>
        f.endsWith(".sql"),
      )) {
        copyFileSync(join(MIGRATIONS, f), join(dir, f));
      }
      writeFileSync(
        join(dir, "0007_unprotected_table.sql"),
        "CREATE TABLE unprotected (id int);",
      );
      sql = await createFreshDb(dbName);
      await sql.unsafe(`
        DO $do$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
        END $do$;
      `);
      await runMigrations(sql, dir);
      const failures = await runVerify(sql);
      expect(failures.some((f) => f.includes("unprotected"))).toBe(true);
    } finally {
      await sql?.end().catch(() => {});
      await dropDb(dbName).catch(() => {});
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

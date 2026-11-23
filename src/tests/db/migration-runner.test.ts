import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  readdirSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import {
  listMigrationFiles,
  migrationStatus,
  runMigrations,
  scriptSql,
} from "../../../scripts/lib/runner";
import { assertMigrationTarget } from "../../../scripts/lib/safety";
import {
  createFreshDb,
  dropDb,
  hasTestDb,
  scratchDatabaseUrl,
} from "./helpers";

const MIGRATIONS = join(process.cwd(), "migrations");

/** Copy the real migrations dir into a temp dir the test may mangle. */
function tempMigrationsDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "ggcb-migrations-"));
  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql"))) {
    copyFileSync(join(MIGRATIONS, f), join(dir, f));
  }
  return dir;
}

describe.skipIf(!hasTestDb)("migration runner (real postgres)", () => {
  const created: postgres.Sql[] = [];
  const scratch: string[] = [];

  async function freshDb(name: string) {
    const sql = await createFreshDb(name);
    created.push(sql);
    scratch.push(name);
    return sql;
  }

  afterAll(async () => {
    await Promise.all(created.map((s) => s.end().catch(() => {})));
    await Promise.all(scratch.map((d) => dropDb(d).catch(() => {})));
  });

  it("applies all migrations cleanly on an empty database", async () => {
    const sql = await freshDb("ggcb_test_runner_clean");
    const { applied, alreadyApplied } = await runMigrations(sql);
    const files = listMigrationFiles();
    expect(applied).toEqual(files.map((f) => f.name));
    expect(alreadyApplied).toBe(0);
    const ledger = await sql`SELECT count(*)::int AS n FROM applied_migrations`;
    expect(ledger[0].n).toBe(files.length);
  });

  it("is a no-op on the second run and reports correct status", async () => {
    const sql = await freshDb("ggcb_test_runner_idem");
    await runMigrations(sql);
    const second = await runMigrations(sql);
    expect(second.applied).toEqual([]);
    const { applied, pending } = await migrationStatus(sql);
    expect(applied.length).toBe(listMigrationFiles().length);
    expect(pending).toEqual([]);
  });

  it("detects a checksum change on an already-applied file", async () => {
    const sql = await freshDb("ggcb_test_runner_tamper");
    const dir = tempMigrationsDir();
    try {
      await runMigrations(sql, dir);
      const first = join(dir, "0001_extensions_and_helpers.sql");
      writeFileSync(first, readFileSync(first, "utf8") + "\n-- tampered\n");
      await expect(runMigrations(sql, dir)).rejects.toThrow(/checksum/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails on numbering gaps and duplicates before touching the database", async () => {
    const gapDir = mkdtempSync(join(tmpdir(), "ggcb-migrations-gap-"));
    try {
      writeFileSync(join(gapDir, "0001_one.sql"), "SELECT 1;");
      writeFileSync(join(gapDir, "0003_three.sql"), "SELECT 1;");
      expect(() => listMigrationFiles(gapDir)).toThrow(/contiguous/);

      writeFileSync(join(gapDir, "0002_two.sql"), "SELECT 1;");
      writeFileSync(join(gapDir, "0002_dup.sql"), "SELECT 1;");
      expect(() => listMigrationFiles(gapDir)).toThrow(/contiguous/);
    } finally {
      rmSync(gapDir, { recursive: true, force: true });
    }
  });

  it("serialises concurrent runners via the advisory lock", async () => {
    const sqlA = await freshDb("ggcb_test_runner_lock");
    const sqlB = scriptSql(scratchDatabaseUrl("ggcb_test_runner_lock"));
    created.push(sqlB);
    const [a, b] = await Promise.all([
      runMigrations(sqlA),
      runMigrations(sqlB),
    ]);
    // One runner applied them; the other found nothing pending.
    expect(a.applied.length + b.applied.length).toBe(
      listMigrationFiles().length,
    );
    const ledger =
      await sqlA`SELECT count(*)::int AS n FROM applied_migrations`;
    expect(ledger[0].n).toBe(listMigrationFiles().length);
  });

  it("refuses non-local targets without MIGRATE_CONFIRM", () => {
    expect(() =>
      assertMigrationTarget(
        "postgresql://postgres:pw@db.abcdef.supabase.co:5432/postgres",
        undefined,
      ),
    ).toThrow(/non-local host/);
    expect(() =>
      assertMigrationTarget(
        "postgresql://postgres:pw@db.abcdef.supabase.co:5432/postgres",
        "yes",
      ),
    ).not.toThrow();
  });
});

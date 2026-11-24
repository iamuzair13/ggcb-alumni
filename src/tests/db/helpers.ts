/**
 * Shared helpers for the real-Postgres suite. Every spec skips cleanly when
 * TEST_DIRECT_URL is unset — CI provides it via the postgres service
 * container; locally it points at the docker-compose database (or any local
 * PG whose name contains "test").
 */
import postgres from "postgres";
import { loadEnvFiles } from "../../../scripts/lib/env";
import { runMigrations, scriptSql } from "../../../scripts/lib/runner";
import { assertTestDatabase, parseDbUrl } from "../../../scripts/lib/safety";

loadEnvFiles();

export const TEST_DIRECT_URL = process.env.TEST_DIRECT_URL ?? "";
export const hasTestDb = TEST_DIRECT_URL !== "";

export const GGCB_TEST_PASSWORD = "ggcb_test_password";

/** app-role URL: TEST_DATABASE_URL if set, else derived from DIRECT with ggcb_app creds. */
export function appDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const u = new URL(TEST_DIRECT_URL);
  u.username = "ggcb_app";
  u.password = GGCB_TEST_PASSWORD;
  return u.toString();
}

/** Admin connection to the maintenance `postgres` database (drop/create). */
export function adminSql(): postgres.Sql {
  const u = new URL(TEST_DIRECT_URL);
  u.pathname = "/postgres";
  return postgres(u.toString(), { max: 1, prepare: false, onnotice: () => {} });
}

/** Fresh database + full migration run + test-only role setup. */
export async function setupTestDatabase(
  url: string = TEST_DIRECT_URL,
): Promise<postgres.Sql> {
  assertTestDatabase(url);
  const { database } = parseDbUrl(url);
  const admin = adminSql();
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE "${database}"`);
  } finally {
    await admin.end();
  }
  const direct = scriptSql(url);
  // Supabase-mimic roles must exist BEFORE the security baseline runs so the
  // guarded revokes are exercised (they are NOLOGIN — connectable only via SET ROLE).
  await direct.unsafe(`
    DO $do$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
    END $do$;
  `);
  await runMigrations(direct);
  // Test-only credential for the runtime role — migrations never set it.
  await direct`ALTER ROLE ggcb_app LOGIN PASSWORD ${GGCB_TEST_PASSWORD}`;
  return direct;
}

let direct: postgres.Sql | undefined;
let app: postgres.Sql | undefined;

export function getDirectSql(): postgres.Sql {
  if (!direct) direct = scriptSql(TEST_DIRECT_URL);
  return direct;
}

export function getAppSql(): postgres.Sql {
  if (!app) {
    app = postgres(appDatabaseUrl(), {
      max: 1,
      prepare: false,
      onnotice: () => {},
    });
  }
  return app;
}

export async function closeTestConns(): Promise<void> {
  await direct?.end();
  await app?.end();
  direct = app = undefined;
}

/** A scratch-database URL (same server, different db name containing "test"). */
export function scratchDatabaseUrl(name: string): string {
  const u = new URL(TEST_DIRECT_URL);
  u.pathname = `/${name}`;
  return u.toString();
}

/** Create a fresh, empty database; returns a connected admin sql handle. */
export async function createFreshDb(name: string): Promise<postgres.Sql> {
  const url = scratchDatabaseUrl(name);
  assertTestDatabase(url);
  const admin = adminSql();
  await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  await admin.end();
  return scriptSql(url);
}

export async function dropDb(name: string): Promise<void> {
  const admin = adminSql();
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  } finally {
    await admin.end();
  }
}

/** Run `fn` as another role inside one transaction (works for NOLOGIN roles). */
export async function asRole<T>(
  sql: postgres.Sql,
  role: string,
  fn: () => Promise<T>,
): Promise<T> {
  await sql.unsafe(`SET ROLE "${role}"`);
  try {
    return await fn();
  } finally {
    await sql.unsafe("RESET ROLE");
  }
}

import { hasTestDb, setupTestDatabase, closeTestConns } from "./helpers";

/**
 * One fresh database per test run: drop/create, create the Supabase-mimic
 * roles, apply every migration through the real runner, give ggcb_app its
 * test-only login.
 */
export default async function globalSetup() {
  if (!hasTestDb) {
    console.warn(
      "[test:db] TEST_DIRECT_URL not set — all db tests will be skipped " +
        "(point it at a local database whose name contains 'test').",
    );
    return;
  }
  const sql = await setupTestDatabase();
  await sql.end();
  await closeTestConns();
}

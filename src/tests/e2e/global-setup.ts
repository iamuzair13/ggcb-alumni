/**
 * Playwright global setup — when TEST_DIRECT_URL points at a local *test*
 * database (CI e2e job, or local docker), run the full migration suite
 * once so the app under test and the personas share a real schema.
 * Skips cleanly otherwise.
 */
import { loadEnvFiles } from "../../../scripts/lib/env";
import { hasTestDb, setupTestDatabase } from "../db/helpers";

export default async function globalSetup() {
  loadEnvFiles();
  if (!hasTestDb) return;
  const sql = await setupTestDatabase();
  await sql.end();
}

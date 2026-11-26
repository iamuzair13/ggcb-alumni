/**
 * Safety interlocks for any script that can mutate or destroy data.
 * Thin wrappers over the pure helpers in src/lib/db-url.ts —
 * unit-tested without a database.
 */
import {
  describeDbTarget,
  isLocalDbHost,
  parseDbUrl,
} from "../../src/lib/db-url";

export { describeDbTarget as describeTarget, isLocalDbHost, parseDbUrl };

/**
 * Migrations may only run unguarded against local targets. Anything else
 * needs an explicit `MIGRATE_CONFIRM=yes`.
 */
export function assertMigrationTarget(
  url: string,
  confirm: string | undefined,
): void {
  const { hostname } = parseDbUrl(url);
  if (!isLocalDbHost(hostname) && confirm !== "yes") {
    throw new Error(
      `Refusing to migrate non-local host "${hostname}". ` +
        "Set MIGRATE_CONFIRM=yes to acknowledge the target.",
    );
  }
}

/**
 * Test setup, db:explain and anything that drops/truncates/creates data must
 * run against a local database whose name contains "test".
 */
export function assertTestDatabase(url: string): void {
  const { hostname, database } = parseDbUrl(url);
  if (!isLocalDbHost(hostname)) {
    throw new Error(
      `Refusing destructive/test operations on non-local host "${hostname}".`,
    );
  }
  if (!database.toLowerCase().includes("test")) {
    throw new Error(
      `Refusing destructive/test operations on database "${database}" — ` +
        'the database name must contain "test".',
    );
  }
}

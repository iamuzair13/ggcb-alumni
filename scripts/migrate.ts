import { loadEnvFiles, requireEnv } from "./lib/env";
import { assertMigrationTarget, describeTarget } from "./lib/safety";
import { runMigrations, scriptSql } from "./lib/runner";

async function main() {
  loadEnvFiles();
  const url = requireEnv("DIRECT_URL");
  assertMigrationTarget(url, process.env.MIGRATE_CONFIRM);
  console.log(`[db:migrate] target: ${describeTarget(url)}`);
  const sql = scriptSql(url);
  try {
    const { applied, alreadyApplied } = await runMigrations(sql);
    if (applied.length === 0) {
      console.log(
        `[db:migrate] nothing to do (${alreadyApplied} already applied)`,
      );
    } else {
      for (const name of applied) console.log(`[db:migrate] applied ${name}`);
      console.log(
        `[db:migrate] done — ${applied.length} applied, ${alreadyApplied + applied.length} total`,
      );
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(`[db:migrate] ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});

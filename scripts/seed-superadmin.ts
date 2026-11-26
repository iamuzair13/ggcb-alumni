import { loadEnvFiles, requireEnv } from "./lib/env";
import { assertMigrationTarget, describeTarget } from "./lib/safety";
import { scriptSql } from "./lib/runner";
import { seedSuperadmin } from "./lib/seed";

async function main() {
  loadEnvFiles();
  const url = requireEnv("DIRECT_URL");
  assertMigrationTarget(url, process.env.MIGRATE_CONFIRM);
  const email = requireEnv("SEED_SUPERADMIN_EMAIL");
  const name = requireEnv("SEED_SUPERADMIN_NAME");
  const allowAdditional = process.argv.includes("--allow-additional");

  console.log(`[db:seed:superadmin] target: ${describeTarget(url)}`);
  const sql = scriptSql(url);
  try {
    const result = await seedSuperadmin(sql, { email, name, allowAdditional });
    console.log(`[db:seed:superadmin] ${result.message}`);
    if (result.outcome === "blocked") process.exit(1);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(
    `[db:seed:superadmin] ${err instanceof Error ? err.message : err}`,
  );
  process.exit(1);
});

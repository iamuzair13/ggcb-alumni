import { loadEnvFiles, requireEnv } from "./lib/env";
import { describeTarget } from "./lib/safety";
import { migrationStatus, scriptSql } from "./lib/runner";

async function main() {
  loadEnvFiles();
  const url = requireEnv("DIRECT_URL");
  console.log(`[db:status] target: ${describeTarget(url)}`);
  const sql = scriptSql(url);
  try {
    const { applied, pending } = await migrationStatus(sql);
    console.log(`\napplied (${applied.length}):`);
    for (const m of applied) {
      console.log(
        `  ${m.name}  ${m.checksum.slice(0, 12)}…  ${m.applied_at.toISOString()}`,
      );
    }
    console.log(`\npending (${pending.length}):`);
    for (const f of pending) {
      console.log(`  ${f.name}  ${f.checksum.slice(0, 12)}…`);
    }
    if (pending.length > 0) process.exitCode = 2;
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(`[db:status] ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});

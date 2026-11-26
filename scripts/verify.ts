import { loadEnvFiles, requireEnv } from "./lib/env";
import { describeTarget } from "./lib/safety";
import { scriptSql } from "./lib/runner";
import { runVerify } from "./lib/verify";

async function main() {
  loadEnvFiles();
  const url = requireEnv("DIRECT_URL");
  console.log(`[db:verify] target: ${describeTarget(url)}`);
  const sql = scriptSql(url);
  try {
    const failures = await runVerify(sql);
    if (failures.length === 0) {
      console.log("[db:verify] all security checks passed");
      return;
    }
    console.error(`[db:verify] ${failures.length} failure(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(`[db:verify] ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});

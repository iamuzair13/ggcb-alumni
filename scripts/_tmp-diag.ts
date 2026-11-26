import { loadEnvFiles, requireEnv } from "./lib/env";
import { createDbClient } from "../src/server/db/connection";
import { hashPassword } from "../src/server/auth/password";

async function main() {
  loadEnvFiles();
  const off = process.argv.includes("--off");
  const sql = createDbClient(requireEnv("DIRECT_URL"), { max: 1 });
  try {
    const hash = off ? null : await hashPassword("Diag-Temp-2026!");
    const [u] = await sql`
      UPDATE users
      SET is_active = ${!off}, password_hash = ${hash},
          email_verified_at = ${off ? null : new Date().toISOString()}
      WHERE email = 'dev-diag@ggcb.test' RETURNING id
    `;
    console.log(
      `diag user ${off ? "deactivated" : "activated"}:`,
      u?.id ?? "NONE",
    );
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

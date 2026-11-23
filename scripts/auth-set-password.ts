/**
 * auth:set-password — owner CLI for rotating a user's password.
 *
 *   pnpm auth:set-password -- --email <email>
 *
 * - Reads the new password from a HIDDEN interactive prompt only — never
 *   from argv/env/files; refuses to run non-interactively.
 * - Applies the shared password policy, hashes with argon2id, updates
 *   password_hash, sets email_verified_at if null, bumps session_version
 *   (invalidating outstanding sessions), writes an admin_activity_logs row.
 * - Uses DIRECT_URL; prints the target host only; requires
 *   MIGRATE_CONFIRM=yes for non-local hosts (same convention as the runner).
 */
import postgres from "postgres";
import readline from "node:readline";
import { loadEnvFiles, requireEnv } from "./lib/env";
import { assertMigrationTarget, describeTarget } from "./lib/safety";
import {
  hashPassword,
  validatePasswordPolicy,
} from "../src/server/auth/password";

function parseArgs(argv: string[]): { email: string } {
  const email = argv[argv.indexOf("--email") + 1];
  if (!argv.includes("--email") || !email || email.startsWith("--")) {
    console.error("usage: pnpm auth:set-password -- --email <email>");
    process.exit(2);
  }
  return { email: email.trim().toLowerCase() };
}

/** Hidden prompt — chars are not echoed (muting _writeToOutput). */
function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput =
      (s: string) => {
        if (s.includes(prompt)) process.stdout.write(prompt);
      };
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  loadEnvFiles();
  const { email } = parseArgs(process.argv.slice(2));
  if (!process.stdin.isTTY) {
    throw new Error(
      "This command requires an interactive terminal — the password is only ever read from a hidden prompt.",
    );
  }

  const url = requireEnv("DIRECT_URL");
  assertMigrationTarget(url, process.env.MIGRATE_CONFIRM);
  console.log(`[auth:set-password] target: ${describeTarget(url)}`);
  console.log(`[auth:set-password] account: ${email}`);

  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    const [user] = await sql<
      { id: string; name: string; email: string; is_active: boolean }[]
    >`
      SELECT id, name, email::text, is_active FROM users WHERE email = ${email}
    `;
    if (!user) throw new Error(`No user with email ${email}`);
    if (!user.is_active)
      console.warn("[warn] user is inactive — password will be set anyway");

    const password = await readHidden("New password: ");
    const confirm = await readHidden("Confirm password: ");
    if (password !== confirm) throw new Error("Passwords do not match.");

    const policy = validatePasswordPolicy(password, {
      email: user.email,
      name: user.name,
    });
    if (!policy.ok) throw new Error(`Password rejected — ${policy.reason}`);

    const hash = await hashPassword(password);
    await sql.begin(async (tx) => {
      await tx`
        UPDATE users
        SET password_hash = ${hash},
            email_verified_at = COALESCE(email_verified_at, now()),
            session_version = session_version + 1
        WHERE id = ${user.id}
      `;
      await tx`
        INSERT INTO admin_activity_logs (actor_user_id, action, entity_type, entity_id, metadata)
        VALUES (${user.id}, 'auth.set_password_cli', 'users', ${user.id},
                '{"actor":"cli"}'::jsonb)
      `;
    });
    console.log(
      `[auth:set-password] done — password updated, email_verified_at ensured, session_version bumped for ${user.email}`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(
    `[auth:set-password] failed: ${e instanceof Error ? e.message : e}`,
  );
  process.exit(1);
});

/**
 * E2E persona provisioning — writes DIRECTLY to the test database via
 * postgres.js (never an HTTP back door, never present in production).
 * Enabled only when E2E_AUTH=1 AND TEST_DIRECT_URL points at a LOCAL
 * *test* database (same interlock as the vitest db suite).
 */
import postgres from "postgres";
import { loadEnvFiles } from "../../../../scripts/lib/env";
import { assertTestDatabase } from "../../../../scripts/lib/safety";
import { hashPassword } from "@/server/auth/password";

loadEnvFiles();

export const E2E_PASSWORD = "e2e-persona-password!";
export const E2E_EMAILS = {
  superadmin: "e2e.sa@test.local",
  admin: "e2e.admin@test.local",
  viewer: "e2e.viewer@test.local",
  alumniVerified: "e2e.av@test.local",
  alumniPending: "e2e.ap@test.local",
} as const;

export const hasE2eAuthDb = (() => {
  if (process.env.E2E_AUTH !== "1" || !process.env.TEST_DIRECT_URL)
    return false;
  try {
    assertTestDatabase(process.env.TEST_DIRECT_URL);
    return true;
  } catch {
    return false;
  }
})();

export async function provisionE2ePersonas(): Promise<void> {
  const sql = postgres(process.env.TEST_DIRECT_URL!, {
    max: 1,
    prepare: false,
  });
  try {
    const emails = Object.values(E2E_EMAILS);
    await sql`DELETE FROM alumni WHERE email = ANY(${emails})`;
    await sql`DELETE FROM users WHERE email = ANY(${emails})`;
    const hash = await hashPassword(E2E_PASSWORD);
    const [dept] = await sql<{ id: string }[]>`
      INSERT INTO departments (name, code) VALUES ('E2E Dept', 'E2E')
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`;
    const specs = [
      {
        email: E2E_EMAILS.superadmin,
        name: "E2E Superadmin",
        role: "superadmin",
        vs: null,
      },
      { email: E2E_EMAILS.admin, name: "E2E Admin", role: "admin", vs: null },
      {
        email: E2E_EMAILS.viewer,
        name: "E2E Viewer",
        role: "viewer",
        vs: null,
      },
      {
        email: E2E_EMAILS.alumniVerified,
        name: "E2E Verified Alumni",
        role: "alumni",
        vs: "verified",
      },
      {
        email: E2E_EMAILS.alumniPending,
        name: "E2E Pending Alumni",
        role: "alumni",
        vs: "under_approval",
      },
    ] as const;
    for (const s of specs) {
      const [u] = await sql<{ id: string }[]>`
        INSERT INTO users (email, password_hash, name, role, is_active, email_verified_at)
        VALUES (${s.email}, ${hash}, ${s.name}, ${s.role}, true, now()) RETURNING id`;
      if (s.vs) {
        await sql`
          INSERT INTO alumni (user_id, roll_number, full_name, email, verify_status, datasource, department_id, verified_at)
          VALUES (${u.id}, ${`E2E-${s.role}-${s.vs}`}, ${s.name}, ${s.email}, ${s.vs}, 'registration', ${dept.id}, ${s.vs === "verified" ? new Date().toISOString() : null})`;
      }
    }
  } finally {
    await sql.end();
  }
}

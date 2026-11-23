/**
 * Test personas for the auth suites — written DIRECTLY to the test
 * database (never an HTTP back door). The interlock (assertTestDatabase in
 * helpers) guarantees this only runs against a local *test* database.
 */
import type postgres from "postgres";
import { hashPassword } from "@/server/auth/password";
import type { Role } from "@/lib/constants/roles";

export const PERSONA_PASSWORD = "p3rsona-t3st-passw0rd!"; // ≥10 chars, not blocklisted

export interface PersonaSpec {
  email: string;
  name: string;
  role: Role;
  isActive?: boolean;
  emailVerified?: boolean;
  /** Insert an alumni row for this user (needed for requireAlumni paths). */
  verifyStatus?: "under_approval" | "verified" | "rejected";
}

export const PERSONAS: Record<string, PersonaSpec> = {
  superadmin: {
    email: "sa@e2e.test",
    name: "SA",
    role: "superadmin",
    emailVerified: true,
  },
  admin: {
    email: "admin@e2e.test",
    name: "Admin",
    role: "admin",
    emailVerified: true,
  },
  viewer: {
    email: "viewer@e2e.test",
    name: "Viewer",
    role: "viewer",
    emailVerified: true,
  },
  alumniVerified: {
    email: "alumni.v@e2e.test",
    name: "Alumni V",
    role: "alumni",
    emailVerified: true,
    verifyStatus: "verified",
  },
  alumniPending: {
    email: "alumni.p@e2e.test",
    name: "Alumni P",
    role: "alumni",
    emailVerified: true,
    verifyStatus: "under_approval",
  },
  unverified: {
    email: "unv@e2e.test",
    name: "Unv",
    role: "alumni",
    emailVerified: false,
  },
  inactive: {
    email: "dead@e2e.test",
    name: "Dead",
    role: "viewer",
    isActive: false,
    emailVerified: true,
  },
};

/** Inserts every persona; returns ids by key. Idempotent per test DB reset. */
export async function seedPersonas(
  sql: postgres.Sql,
): Promise<Record<string, string>> {
  const hash = await hashPassword(PERSONA_PASSWORD);
  // alumni.department_id is NOT NULL — one shared test department.
  const [dept] = await sql<{ id: string }[]>`
    INSERT INTO departments (name, code) VALUES ('Test Dept', 'TEST')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
  const ids: Record<string, string> = {};
  for (const [key, p] of Object.entries(PERSONAS)) {
    const [u] = await sql<{ id: string }[]>`
      INSERT INTO users (email, password_hash, name, role, is_active, email_verified_at)
      VALUES (
        ${p.email}, ${hash}, ${p.name}, ${p.role},
        ${p.isActive ?? true}, ${p.emailVerified !== false ? new Date().toISOString() : null}
      )
      RETURNING id
    `;
    ids[key] = u.id;
    if (p.verifyStatus) {
      await sql`
        INSERT INTO alumni (
          user_id, roll_number, full_name, email, verify_status, datasource,
          department_id, verified_at
        )
        VALUES (
          ${u.id}, ${`ROLL-${key}`}, ${p.name}, ${p.email}, ${p.verifyStatus},
          'registration', ${dept.id},
          ${p.verifyStatus === "verified" ? new Date().toISOString() : null}
        )
      `;
    }
  }
  return ids;
}

/** Removes persona rows (auth_attempts/login_logs rows are left harmlessly). */
export async function clearPersonas(sql: postgres.Sql): Promise<void> {
  const emails = Object.values(PERSONAS).map((p) => p.email);
  await sql`DELETE FROM alumni WHERE email = ANY(${emails})`;
  await sql`DELETE FROM users WHERE email = ANY(${emails})`;
}

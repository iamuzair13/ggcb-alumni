import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type postgres from "postgres";
import { closeTestConns, getDirectSql, hasTestDb } from "./helpers";

let sql: postgres.Sql;
let deptId: string;

async function insertAlumni(overrides: Record<string, unknown> = {}) {
  const base = {
    roll_number: `RL-${crypto.randomUUID().slice(0, 8)}`,
    full_name: "Fixture Person",
    department_id: deptId,
    verify_status: "under_approval",
    datasource: "registration",
    ...overrides,
  };
  const keys = Object.keys(base);
  return sql.unsafe(
    `INSERT INTO alumni (${keys.join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING id`,
    Object.values(base),
  );
}

describe.skipIf(!hasTestDb)("schema constraints (real postgres)", () => {
  beforeAll(async () => {
    sql = getDirectSql();
    const [dept] = await sql<{ id: string }[]>`
      INSERT INTO departments (name, code) VALUES ('Fixture Dept', 'FIX')
      RETURNING id
    `;
    deptId = dept.id;
  });

  afterAll(() => closeTestConns());

  it("roll number uniqueness is case- and whitespace-insensitive", async () => {
    await insertAlumni({ roll_number: " ab-1 " });
    await expect(insertAlumni({ roll_number: "AB-1" })).rejects.toThrow(
      /alumni_roll_number_norm_uniq/,
    );
    await expect(insertAlumni({ roll_number: "AB-1 " })).rejects.toThrow(
      /alumni_roll_number_norm_uniq/,
    );
  });

  it("email is unique (citext) but NULLs may repeat", async () => {
    await insertAlumni({ email: "Dup@Test.com" });
    await expect(insertAlumni({ email: "dup@test.com" })).rejects.toThrow(
      /alumni_email_uniq/,
    );
    await insertAlumni({ email: null });
    await insertAlumni({ email: null });
  });

  it("verified requires verified_at; rejected requires a reason", async () => {
    await expect(insertAlumni({ verify_status: "verified" })).rejects.toThrow(
      /alumni_verified_needs_at/,
    );
    await insertAlumni({ verify_status: "verified", verified_at: new Date() });
    await expect(insertAlumni({ verify_status: "rejected" })).rejects.toThrow(
      /alumni_rejected_needs_reason/,
    );
    await expect(
      insertAlumni({ verify_status: "rejected", reject_reason: "  " }),
    ).rejects.toThrow(/alumni_rejected_needs_reason/);
  });

  it("enforces year ranges and session ordering", async () => {
    await expect(insertAlumni({ session_start_year: 1800 })).rejects.toThrow(
      /alumni_session_start_range/,
    );
    await expect(
      insertAlumni({ session_start_year: 2020, session_end_year: 2019 }),
    ).rejects.toThrow(/alumni_session_order/);
    await expect(insertAlumni({ passing_year: 2200 })).rejects.toThrow(
      /alumni_passing_year_range/,
    );
  });

  it("enforces the BS degree check, non-blank name, bio length, and jsonb object", async () => {
    await expect(insertAlumni({ degree: "MSc" })).rejects.toThrow(
      /alumni_degree_bs/,
    );
    await expect(insertAlumni({ full_name: "   " })).rejects.toThrow(
      /alumni_full_name_not_blank/,
    );
    await expect(insertAlumni({ bio: "x".repeat(1001) })).rejects.toThrow(
      /alumni_bio_length/,
    );
    await expect(
      sql.unsafe(
        `INSERT INTO alumni (roll_number, full_name, department_id, datasource, social_links)
         VALUES ('SL-1', 'Fixture Person', $1, 'registration', '["a"]'::jsonb)`,
        [deptId],
      ),
    ).rejects.toThrow(/alumni_social_links_object/);
  });

  it("FK RESTRICT prevents deleting a department that has alumni", async () => {
    await insertAlumni({ roll_number: "FK-1" });
    await expect(
      sql`DELETE FROM departments WHERE id = ${deptId}`,
    ).rejects.toThrow(/violates foreign key/);
  });

  it("allows at most one pending change request per alumnus", async () => {
    const [row] = await insertAlumni({ roll_number: "CR-1" });
    const alumniId = row.id as string;
    await sql`INSERT INTO alumni_change_requests (alumni_id, changes) VALUES (${alumniId}, '{}'::jsonb)`;
    await expect(
      sql`INSERT INTO alumni_change_requests (alumni_id, changes) VALUES (${alumniId}, '{}'::jsonb)`,
    ).rejects.toThrow(/alumni_change_requests_one_pending/);
    // resolved requests do not block a new pending one
    await sql`UPDATE alumni_change_requests SET status = 'approved', reviewed_at = now() WHERE alumni_id = ${alumniId}`;
    await sql`INSERT INTO alumni_change_requests (alumni_id, changes) VALUES (${alumniId}, '{}'::jsonb)`;
  });

  it("rejects non-pending change requests without reviewed_at", async () => {
    const [row] = await insertAlumni({ roll_number: "CR-2" });
    await expect(
      sql`INSERT INTO alumni_change_requests (alumni_id, changes, status) VALUES (${row.id}, '{}'::jsonb, 'approved')`,
    ).rejects.toThrow(/alumni_change_requests_review_required/);
  });

  it("auth_tokens requires a 64-char hex token_hash", async () => {
    const [user] = await sql<{ id: string }[]>`
      INSERT INTO users (email, name, role) VALUES ('tok@test.com', 'Tok', 'alumni') RETURNING id
    `;
    await expect(
      sql`INSERT INTO auth_tokens (user_id, type, token_hash, expires_at)
          VALUES (${user.id}, 'password_reset', 'tooshort', now() + interval '1 hour')`,
    ).rejects.toThrow(/auth_tokens_hash_hex/);
  });

  it("set_updated_at trigger bumps updated_at on update", async () => {
    const [row] = await insertAlumni({ roll_number: "TRG-1" });
    const before = (
      await sql<
        { updated_at: Date }[]
      >`SELECT updated_at FROM alumni WHERE id = ${row.id}`
    )[0].updated_at;
    await new Promise((r) => setTimeout(r, 20));
    await sql`UPDATE alumni SET city = 'Burewala' WHERE id = ${row.id}`;
    const after = (
      await sql<
        { updated_at: Date }[]
      >`SELECT updated_at FROM alumni WHERE id = ${row.id}`
    )[0].updated_at;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
  });
});

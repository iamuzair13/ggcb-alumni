/**
 * Superadmin seed core — importable by tests.
 * Idempotent, password-less, audited. Never creates login credentials:
 * Prompt 3 adds the secure set-password mechanism.
 */
import type postgres from "postgres";

export interface SeedResult {
  outcome: "created" | "already-exists" | "blocked";
  userId?: string;
  message: string;
}

export async function seedSuperadmin(
  sql: postgres.Sql,
  opts: { email: string; name: string; allowAdditional: boolean },
): Promise<SeedResult> {
  const email = opts.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      `SEED_SUPERADMIN_EMAIL "${opts.email}" is not a valid email`,
    );
  }
  if (!opts.name.trim()) {
    throw new Error("SEED_SUPERADMIN_NAME must be a non-empty name");
  }

  const existing = await sql<{ id: string; role: string }[]>`
    SELECT id, role::text FROM users WHERE email = ${email}
  `;
  if (existing.length > 0) {
    // Never overwrite, never escalate an existing user.
    return {
      outcome: "already-exists",
      userId: existing[0].id,
      message: `user ${email} already exists (role=${existing[0].role}) — nothing changed`,
    };
  }

  const [otherSuperadmin] = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count
    FROM users WHERE role = 'superadmin' AND is_active
  `;
  if (Number(otherSuperadmin.count) > 0 && !opts.allowAdditional) {
    return {
      outcome: "blocked",
      message:
        "an active superadmin already exists — re-run with --allow-additional to create another",
    };
  }

  const created = await sql.begin(async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      INSERT INTO users (email, name, role, is_active, email_verified_at, password_hash)
      VALUES (${email}, ${opts.name.trim()}, 'superadmin', true, now(), NULL)
      RETURNING id
    `;
    await tx`
      INSERT INTO admin_activity_logs (actor_user_id, action, entity_type, entity_id)
      VALUES (${row.id}, 'seed.superadmin', 'users', ${row.id})
    `;
    return row;
  });

  return {
    outcome: "created",
    userId: created.id,
    message:
      `created superadmin ${email}. The account has NO PASSWORD yet — ` +
      "Prompt 3 adds the secure set-password flow.",
  };
}

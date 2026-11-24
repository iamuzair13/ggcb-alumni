/**
 * Auth token service (auth_tokens) — for Prompt 5's email-verification and
 * password-reset flows. Raw tokens are returned ONCE and never stored or
 * logged; only their SHA-256 hex goes to the DB.
 */
import { createHash, randomBytes } from "node:crypto";
import type postgres from "postgres";
import type { AuthTokenType } from "@/server/db/enums";

const TTL_MS: Record<AuthTokenType, number> = {
  email_verification: 24 * 60 * 60 * 1000, // 24 h
  password_reset: 60 * 60 * 1000, // 1 h
};

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * Creates a token for `userId`: invalidates earlier unused tokens of the
 * same type for that user and inserts the new one — atomically, in one
 * transaction. Returns the raw token ONCE (base64url, 32 random bytes).
 */
export async function createAuthToken(
  tx: postgres.Sql | postgres.TransactionSql,
  userId: string,
  type: AuthTokenType,
): Promise<{ raw: string; expiresAt: Date }> {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + TTL_MS[type]);

  const run = async (t: postgres.TransactionSql) => {
    // Invalidate previous unused tokens of this type for the user.
    await t`
      UPDATE auth_tokens SET used_at = now()
      WHERE user_id = ${userId} AND type = ${type} AND used_at IS NULL
    `;
    await t`
      INSERT INTO auth_tokens (user_id, type, token_hash, expires_at)
      VALUES (${userId}, ${type}, ${tokenHash}, ${expiresAt})
    `;
  };
  // On the pooled client this opens a transaction; on a TransactionSql it
  // becomes a savepoint (postgres.js) — atomic either way.
  await tx.begin(run as (tx: postgres.TransactionSql) => Promise<void>);
  return { raw, expiresAt };
}

export type ConsumeResult = { ok: true; userId: string } | { ok: false };

/**
 * Single atomic consume — one statement sets used_at where the token is
 * still valid+unused, so even two concurrent consumes cannot both win.
 * Returns user_id on success; does NOT distinguish "expired" / "used" /
 * "unknown" to the caller.
 */
export async function consumeAuthToken(
  sql: postgres.Sql,
  raw: string,
  type: AuthTokenType,
): Promise<ConsumeResult> {
  const rows = await sql<{ user_id: string }[]>`
    UPDATE auth_tokens
    SET used_at = now()
    WHERE token_hash = ${hashToken(raw)}
      AND type = ${type}
      AND used_at IS NULL
      AND expires_at > now()
    RETURNING user_id
  `;
  return rows.length === 1
    ? { ok: true, userId: rows[0].user_id }
    : { ok: false };
}

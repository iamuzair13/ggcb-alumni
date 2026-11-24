import "server-only";
/**
 * Public account flows — Prompt 5 §4.2.
 *
 * requestPasswordReset / resendVerification are NEUTRAL flows:
 *   - the synchronous path only checks+records rate limits (fixed work),
 *   - the user lookup + token + enqueue happen inside after() so response
 *     latency cannot reveal account existence,
 *   - every outcome returns the same result.
 *
 * verifyEmail / resetWithToken are CONSUME flows: the token is spent only
 * by a POST action (a GET prefetch can never consume), inside ONE
 * transaction with the user update + notice enqueue + audit row.
 */
import { z } from "zod";
import { sql } from "@/server/db";
import type { ConsumeResult, NeutralResult } from "@/lib/result";
import { getServerEnv } from "@/lib/config/env.server";
import { attemptKeys } from "@/server/auth/rate-limit";
import {
  checkRequestLimit,
  recordRequest,
  type RequestKind,
} from "@/server/auth/request-limits";
import { createAuthToken, consumeAuthToken } from "@/server/auth/tokens";
import { hashPassword, validatePasswordPolicy } from "@/server/auth/password";
import { enqueueEmail, kickOutbox } from "@/server/email/enqueue";
import { recordAdminActivity } from "@/server/audit";
import type { AuthTokenType } from "@/server/db/enums";

export const emailInput = z.object({ email: z.email().max(320) });
export const tokenInput = z.object({ token: z.string().min(16).max(200) });
export const passwordInput = z.object({
  token: z.string().min(16).max(200),
  password: z.string().max(128),
  confirm: z.string().max(128),
});

export type { ConsumeResult, NeutralResult };

type AfterFn = (work: () => Promise<unknown>) => void;

/**
 * Shared neutral request flow. `kind` decides which template/token/attempt
 * kind is used; `eligible` decides which users get a token (reset: active
 * users; resend: unverified users). Everything after the rate-limit work
 * is deferred via `after` — the response is a constant-shape {status:"ok"}.
 */
async function requestFlow(
  kind: RequestKind,
  tokenType: AuthTokenType,
  template: "password_reset" | "email_verification",
  expiresHours: number,
  eligible: "verified_or_any" | "unverified",
  email: string,
  ip: string | null,
  after: AfterFn,
): Promise<NeutralResult> {
  const secret = getServerEnv().AUTH_SECRET;
  const keys = attemptKeys(email, ip, secret);
  const rl = await checkRequestLimit(sql, kind, keys);
  if (!rl.limited) {
    await recordRequest(sql, kind, keys);
  }
  // The lookup+send is deliberately inside after(): a known-expensive path
  // (token insert + outbox enqueue) must not be measurable in response time.
  after(async () => {
    if (rl.limited) return;
    const [user] = await sql<
      {
        id: string;
        name: string;
        is_active: boolean;
        email_verified_at: Date | null;
      }[]
    >`
      SELECT id, name, is_active, email_verified_at FROM users
      WHERE email = ${email}
      LIMIT 1
    `;
    if (!user || !user.is_active) return;
    if (eligible === "unverified" && user.email_verified_at) return;
    await sql.begin(async (tx) => {
      const { raw } = await createAuthToken(tx, user.id, tokenType);
      await enqueueEmail(
        {
          to: email,
          template,
          payload: { name: user.name, token: raw, expiresHours },
        },
        { tx },
      );
    });
    kickOutbox();
  });
  return { status: "ok" };
}

export function requestPasswordReset(
  email: string,
  ip: string | null,
  after: AfterFn,
): Promise<NeutralResult> {
  return requestFlow(
    "password_reset",
    "password_reset",
    "password_reset",
    1,
    "verified_or_any",
    email,
    ip,
    after,
  );
}

export function resendVerification(
  email: string,
  ip: string | null,
  after: AfterFn,
): Promise<NeutralResult> {
  return requestFlow(
    "email_verify",
    "email_verification",
    "email_verification",
    24,
    "unverified",
    email,
    ip,
    after,
  );
}

/** consume email_verification + set email_verified_at in ONE tx. */
export async function verifyEmail(token: string): Promise<ConsumeResult> {
  const result = await sql.begin(async (tx) => {
    const consumed = await consumeAuthToken(tx, token, "email_verification");
    if (!consumed.ok) return { status: "invalid" as const };
    await tx`
      UPDATE users SET email_verified_at = COALESCE(email_verified_at, now())
      WHERE id = ${consumed.userId}
    `;
    await recordAdminActivity(
      {
        actorUserId: consumed.userId,
        action: "auth.email_verified",
        entityType: "user",
        entityId: consumed.userId,
      },
      { tx },
    );
    return { status: "ok" as const };
  });
  return result;
}

export type SetPasswordAction = "auth.password_reset" | "auth.password_set";

/**
 * Consume a password_reset token and set the password — ONE transaction:
 * consume → load user → policy (with user context; a policy failure throws
 * and rolls back so the token is NOT burned) → hash + set +
 * email_verified_at + session_version bump (signs out all sessions) →
 * password_changed notice + audit row. kickOutbox runs after commit.
 */
/** Thrown inside the tx so a context-policy failure ROLLS BACK the consume. */
class TokenPolicyError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = "TokenPolicyError";
  }
}

export async function resetWithToken(
  token: string,
  password: string,
  action: SetPasswordAction,
): Promise<ConsumeResult> {
  // Policy first — length/common checks need no account context, so a
  // rejectable password never reaches the consume statement.
  const pre = validatePasswordPolicy(password);
  if (!pre.ok) return { status: "policy", reason: pre.reason };

  let outcome: ConsumeResult;
  try {
    outcome = await sql.begin(async (tx) => {
      const consumed = await consumeAuthToken(tx, token, "password_reset");
      if (!consumed.ok) return { status: "invalid" as const };
      const [user] = await tx<{ email: string; name: string }[]>`
        SELECT email, name FROM users WHERE id = ${consumed.userId}
      `;
      if (!user) return { status: "invalid" as const };
      // Context-aware policy (email/name containment). A failure THROWS —
      // the tx rolls back, so the token is NOT burned and can be retried
      // with a different password.
      const policy = validatePasswordPolicy(password, {
        email: user.email,
        name: user.name,
      });
      if (!policy.ok) throw new TokenPolicyError(policy.reason);
      const hash = await hashPassword(password);
      await tx`
        UPDATE users
        SET password_hash = ${hash},
            email_verified_at = COALESCE(email_verified_at, now()),
            session_version = session_version + 1
        WHERE id = ${consumed.userId}
      `;
      await enqueueEmail(
        {
          to: user.email,
          template: "password_changed",
          payload: { name: user.name },
        },
        { tx },
      );
      await recordAdminActivity(
        {
          actorUserId: consumed.userId,
          action,
          entityType: "user",
          entityId: consumed.userId,
        },
        { tx },
      );
      return { status: "ok" as const };
    });
  } catch (e) {
    if (e instanceof TokenPolicyError)
      return { status: "policy", reason: e.reason };
    throw e;
  }
  if (outcome.status === "ok") kickOutbox();
  return outcome;
}

/** Template names exported for callers/tests that check the catalogue. */
export const ACCOUNT_TEMPLATES = {
  verify: "email_verification",
  reset: "password_reset",
  changed: "password_changed",
  invite: "staff_invitation",
} as const;

/**
 * Core login decision — order of operations is fixed by spec §4.5 and is
 * unit/DB-testable without NextAuth: validate input → normalise email →
 * rate-limit check (BEFORE hashing) → load user → timing-equalised verify →
 * is_active → email_verified_at → success.
 *
 * Everything downstream (attempt rows, login_logs, last_login_at, rehash)
 * is returned as `post` work for the caller to schedule via after() —
 * logging must never break a login.
 */
import { z } from "zod";
import type postgres from "postgres";
import { AUTH_ERROR_CODES, LOGIN_LOG_REASONS } from "./errors";
import {
  attemptKeys,
  checkRateLimit,
  dbAttemptStore,
  RATE_LIMIT,
  recordAttempt,
} from "./rate-limit";
import { verifyPasswordWithTiming, hashPassword } from "./password";
import { writeLoginLog } from "./audit";
import type { AuthErrorCode } from "./errors";
import type { Role } from "@/lib/constants/roles";

const credentialsSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(128),
});

export interface LoginUser {
  id: string;
  name: string;
  role: Role;
  sessionVersion: number;
}

export interface LoginResult {
  ok: boolean;
  code?: AuthErrorCode;
  user?: LoginUser;
  /** Post-response work the caller should schedule via after() (or await in tests). */
  post: () => Promise<void>;
}

export async function authorizeLogin(
  sql: postgres.Sql,
  secret: string,
  raw: { email?: unknown; password?: unknown },
  ip: string | null,
  userAgent: string | null,
): Promise<LoginResult> {
  // 1. Validate input.
  const parsed = credentialsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: AUTH_ERROR_CODES.INVALID,
      post: async () =>
        writeLoginLog(sql, {
          userId: null,
          emailAttempted: null,
          success: false,
          reason: LOGIN_LOG_REASONS.INVALID_INPUT,
          ip,
          userAgent,
        }),
    };
  }
  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const keys = attemptKeys(email, ip, secret);
  const store = dbAttemptStore(sql);

  // 2. Rate-limit check BEFORE any hashing or user lookup.
  const rl = await checkRateLimit(store, keys);
  if (rl.limited) {
    return {
      ok: false,
      code: AUTH_ERROR_CODES.RATE_LIMITED,
      post: async () => {
        await writeLoginLog(sql, {
          userId: null,
          emailAttempted: email,
          success: false,
          reason: LOGIN_LOG_REASONS.RATE_LIMITED,
          ip,
          userAgent,
        });
      },
    };
  }

  // 3. Load the user — explicit columns only.
  const [user] = await sql<
    {
      id: string;
      email: string;
      password_hash: string | null;
      name: string;
      role: string;
      is_active: boolean;
      email_verified_at: Date | null;
      session_version: number;
    }[]
  >`
    SELECT id, email, password_hash, name, role::text, is_active,
           email_verified_at, session_version
    FROM users WHERE email = ${email}
  `;

  // 4. Timing-equalised verify (dummy hash when none exists).
  const verify = await verifyPasswordWithTiming(
    user?.password_hash ?? null,
    password,
  );

  const finish = (
    code: AuthErrorCode,
    reason: (typeof LOGIN_LOG_REASONS)[keyof typeof LOGIN_LOG_REASONS],
    userId: string | null,
  ): LoginResult => ({
    ok: false,
    code,
    post: async () => {
      await recordAttempt(store, keys, "failed").catch(() => {});
      await writeLoginLog(sql, {
        userId,
        emailAttempted: email,
        success: false,
        reason,
        ip,
        userAgent,
      });
    },
  });

  // 5. Failures — all generic INVALID except the one allowed exception.
  if (!user) {
    return finish(
      AUTH_ERROR_CODES.INVALID,
      LOGIN_LOG_REASONS.UNKNOWN_EMAIL,
      null,
    );
  }
  if (!verify.ok) {
    return finish(
      AUTH_ERROR_CODES.INVALID,
      user.password_hash
        ? LOGIN_LOG_REASONS.BAD_CREDENTIALS
        : LOGIN_LOG_REASONS.NO_PASSWORD,
      user.id,
    );
  }
  if (!user.is_active) {
    return finish(
      AUTH_ERROR_CODES.INVALID,
      LOGIN_LOG_REASONS.INACTIVE,
      user.id,
    );
  }
  if (!user.email_verified_at) {
    return finish(
      AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED,
      LOGIN_LOG_REASONS.EMAIL_NOT_VERIFIED,
      user.id,
    );
  }

  // 6. Success — post-response work: rehash if needed, last_login_at,
  //    attempt/log rows, opportunistic purge.
  const loginUser: LoginUser = {
    id: user.id,
    name: user.name,
    role: user.role as Role,
    sessionVersion: user.session_version,
  };
  return {
    ok: true,
    user: loginUser,
    post: async () => {
      const jobs: Promise<unknown>[] = [
        sql`UPDATE users SET last_login_at = now() WHERE id = ${user.id}`.catch(
          () => [],
        ),
        writeLoginLog(sql, {
          userId: user.id,
          emailAttempted: email,
          success: true,
          reason: LOGIN_LOG_REASONS.SUCCESS,
          ip,
          userAgent,
        }),
      ];
      if (verify.needsRehash) {
        jobs.push(
          hashPassword(password)
            .then(
              (h) =>
                sql`UPDATE users SET password_hash = ${h} WHERE id = ${user.id}`,
            )
            .catch(() => []),
        );
      }
      if (Math.random() < RATE_LIMIT.PURGE_FRACTION) {
        const cutoff = new Date(
          Date.now() - RATE_LIMIT.PURGE_KEEP_DAYS * 24 * 60 * 60 * 1000,
        );
        jobs.push(store.purge(cutoff).catch(() => {}));
      }
      await Promise.all(jobs);
    },
  };
}

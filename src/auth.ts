/**
 * NextAuth v5 (Auth.js) configuration — Credentials provider + JWT sessions.
 * Locked decisions (context.md §2): no Supabase Auth, no adapter, no OAuth.
 *
 * - JWT carries ONLY: sub, role, sessionVersion, name, checkedAt — no email,
 *   no password hash, no other PII.
 * - Cookies: httpOnly, sameSite=lax, __Host- prefixed + secure in production
 *   (path=/, no domain — satisfies the __Host- requirements).
 * - Session re-validation: the jwt callback re-checks the DB at most once
 *   per SESSION_RECHECK_MS (5 min) and invalidates on
 *   inactive/deleted/session_version mismatch — returning null kills the
 *   session (Auth.js v5).
 */
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { sql } from "@/server/db";
import { getServerEnv } from "@/lib/config/env.server";
import { authorizeLogin } from "@/server/auth/login";
import { getClientIp } from "@/server/auth/client-ip";
import { AUTH_ERROR_CODES } from "@/server/auth/errors";
import type { Role } from "@/lib/constants/roles";

const isProd = process.env.NODE_ENV === "production";

/** 5-minute session DB re-validation window. */
export const SESSION_RECHECK_MS = 5 * 60 * 1000;

/** Token shape — JWT's index signature is Record<string,unknown>, so we
 * narrow explicitly here rather than relying on module augmentation. */
type AppJWT = import("next-auth/jwt").JWT & {
  role?: Role;
  sessionVersion?: number;
  checkedAt?: number;
};

/** Typed sign-in errors — authorize() throws these, the action maps code. */
class InvalidCredentials extends CredentialsSignin {
  code = AUTH_ERROR_CODES.INVALID;
}
class EmailNotVerified extends CredentialsSignin {
  code = AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED;
}
class RateLimited extends CredentialsSignin {
  code = AUTH_ERROR_CODES.RATE_LIMITED;
}

/** One-query session re-check: is_active + role + session_version. */
export async function recheckUser(
  userId: string,
  sessionVersion: number,
): Promise<{ valid: false } | { valid: true; role: Role }> {
  const [row] = await sql<
    { is_active: boolean; role: string; session_version: number }[]
  >`
    SELECT is_active, role::text, session_version
    FROM users WHERE id = ${userId}
  `;
  if (!row || !row.is_active || row.session_version !== sessionVersion) {
    return { valid: false };
  }
  return { valid: true, role: row.role as Role };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 3600 },
  jwt: { maxAge: 3600 },
  trustHost: true,
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: {
      name: isProd ? "__Host-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const env = getServerEnv();
        const result = await authorizeLogin(
          sql,
          env.AUTH_SECRET,
          credentials,
          getClientIp(request),
          request.headers.get("user-agent"),
        );
        try {
          // Post-response logging; never lets logging break the login.
          const { after } = await import("next/server");
          after(() => result.post());
        } catch {
          await result.post().catch(() => {});
        }
        if (!result.ok || !result.user) {
          switch (result.code) {
            case AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED:
              throw new EmailNotVerified();
            case AUTH_ERROR_CODES.RATE_LIMITED:
              throw new RateLimited();
            default:
              throw new InvalidCredentials();
          }
        }
        return {
          id: result.user.id,
          name: result.user.name,
          role: result.user.role,
          sessionVersion: result.user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const t = token as AppJWT;
      if (user) {
        // Sign-in: seed the token.
        t.role = user.role;
        t.sessionVersion = user.sessionVersion;
        t.name = user.name;
        t.checkedAt = Date.now();
        return t;
      }
      // Re-check the DB at most every SESSION_RECHECK_MS.
      if (
        typeof t.checkedAt === "number" &&
        Date.now() - t.checkedAt < SESSION_RECHECK_MS
      ) {
        return t;
      }
      if (!t.sub || typeof t.sessionVersion !== "number") return null;
      const check = await recheckUser(t.sub, t.sessionVersion);
      if (!check.valid) return null; // invalidate the session
      t.role = check.role; // refresh role from DB on every re-check
      t.checkedAt = Date.now();
      return t;
    },
    async session({ session, token }) {
      const t = token as AppJWT;
      session.user = {
        id: token.sub!,
        name: t.name ?? "",
        role: t.role!,
        sessionVersion: t.sessionVersion!,
      } as typeof session.user; // no adapter — AdapterUser email fields don't apply
      return session;
    },
  },
});

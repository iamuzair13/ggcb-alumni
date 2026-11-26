import "server-only";
/**
 * Session + guards — THE authorization layer. Enforced in server code at
 * the data/route boundary; never in client code, never only in middleware.
 *
 * - getSession()/getCurrentUser() are cached per request (React `cache`) so
 *   a page and its nested components share ONE session read.
 * - Guards throw Next.js primitives: `redirect()` to /login for anonymous
 *   (pages) or `forbidden()` (403) for the wrong role — never a 404.
 * - `fresh: true` forces a DB re-check on demand for sensitive operations.
 */
import { cache } from "react";
import { forbidden, redirect } from "next/navigation";
import { connection } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { recheckUser } from "@/auth";
import { sql } from "@/server/db";
import { sanitizeCallbackUrl } from "./callback-url";
import type { Role } from "@/lib/constants/roles";
import type { VerifyStatus } from "@/lib/constants/statuses";

export const getSession = cache(async (): Promise<Session | null> => {
  // Cache Components: auth() reads headers + crypto — an explicit
  // connection() marks the read as request-time (required since Next 16).
  await connection();
  return auth();
});

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  sessionVersion: number;
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getSession();
  const u = session?.user;
  if (!u?.id || !u.role) return null;
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    sessionVersion: u.sessionVersion,
  };
});

export interface GuardOpts {
  /** Path to bounce anonymous users to /login with (safe callbackUrl). */
  callbackPath?: string;
  /** Force a live DB re-check (is_active/role/session_version) now. */
  fresh?: boolean;
}

async function checkFresh(user: SessionUser): Promise<SessionUser> {
  const c = await recheckUser(user.id, user.sessionVersion);
  if (!c.valid) {
    throw redirect("/login");
  }
  return { ...user, role: c.role };
}

/**
 * requireUser — anonymous users are redirected to /login with a safe
 * callbackUrl. `fresh` forces a DB re-check for sensitive paths.
 */
export async function requireUser(opts: GuardOpts = {}): Promise<SessionUser> {
  let user = await getCurrentUser();
  if (!user) {
    const cb = sanitizeCallbackUrl(opts.callbackPath, "/");
    throw redirect(`/login?callbackUrl=${encodeURIComponent(cb)}`);
  }
  if (opts.fresh) user = await checkFresh(user);
  return user;
}

/** requireRole — wrong role → explicit 403 via `forbidden()`. */
export async function requireRole(
  roles: readonly Role[],
  opts: GuardOpts = {},
): Promise<SessionUser> {
  const user = await requireUser(opts);
  if (!roles.includes(user.role)) throw forbidden();
  return user;
}

/** Staff roles: superadmin | admin | viewer. */
export async function requireStaff(opts: GuardOpts = {}): Promise<SessionUser> {
  return requireRole(["superadmin", "admin", "viewer"], opts);
}

/**
 * Alumni guard — one query on alumni by user_id for verify_status.
 * `verified: true` requires verify_status='verified'; under_approval and
 * rejected alumni only reach what the policy allows (the dashboard).
 */
export async function requireAlumni(
  opts: GuardOpts & { verified?: boolean } = {},
): Promise<SessionUser & { verifyStatus: VerifyStatus }> {
  const user = await requireRole(["alumni"], opts);
  const [row] = await sql<{ verify_status: string }[]>`
    SELECT verify_status::text FROM alumni WHERE user_id = ${user.id}
  `;
  const verifyStatus = (row?.verify_status ?? "under_approval") as VerifyStatus;
  if (opts.verified && verifyStatus !== "verified") throw forbidden();
  return { ...user, verifyStatus };
}

/**
 * Role for an email — used by the login action AFTER signIn succeeds:
 * the just-issued cookie isn't visible to getSession() in the same
 * request, so the role is re-read (one indexed query).
 */
export async function roleForEmail(email: string): Promise<Role | null> {
  const [row] = await sql<{ role: string }[]>`
    SELECT role::text AS role FROM users WHERE email = ${email}
  `;
  return (row?.role as Role | undefined) ?? null;
}

/** Bump session_version — invalidates every outstanding session/JWT. */
export async function invalidateUserSessions(userId: string): Promise<void> {
  await sql`UPDATE users SET session_version = session_version + 1 WHERE id = ${userId}`;
}

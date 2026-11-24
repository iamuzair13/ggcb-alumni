/**
 * Central route policy — THE single table mapping every route in src/app to
 * who may reach it. Guards enforce it in server code; a completeness test
 * fails CI when a page/route file exists without a matching entry.
 *
 * Pure data (no imports) so the completeness test can run anywhere.
 * `pattern` is matched as exact-or-prefix on the pathname; longest match wins.
 */
import type { Role } from "@/lib/constants/roles";

export interface RoutePolicyEntry {
  /** Path prefix; `/` matches everything (used only for the root page). */
  pattern: string;
  /**
   * `page` | `api` | `cron`. A `cron` entry covers an api route.ts whose
   * handler enforces bearer-secret auth itself — no session/cookie/role
   * ever authorizes it, so the matrix shows 401 for EVERY persona.
   */
  kind: "page" | "api" | "cron";
  /** `public` = no auth required; `any` = any signed-in user; else the role set. */
  roles: Role[] | "public" | "any";
  /** When true, alumni must also be alumni.verify_status='verified'. */
  alumniVerified?: boolean;
  /** Development-only surface — expected 404 in production. */
  devOnly?: boolean;
  /** Signed-in users are bounced to their role home instead of seeing the page. */
  guestOnly?: boolean;
}

export const STAFF: Role[] = ["superadmin", "admin", "viewer"];
export const STAFF_OPS: Role[] = ["superadmin", "admin"];

export const ROUTE_POLICY: RoutePolicyEntry[] = [
  // ── public ────────────────────────────────────────────────────────────
  { pattern: "/", kind: "page", roles: "public" },
  { pattern: "/login", kind: "page", roles: "public", guestOnly: true },
  { pattern: "/register", kind: "page", roles: "public", guestOnly: true },
  {
    pattern: "/forgot-password",
    kind: "page",
    roles: "public",
    guestOnly: true,
  },
  // Token pages are public but NOT guestOnly — a signed-in user may still
  // open them (spec §4.5); consumption is POST-only.
  { pattern: "/verify-email", kind: "page", roles: "public" },
  { pattern: "/reset-password", kind: "page", roles: "public" },
  { pattern: "/set-password", kind: "page", roles: "public" },
  { pattern: "/design", kind: "page", roles: "public", devOnly: true },
  { pattern: "/api/health", kind: "api", roles: "public" },
  { pattern: "/api/auth/me", kind: "api", roles: "any" },
  { pattern: "/api/auth", kind: "api", roles: "public" }, // Auth.js endpoints
  // Vercel Cron bearer-secret route — session/role auth NEVER applies;
  // the handler is fail-closed (401 for every persona, spec §4.7).
  { pattern: "/api/cron/email-outbox", kind: "cron", roles: "public" },
  // ── alumni ────────────────────────────────────────────────────────────
  { pattern: "/dashboard", kind: "page", roles: ["alumni"] },
  // ── staff ─────────────────────────────────────────────────────────────
  // Enumerated per section (context.md §10): viewer read-only on the five
  // operational sections; import/export + audit logs are superadmin+admin;
  // user management is superadmin-only.
  { pattern: "/admin/users", kind: "page", roles: ["superadmin"] },
  { pattern: "/admin/import-export", kind: "page", roles: STAFF_OPS },
  { pattern: "/admin/audit-logs", kind: "page", roles: STAFF_OPS },
  { pattern: "/admin/alumni", kind: "page", roles: STAFF },
  { pattern: "/admin/departments", kind: "page", roles: STAFF },
  { pattern: "/admin/content", kind: "page", roles: STAFF },
  { pattern: "/admin/analytics", kind: "page", roles: STAFF },
  { pattern: "/admin", kind: "page", roles: STAFF }, // admin dashboard
];

/** Exact match, or prefix match on a segment boundary. */
export function policyFor(pathname: string): RoutePolicyEntry | undefined {
  const matches = ROUTE_POLICY.filter(
    (p) =>
      pathname === p.pattern ||
      (p.pattern !== "/" && pathname.startsWith(`${p.pattern}/`)),
  );
  return matches.sort((a, b) => b.pattern.length - a.pattern.length)[0];
}

/** Roles allowed for a policy entry as a flat list ("any"/"public" → all). */
export function allowedRoles(p: RoutePolicyEntry): Role[] {
  if (p.roles === "public" || p.roles === "any") {
    return ["superadmin", "admin", "viewer", "alumni"];
  }
  return p.roles;
}

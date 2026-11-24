/**
 * Demo personas + access rules — client-safe, pure data.
 *
 * The demo mirrors the REAL role semantics from ROUTE_POLICY: the parity
 * test (src/tests/unit/demo-access.test.ts) asserts this table agrees with
 * the policy for every route it mirrors. Persona switching is client
 * state only — it can never touch sessions or authorization.
 */
import type { Role } from "@/lib/constants/roles";
import type { VerifyStatus } from "@/lib/constants/statuses";

export type DemoPersonaId =
  | "anonymous"
  | "alumni-pending"
  | "alumni-verified"
  | "alumni-rejected"
  | "viewer"
  | "admin"
  | "superadmin";

export interface DemoPersona {
  id: DemoPersonaId;
  label: string;
  role: Role | null;
  verifyStatus: VerifyStatus | null;
  description: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "anonymous",
    label: "Anonymous visitor",
    role: null,
    verifyStatus: null,
    description: "Not signed in — public pages and the register flow.",
  },
  {
    id: "alumni-pending",
    label: "Alumnus — under approval",
    role: "alumni",
    verifyStatus: "under_approval",
    description: "Registered, waiting for the college to approve the record.",
  },
  {
    id: "alumni-verified",
    label: "Alumnus — verified",
    role: "alumni",
    verifyStatus: "verified",
    description: "Full alumni access: profile, E-card, stories, content.",
  },
  {
    id: "alumni-rejected",
    label: "Alumnus — rejected",
    role: "alumni",
    verifyStatus: "rejected",
    description: "Registration rejected — sees status, reason and next step.",
  },
  {
    id: "viewer",
    label: "Staff — viewer",
    role: "viewer",
    verifyStatus: null,
    description: "Read-only across the operational admin sections.",
  },
  {
    id: "admin",
    label: "Staff — admin",
    role: "admin",
    verifyStatus: null,
    description: "Full operational access except staff user management.",
  },
  {
    id: "superadmin",
    label: "Staff — superadmin",
    role: "superadmin",
    verifyStatus: null,
    description: "Everything, including staff user management.",
  },
];

/**
 * Alumni-area routes and who may see them. `/dashboard` and `/account`
 * are the only pages reachable before verification (blueprint §3.2).
 */
export const ALUMNI_DEMO_ROUTES = [
  { path: "/alumni/dashboard", needsVerified: false },
  { path: "/alumni/profile", needsVerified: true },
  { path: "/alumni/requests", needsVerified: true },
  { path: "/alumni/e-card", needsVerified: true },
  { path: "/alumni/events", needsVerified: true },
  { path: "/alumni/announcements", needsVerified: true },
  { path: "/alumni/opportunities", needsVerified: true },
  { path: "/alumni/stories", needsVerified: true },
  { path: "/alumni/account", needsVerified: false },
] as const;

/** Admin-area routes and the role set — mirrors ROUTE_POLICY. */
export const ADMIN_DEMO_ROUTES = [
  { path: "/admin", roles: ["superadmin", "admin", "viewer"] },
  { path: "/admin/alumni", roles: ["superadmin", "admin", "viewer"] },
  { path: "/admin/departments", roles: ["superadmin", "admin", "viewer"] },
  { path: "/admin/content", roles: ["superadmin", "admin", "viewer"] },
  { path: "/admin/analytics", roles: ["superadmin", "admin", "viewer"] },
  { path: "/admin/import-export", roles: ["superadmin", "admin"] },
  { path: "/admin/audit-logs", roles: ["superadmin", "admin"] },
  { path: "/admin/users", roles: ["superadmin"] },
] as const;

/** Can this persona open this demo alumni path? */
export function alumniRouteAllowed(
  persona: DemoPersona,
  demoPath: string,
): boolean {
  if (persona.role !== "alumni") return false;
  const route = ALUMNI_DEMO_ROUTES.find((r) => demoPath.startsWith(r.path));
  if (!route) return false;
  if (!route.needsVerified) return true;
  return persona.verifyStatus === "verified";
}

/** Can this persona open this demo admin path? (longest match wins) */
export function adminRouteAllowed(
  persona: DemoPersona,
  demoPath: string,
): boolean {
  const route = [...ADMIN_DEMO_ROUTES]
    .sort((a, b) => b.path.length - a.path.length)
    .find((r) => demoPath === r.path || demoPath.startsWith(`${r.path}/`));
  if (!route || !persona.role) return false;
  return (route.roles as readonly string[]).includes(persona.role);
}

/** Nav hrefs a staff persona sees — cosmetic filter like adminNavForRole. */
export function adminNavFor(persona: DemoPersona): string[] {
  return ADMIN_DEMO_ROUTES.filter((r) =>
    adminRouteAllowed(persona, r.path),
  ).map((r) => r.path);
}

/** Alumni nav hrefs a persona sees (under-approval sees dashboard+account). */
export function alumniNavFor(persona: DemoPersona): string[] {
  if (persona.role !== "alumni") return [];
  return ALUMNI_DEMO_ROUTES.filter((r) =>
    alumniRouteAllowed(persona, r.path),
  ).map((r) => r.path);
}

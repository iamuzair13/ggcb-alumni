/**
 * Authz matrix — derives the expected per-persona outcome for every
 * route-policy entry. THE single source for:
 *   docs/security/authz-matrix.md (generated),
 *   the e2e matrix spec (asserts real statuses),
 *   the snapshot test (fails when the matrix changes unintentionally).
 * Pure functions — no DB, no Next.
 */
import { allowedRoles, ROUTE_POLICY } from "./route-policy";
import type { Role } from "@/lib/constants/roles";

export const PERSONAS = [
  "anonymous",
  "alumni-under_approval",
  "alumni-verified",
  "viewer",
  "admin",
  "superadmin",
] as const;
export type Persona = (typeof PERSONAS)[number];

const PERSONA_ROLE: Record<Persona, Role | null> = {
  anonymous: null,
  "alumni-under_approval": "alumni",
  "alumni-verified": "alumni",
  viewer: "viewer",
  admin: "admin",
  superadmin: "superadmin",
};

/** Expected outcome as a compact matrix cell (page expectations). */
export function expectedOutcome(
  pattern: string,
  kind: "page" | "api",
  persona: Persona,
): string {
  const policy = ROUTE_POLICY.find((p) => p.pattern === pattern);
  if (!policy) return "NO POLICY";
  if (policy.devOnly) return "404 (prod)";
  const role = PERSONA_ROLE[persona];

  if (policy.roles === "public") {
    if (policy.guestOnly && role) {
      return `→ ${role === "alumni" ? "/dashboard" : "/admin"}`;
    }
    return "200";
  }
  if (!role) {
    return kind === "api" ? "401" : "→ /login";
  }
  const allowed = allowedRoles(policy);
  if (!allowed.includes(role)) return "403";
  if (
    policy.alumniVerified &&
    !(role === "alumni" && persona === "alumni-verified")
  ) {
    return "403";
  }
  return "200";
}

/** Markdown table — regenerated into docs/security/authz-matrix.md. */
export function renderMatrixMarkdown(): string {
  const header = `| Route | ${PERSONAS.join(" | ")} |`;
  const sep = `| --- | ${PERSONAS.map(() => "---").join(" | ")} |`;
  const rows = ROUTE_POLICY.map((p) => {
    const cells = PERSONAS.map((persona) =>
      expectedOutcome(p.pattern, p.kind, persona),
    );
    return `| \`${p.pattern}\` (${p.kind}) | ${cells.join(" | ")} |`;
  });
  return [
    "# Authorization matrix",
    "",
    "<!-- GENERATED — do not edit by hand. Regenerate with `pnpm authz:matrix`. -->",
    "<!-- The snapshot test (src/tests/unit/authz-matrix.test.ts) fails when this drifts. -->",
    "",
    "Expected outcomes per persona for every entry in the central route",
    "policy (`src/server/auth/route-policy.ts`). Guards enforce it server-",
    "side; the e2e matrix spec asserts the real statuses.",
    "",
    "- `→ /login` — redirect to `/login?callbackUrl=<safe path>` (HTTP 307",
    "  via proxy when there is no session cookie, streamed RSC redirect",
    "  when a cookie exists — Cache Components streams inside Suspense)",
    "- `403` — explicit Forbidden page (never a 404 for wrong-role)",
    "- `→ /admin` / `→ /dashboard` — signed-in users bounced off guest pages",
    "- `404 (prod)` — dev-only surface, notFound() in production builds",
    "",
    header,
    sep,
    ...rows,
    "",
    "Alumni verification: `under_approval`/`rejected` alumni reach only the",
    "dashboard (any `alumniVerified` entry would gate `verified` alumni).",
    "",
  ].join("\n");
}

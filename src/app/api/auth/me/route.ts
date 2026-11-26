import { defineRoute } from "@/server/auth/route";

/**
 * GET /api/auth/me — exercises defineRoute in tests. Returns only the
 * minimal identity the JWT carries (id/name/role) — no email, no PII.
 */
export const GET = defineRoute({
  roles: "any",
  handler: async (_req, _ctx, user) =>
    Response.json(
      { id: user!.id, name: user!.name, role: user!.role },
      { headers: { "Cache-Control": "private, no-store" } },
    ),
});

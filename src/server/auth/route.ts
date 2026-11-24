import "server-only";
/**
 * Route-handler + server-action wrappers — uniform authz at the boundary.
 *
 * - defineRoute: anonymous → 401 JSON, wrong role → 403 JSON; uniform error
 *   shape, no internals leaked. Optional same-origin check for mutations.
 * - defineAction: authorizes BEFORE validating input or touching data; Zod
 *   parses input; returns a typed result (never throws to the client).
 * - assertSameOrigin: rejects cross-origin state-changing requests (Origin
 *   must match Host when present — Auth.js endpoints keep their own CSRF).
 */
import type { z } from "zod";
import { getCurrentUser, type SessionUser } from "./session";
import type { Role } from "@/lib/constants/roles";

export interface RouteError {
  error: { code: string; message: string };
}

function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } } satisfies RouteError, {
    status,
  });
}

type RoutePolicy =
  { roles: "public" } | { roles: "any" } | { roles: readonly Role[] };

type RouteOptions = RoutePolicy & {
  /** Require Origin == Host on mutating methods (POST/PUT/PATCH/DELETE). */
  sameOrigin?: boolean;
};

/** Cross-origin mutation check — Origin must match the request Host. */
export function assertSameOrigin(request: Request): void {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  const origin = request.headers.get("origin");
  if (!origin) return; // same-site form POSTs may omit Origin — cookie lax covers it
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (new URL(origin).host !== host) {
      throw new Error(`cross-origin ${method} rejected`);
    }
  } catch {
    throw new Error(`cross-origin ${method} rejected`);
  }
}

type NextRouteContext = { params: Promise<Record<string, string | string[]>> };

export function defineRoute<C extends NextRouteContext = NextRouteContext>(
  opts: RouteOptions & {
    handler: (
      req: Request,
      ctx: C,
      user: SessionUser | null,
    ) => Promise<Response> | Response;
  },
): (req: Request, ctx: C) => Promise<Response> {
  return async (req, ctx) => {
    try {
      if (opts.sameOrigin) assertSameOrigin(req);
      if (opts.roles === "public") {
        return await opts.handler(req, ctx, null);
      }
      const user = await getCurrentUser();
      if (!user) {
        return jsonError(401, "UNAUTHORIZED", "Authentication required");
      }
      if (opts.roles !== "any" && !opts.roles.includes(user.role)) {
        return jsonError(403, "FORBIDDEN", "Insufficient permissions");
      }
      return await opts.handler(req, ctx, user);
    } catch (e) {
      // Never leak internals; a thrown guard means "unauthenticated".
      if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) {
        return jsonError(401, "UNAUTHORIZED", "Authentication required");
      }
      throw e;
    }
  };
}

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; code: string; message: string };

type ActionOptions<S extends z.ZodType, T> = RoutePolicy & {
  input: S;
  handler: (args: {
    input: z.infer<S>;
    user: SessionUser | null;
  }) => Promise<T>;
};

/**
 * defineAction — authorizes FIRST, then validates, then runs. Anonymous →
 * UNAUTHORIZED result, wrong role → FORBIDDEN result; handler errors become
 * an opaque INTERNAL result (details server-logged only).
 */
export function defineAction<S extends z.ZodType, T>(
  opts: ActionOptions<S, T>,
): (input: unknown) => Promise<ActionResult<T>> {
  return async (input) => {
    if (opts.roles !== "public") {
      const user = await getCurrentUser();
      if (!user)
        return {
          ok: false,
          code: "UNAUTHORIZED",
          message: "Authentication required",
        };
      if (opts.roles !== "any" && !opts.roles.includes(user.role)) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        };
      }
      const parsed = opts.input.safeParse(input);
      if (!parsed.success) {
        return { ok: false, code: "INVALID_INPUT", message: "Invalid input" };
      }
      try {
        return {
          ok: true,
          data: await opts.handler({ input: parsed.data, user }),
        };
      } catch (e) {
        console.error("[action]", e instanceof Error ? e.message : e);
        return { ok: false, code: "INTERNAL", message: "Something went wrong" };
      }
    }
    const parsed = opts.input.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: "INVALID_INPUT", message: "Invalid input" };
    }
    try {
      return {
        ok: true,
        data: await opts.handler({ input: parsed.data, user: null }),
      };
    } catch (e) {
      console.error("[action]", e instanceof Error ? e.message : e);
      return { ok: false, code: "INTERNAL", message: "Something went wrong" };
    }
  };
}

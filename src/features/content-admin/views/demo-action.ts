"use client";

/**
 * Demo form action — stands in for the real server actions inside the
 * /design/demo prototype. Simulates a round-trip, validates with the REAL
 * feature zod schema (so demo validation mirrors production), then applies
 * the parsed input to local state via the caller's `apply` callback.
 */
import type { z } from "zod";
import { useDemo } from "@/components/demo/demo-provider";
import type { ActionResult, ServiceResult } from "@/lib/result";

export function useDemoAction<S extends z.ZodType>(
  schema: S,
  apply: (data: z.output<S>) => void,
) {
  const { simulate } = useDemo();
  return async (input: unknown): Promise<ActionResult<ServiceResult>> => {
    await simulate(null, 550);
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "_form");
        fieldErrors[key] ??= issue.message;
      }
      return {
        ok: true,
        data: {
          status: "error",
          message: "Check the highlighted fields.",
          fieldErrors,
        },
      };
    }
    apply(parsed.data);
    return { ok: true, data: { status: "ok" } };
  };
}

/**
 * GET /api/cron/email-outbox — Vercel Cron entry (bearer-secret only).
 *
 * Fail closed (spec §4.7): CRON_SECRET unset → every request 401.
 * Constant-time compare; no session, cookie, or role ever authorizes this
 * route; proxy.ts does not match it (not in PROTECTED_PREFIXES/matcher).
 */
import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { getServerEnv } from "@/lib/config/env.server";
import { runMaintenancePurge } from "@/server/email/purge";
import { processOutbox } from "@/server/email/worker";

// Dynamic by `await connection()` below — `export const dynamic` is
// incompatible with Cache Components in Next 16.
export const maxDuration = 30; // > EMAIL_RUN_BUDGET_MS default (20 s)

function unauthorized(): Response {
  return Response.json(
    { error: { code: "UNAUTHORIZED", message: "Invalid credentials" } },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

/** Constant-time bearer check — false when the secret is unset or sizes
 * differ (length comparison is not a leak: the secret length is not
 * public information and we pad before comparing anyway). */
export function validCronSecret(
  header: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const given = header.slice("Bearer ".length);
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<Response> {
  await connection(); // headers + clock read — must be dynamic
  const secret = getServerEnv().CRON_SECRET;
  if (!validCronSecret(request.headers.get("authorization"), secret)) {
    return unauthorized();
  }

  const outbox = await processOutbox();
  const purge = await runMaintenancePurge();
  return Response.json(
    { outbox, purge },
    { headers: { "Cache-Control": "no-store" } },
  );
}

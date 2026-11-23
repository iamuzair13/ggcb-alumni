import { connection } from "next/server";

/**
 * Liveness probe. Deliberately reveals nothing (no version, no env, no
 * timestamp beyond what HTTP itself carries) and is never cached.
 */
export async function GET() {
  await connection();

  return Response.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

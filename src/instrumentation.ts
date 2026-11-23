/**
 * Runs once when the Next.js server instance starts.
 * Validates the server environment so a production deployment fails fast on
 * missing configuration instead of misbehaving at request time.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import keeps the server-only module out of edge/client graphs.
    void import("@/lib/config/env.server").then((m) => m.validateServerEnv());
  }
}

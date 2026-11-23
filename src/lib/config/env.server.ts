import "server-only";
import { z } from "zod";

/**
 * Server-side environment validation.
 *
 * Behaviour:
 *  - `next start` (NODE_ENV=production): missing/invalid variables THROW at
 *    startup — fail fast, never run with half-configured infra.
 *  - `next dev` / tests: invalid config logs a warning and returns the raw
 *    values so development is not blocked.
 *  - `next build` and CI: set SKIP_ENV_VALIDATION=true (documented CI-only
 *    escape hatch) or the build phase is detected via NEXT_PHASE — validation
 *    degrades to a warning so builds never depend on runtime secrets.
 *
 * Variable names follow context.md §7-14. Values live in .env* (git-ignored);
 * .env.example documents names only.
 */

const serverSchema = z.object({
  // Database (Prompt 2). Pooler + direct migrations URL.
  DATABASE_URL: z
    .url()
    .refine((v) => /^postgres(ql)?:\/\//.test(v), "must be a postgres URL"),
  DIRECT_URL: z
    .url()
    .refine((v) => /^postgres(ql)?:\/\//.test(v), "must be a postgres URL"),
  // Auth (Prompt 3)
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.url(),
  // Email (Prompt for email module)
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_SECURE: z.enum(["true", "false"]).optional(),
  FROM_EMAIL: z.email(),
  FROM_NAME: z.string().min(1).optional(),
  // Supabase Storage — server-side only, never exposed to the browser.
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STORAGE_BUCKET_PRIVATE: z.string().min(1),
  // Vercel Cron authentication for outbox/email drain routes.
  CRON_SECRET: z.string().min(16),
  // Dev-only query fan-out counter (context.md §7).
  DB_QUERY_STATS: z.enum(["true", "false"]).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function isSkipValidation(): boolean {
  return (
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.NEXT_PHASE === "phase-production-build"
  );
}

function parseServerEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env);
  if (result.success) return result.data;

  const problems = result.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");

  if (isSkipValidation() || process.env.NODE_ENV !== "production") {
    console.warn(
      `[env] server environment is incomplete — continuing with a warning:\n${problems}`,
    );
    return process.env as unknown as ServerEnv;
  }

  throw new Error(
    `Invalid server environment variables. Refusing to start:\n${problems}`,
  );
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (!cached) cached = parseServerEnv();
  return cached;
}

/** Called once at server boot from instrumentation.ts (fail fast in prod). */
export function validateServerEnv(): void {
  getServerEnv();
}

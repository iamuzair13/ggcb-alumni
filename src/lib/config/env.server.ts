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

const baseServerSchema = z.object({
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
  /** Auth.js needs this true on Vercel (non-localhost trusted host). */
  AUTH_TRUST_HOST: z.literal("true").optional(),
  // Email (Prompt 4) — conditional requirements enforced by the
  // superRefine below (mode decides which of these must exist).
  EMAIL_MODE: z.enum(["off", "log", "smtp"]).default("off"),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_SECURE: z.enum(["true", "false"]).optional(),
  FROM_EMAIL: z.email().optional(),
  FROM_NAME: z.string().min(1).optional(),
  REPLY_TO_EMAIL: z.email().optional(),
  // Outbox worker tuning (safe defaults — see docs/ops/email.md).
  /** Required (https in prod) whenever EMAIL_MODE != off — superRefine. */
  NEXT_PUBLIC_APP_URL: z.url().optional(),
  EMAIL_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(20),
  EMAIL_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(2),
  EMAIL_RUN_BUDGET_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(240_000)
    .default(20_000),
  EMAIL_STALE_LOCK_SECONDS: z.coerce
    .number()
    .int()
    .min(30)
    .max(86_400)
    .default(300),
  // Supabase Storage — server-side only, never exposed to the browser.
  // Optional until the upload phase implements it.
  SUPABASE_URL: z.url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  STORAGE_BUCKET_PRIVATE: z.string().min(1).optional(),
  // Vercel Cron authentication for the email-outbox drain route.
  // Required (>= 32 chars) in production when EMAIL_MODE != "off" —
  // enforced by the superRefine below.
  CRON_SECRET: z.string().min(32).optional(),
  // Dev-only query fan-out counter (context.md §7).
  DB_QUERY_STATS: z.enum(["true", "false"]).optional(),
  // Pool size for the runtime postgres.js client (default 3).
  DB_POOL_MAX: z.coerce.number().int().min(1).max(20).optional(),

  // --- Script-scoped (never read by Next.js code paths; optional here so
  // next build/start never requires them) ---
  SEED_SUPERADMIN_EMAIL: z.email().optional(),
  SEED_SUPERADMIN_NAME: z.string().min(1).optional(),
  TEST_DIRECT_URL: z
    .url()
    .refine((v) => /^postgres(ql)?:\/\//.test(v), "must be a postgres URL")
    .optional(),
  TEST_DATABASE_URL: z
    .url()
    .refine((v) => /^postgres(ql)?:\/\//.test(v), "must be a postgres URL")
    .optional(),
  // Escape hatch for running migrations against non-local hosts.
  MIGRATE_CONFIRM: z.literal("yes").optional(),
});

/**
 * Conditional rules for the email subsystem (context.md Prompt 4 §4.1):
 *  - `log` is dev/test only — production refuses it entirely.
 *  - `smtp` requires the full SMTP + sender identity set.
 *  - Any mode other than `off` needs NEXT_PUBLIC_APP_URL (https in prod)
 *    and, in production, a >= 32-char CRON_SECRET.
 */
const serverSchema = baseServerSchema.superRefine((env, ctx) => {
  const isProd = process.env.NODE_ENV === "production";

  if (env.EMAIL_MODE === "log" && isProd) {
    ctx.addIssue({
      code: "custom",
      path: ["EMAIL_MODE"],
      message: '"log" mode is development/test only — refused in production',
    });
  }

  if (env.EMAIL_MODE !== "off") {
    if (!env.NEXT_PUBLIC_APP_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_APP_URL"],
        message: "required when EMAIL_MODE is not off (email link building)",
      });
    } else if (isProd) {
      try {
        if (new URL(env.NEXT_PUBLIC_APP_URL).protocol !== "https:") {
          ctx.addIssue({
            code: "custom",
            path: ["NEXT_PUBLIC_APP_URL"],
            message: "must be an https URL in production",
          });
        }
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["NEXT_PUBLIC_APP_URL"],
          message: "must be a valid URL",
        });
      }
    }
    if (isProd && (!env.CRON_SECRET || env.CRON_SECRET.length < 32)) {
      ctx.addIssue({
        code: "custom",
        path: ["CRON_SECRET"],
        message: "required (>= 32 chars) in production when EMAIL_MODE != off",
      });
    }
  }

  if (env.EMAIL_MODE === "smtp") {
    const required: (keyof typeof env)[] = [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASSWORD",
      "SMTP_SECURE",
      "FROM_EMAIL",
      "FROM_NAME",
    ];
    for (const key of required) {
      if (env[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "required when EMAIL_MODE=smtp",
        });
      }
    }
  }
});

export type ServerEnv = z.infer<typeof serverSchema>;

/**
 * Pure parse entrypoint for tests — validates an arbitrary env object
 * (NODE_ENV is still read from process.env, so tests stub it).
 */
export function parseServerEnvFor(env: Record<string, string | undefined>) {
  return serverSchema.safeParse(env);
}

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

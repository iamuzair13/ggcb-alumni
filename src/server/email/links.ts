/**
 * Email link building — the ONLY way URLs enter a template. Links are
 * always `NEXT_PUBLIC_APP_URL` + a fixed path + a token query param;
 * callers can never inject a URL (open-redirect-proof by construction).
 */
import { getServerEnv } from "@/lib/config/env.server";

/** Fixed link paths — Prompt 5 implements these routes. */
export const EMAIL_LINK_PATHS = {
  verifyEmail: "/verify-email",
  resetPassword: "/reset-password",
  setPassword: "/set-password",
} as const;

/**
 * Base URL for links. Trailing slashes are stripped so template code can
 * always join `base + path`. Throws when unset — the env schema already
 * requires it for EMAIL_MODE != off, and enqueue guards `log`/`smtp`.
 */
export function emailBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || getServerEnv().AUTH_URL || "";
  const base = raw.replace(/\/+$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  return base;
}

/** `${base}${path}?token=<enc>` — token is URL-encoded, path is fixed. */
export function tokenLink(base: string, path: string, token: string): string {
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

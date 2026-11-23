/**
 * Password hashing + policy (context.md: argon2id). No server-only import so
 * the auth:set-password CLI and unit tests can use it directly.
 *
 * - ARGON2_PARAMS is the single parameter block (OWASP floor, tuned for
 *   serverless cold starts).
 * - verifyPassword() accepts ANY valid argon2id hash — parameters are read
 *   from the hash itself, so hashes made with different settings still
 *   verify. needsRehash() tells when to upgrade to current params.
 * - verifyPasswordWithTiming() always runs a real verify (against a fixed
 *   dummy hash when no hash exists) so timing never reveals whether an
 *   account exists.
 * - validatePasswordPolicy(): length by Unicode code points, no composition
 *   rules, common-password blocklist, email/name containment.
 */
import argon2 from "argon2";
import { COMMON_PASSWORDS } from "./data/common-passwords";

/**
 * OWASP argon2id floor: 19 MiB memory, 2 iterations, 1 lane.
 * Deliberately the OWASP minimum and not higher — hashing is the dominant
 * login latency on serverless cold starts, and this is already ~50–150 ms.
 */
export const ARGON2_PARAMS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const PASSWORD_MIN_CODEPOINTS = 10;
export const PASSWORD_MAX_CODEPOINTS = 128;

/** Fixed dummy hash — same params as real passwords, so timing matches. */
let dummyHashPromise: Promise<string> | undefined;
function dummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = argon2.hash("timing-dummy-password-!0", ARGON2_PARAMS);
  }
  return dummyHashPromise;
}

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_PARAMS);
}

export interface VerifyResult {
  /** true only when the plaintext matches the stored hash. */
  ok: boolean;
  /** true when ok && the stored hash used outdated parameters — rehash it. */
  needsRehash: boolean;
}

/**
 * Verifies `plain` against any valid argon2id hash. Invalid/corrupt hash
 * strings do not throw — they verify as false.
 */
export async function verifyPassword(
  hash: string | null,
  plain: string,
): Promise<VerifyResult> {
  if (!hash) return { ok: false, needsRehash: false };
  try {
    const ok = await argon2.verify(hash, plain);
    return { ok, needsRehash: ok && argon2.needsRehash(hash, ARGON2_PARAMS) };
  } catch {
    return { ok: false, needsRehash: false };
  }
}

/**
 * Timing-equalised verify: when `hash` is missing we still run a real
 * argon2 verify against a fixed dummy so "account exists" cannot be
 * measured from response time. Always returns ok=false for missing hashes.
 */
export async function verifyPasswordWithTiming(
  hash: string | null,
  plain: string,
): Promise<VerifyResult> {
  if (!hash) {
    await argon2.verify(await dummyHash(), plain).catch(() => {});
    return { ok: false, needsRehash: false };
  }
  return verifyPassword(hash, plain);
}

export type PolicyResult = { ok: true } | { ok: false; reason: string };

/**
 * Password policy: 10–128 Unicode code points, any characters incl.
 * spaces, NO composition rules; rejects common passwords and passwords
 * containing the user's email local-part or name (case-insensitive).
 */
export function validatePasswordPolicy(
  plain: string,
  context?: { email?: string; name?: string },
): PolicyResult {
  const length = [...plain].length; // Unicode code points, not UTF-16 units
  if (length < PASSWORD_MIN_CODEPOINTS) {
    return {
      ok: false,
      reason: `Must be at least ${PASSWORD_MIN_CODEPOINTS} characters`,
    };
  }
  if (length > PASSWORD_MAX_CODEPOINTS) {
    return {
      ok: false,
      reason: `Must be at most ${PASSWORD_MAX_CODEPOINTS} characters`,
    };
  }
  const lowered = plain.toLowerCase();
  if (COMMON_PASSWORDS.has(lowered)) {
    return {
      ok: false,
      reason: "That password is too common — choose something less predictable",
    };
  }
  const localPart = context?.email?.split("@")[0]?.toLowerCase();
  if (localPart && localPart.length >= 3 && lowered.includes(localPart)) {
    return { ok: false, reason: "Must not contain your email address" };
  }
  // Name containment: each word of the name (≥3 chars) and the squashed
  // full name — "john smith" blocks "johnsmith…" and "…john…".
  const name = context?.name?.trim().toLowerCase();
  if (name) {
    const squashed = name.replace(/\s+/g, "");
    const parts = name.split(/\s+/).filter((p) => p.length >= 3);
    if (
      (squashed.length >= 3 && lowered.includes(squashed)) ||
      parts.some((p) => lowered.includes(p))
    ) {
      return { ok: false, reason: "Must not contain your name" };
    }
  }
  return { ok: true };
}

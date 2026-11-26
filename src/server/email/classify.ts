/**
 * SMTP outcome classification + retry schedule.
 *
 *  - transient (timeouts, connection errors, 4xx, rate limits): retry with
 *    exponential backoff + jitter ≈ 1m, 5m, 15m, 1h, 6h.
 *  - permanent (5xx recipient/policy rejections, invalid address,
 *    payload-decryption failure): dead immediately (attempts=max_attempts).
 *
 * Pure functions — unit-testable without nodemailer or a database.
 */

export type FailureKind = "transient" | "permanent";

/**
 * SMTP response-code classes that mean "stop retrying": the recipient or
 * the message itself was rejected — retrying only annoys the provider.
 * 5xx EXCEPT quota/rate cases we treat as transient when the error marks
 * them (421/450/451/452 are temp failures by RFC 5321, and nodemailer
 * surfaces them as `responseCode`).
 */
const PERMANENT_CODES = new Set([
  500,
  501,
  502,
  503,
  504, // syntax/policy
  530,
  535, // auth problems — config fix required, not a retry fix
  550,
  551,
  552,
  553,
  554, // mailbox unavailable / user unknown / relay
]);
const TRANSIENT_CODES = new Set([421, 450, 451, 452, 454]); // try later

export interface ClassifiedError {
  kind: FailureKind;
  reason: string;
}

/**
 * Classify a send failure from a thrown error. nodemailer exposes
 * `code` (ECONNECTION/ETIMEDOUT/EAUTH/EMESSAGE/ESOCKET…), `responseCode`
 * (the SMTP reply), and `command`.
 */
export function classifySendError(err: unknown): FailureKind {
  const e = err as {
    code?: string;
    responseCode?: number;
    response?: string;
  } | null;
  if (!e) return "transient";

  const rc = typeof e.responseCode === "number" ? e.responseCode : 0;
  if (PERMANENT_CODES.has(rc)) return "permanent";
  if (TRANSIENT_CODES.has(rc)) return "transient";

  // Connection-level failures are always worth retrying.
  const code = e.code ?? "";
  if (
    code === "EAUTH" ||
    code === "EMESSAGE" ||
    code === "EFROM" ||
    code === "ETO"
  ) {
    // EMESSAGE/EFROM/ETO = invalid message/address — retrying is pointless.
    // EAUTH = provider credential problem — retrying is harmful (lockouts).
    return "permanent";
  }
  // ECONNECTION, ETIMEDOUT, ESOCKET, EENVELOPE-network-side → transient.
  return "transient";
}

/** Retry delay ladder in ms — indexed by the attempts count just used. */
export const BACKOFF_MS = [
  60_000, // ~1 min
  5 * 60_000, // ~5 min
  15 * 60_000, // ~15 min
  60 * 60_000, // ~1 h
  6 * 60 * 60_000, // ~6 h
] as const;

/**
 * Delay for the NEXT attempt after `attempts` sends have been used,
 * with ±20% uniform jitter to decouple concurrent workers.
 * `rand` is injectable for deterministic tests.
 */
export function backoffMs(attempts: number, rand: () => number = Math.random) {
  const base =
    BACKOFF_MS[Math.min(Math.max(attempts - 1, 0), BACKOFF_MS.length - 1)];
  const jitter = 0.8 + rand() * 0.4;
  return Math.round(base * jitter);
}

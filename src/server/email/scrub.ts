/**
 * Error scrubbing — `last_error`/`email_logs.error` must never carry
 * secrets. SMTP error strings can embed credentials (AUTH LOGIN echo),
 * one-time tokens (template payload accidentally stringified into the
 * error), or URLs with sensitive query strings. We keep the first
 * diagnostic line, drop credentials/tokens/query strings, and cap at
 * the column limit (500).
 */

const MAX_LEN = 500;

/** Anything that looks like a credential, token, or rendered body. */
const SECRETISH = [
  // argon2 hashes
  /\$argon2[a-z0-9]*\$[^\s]+/gi,
  // key=value secrets
  /(pass(word)?|token|secret|key|authorization|cookie|credential)[\s]*[=:][\s]*\S+/gi,
  // URLs with query strings (may carry tokens)
  /https?:\/\/[^\s"']*\?[^\s"']*/gi,
  // long opaque blobs (base64url/hex — token material)
  /\b[A-Za-z0-9_-]{48,}\b/g,
  // hex strings >= 32 chars
  /\b[0-9a-f]{32,}\b/gi,
];

export function scrubError(input: unknown, max = MAX_LEN): string {
  let s = String(input ?? "unknown error");
  // Keep only the first meaningful line — SMTP transcripts/bodies are
  // multi-line and must never reach the database.
  s = s.split(/[\r\n]/).find((l) => l.trim().length > 0) ?? "unknown error";
  for (const re of SECRETISH) s = s.replace(re, "[redacted]");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > max) s = `${s.slice(0, max - 1)}…`;
  return s;
}

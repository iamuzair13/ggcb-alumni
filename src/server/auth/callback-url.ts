/**
 * callbackUrl validation — open-redirect defence.
 *
 * Accepts ONLY relative, same-origin paths: must begin with a single `/`,
 * must not begin with `//` (protocol-relative), must not contain `\`,
 * a scheme (`:`), or control characters, and must still be safe after one
 * URL-decoding pass (so `%2f%2fevil.com`, `%255c`, etc. are rejected).
 * Pure function — usable in unit tests without a request context.
 */
const DANGEROUS_CHARS = /[\\\0-\x1f\x7f]/;

export function sanitizeCallbackUrl(
  input: unknown,
  fallback: string = "/",
): string {
  if (typeof input !== "string" || input.length === 0 || input.length > 1024) {
    return fallback;
  }
  // Decode once so encoded smuggling can't pass a raw-string check.
  let decoded: string;
  try {
    decoded = decodeURIComponent(input);
  } catch {
    return fallback;
  }
  const candidate = decoded === input ? input : decoded;
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes(":") || // kills https:, javascript:, data:
    DANGEROUS_CHARS.test(candidate)
  ) {
    return fallback;
  }
  return candidate;
}

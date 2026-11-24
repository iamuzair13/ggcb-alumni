import { describe, expect, it } from "vitest";
import { scrubError } from "@/server/email/scrub";
import {
  backoffMs,
  BACKOFF_MS,
  classifySendError,
} from "@/server/email/classify";

describe("scrubError", () => {
  it("caps at 500 chars, single line", () => {
    const out = scrubError(`line1\r\nline2 ${"x".repeat(600)}`);
    expect(out).toBe("line1");
  });
  it("strips credential-like key=value", () => {
    expect(scrubError("auth failed password=hunter2")).toContain("[redacted]");
    expect(scrubError("AUTH LOGIN token=abc123")).toContain("[redacted]");
    expect(scrubError("Bearer Authorization: xyz")).toContain("[redacted]");
  });
  it("strips URLs with query strings (token carriers)", () => {
    const out = scrubError(
      "callback https://x.test/reset?token=SECRET123 failed",
    );
    expect(out).not.toContain("SECRET123");
    expect(out).toContain("[redacted]");
  });
  it("strips argon hashes and long opaque blobs", () => {
    expect(scrubError("hash $argon2id$v=19$m=1$t=1$p=1$abc$def")).toContain(
      "[redacted]",
    );
    expect(scrubError("tok " + "A1b2_".repeat(12) + "c")).toContain(
      "[redacted]",
    );
  });
  it("keeps the useful diagnostic head", () => {
    const out = scrubError("Connection timeout after 20000ms\n<trim>");
    expect(out).toBe("Connection timeout after 20000ms");
  });
});

describe("classifySendError — SMTP code → transient/permanent", () => {
  const cases: [number | undefined, string | undefined, string][] = [
    [421, undefined, "transient"],
    [450, undefined, "transient"],
    [451, undefined, "transient"],
    [452, undefined, "transient"],
    [454, undefined, "transient"],
    [550, undefined, "permanent"],
    [551, undefined, "permanent"],
    [553, undefined, "permanent"],
    [554, undefined, "permanent"],
    [535, undefined, "permanent"], // auth — retrying causes lockouts
    [undefined, "ECONNECTION", "transient"],
    [undefined, "ETIMEDOUT", "transient"],
    [undefined, "ESOCKET", "transient"],
    [undefined, "EAUTH", "permanent"],
    [undefined, "EMESSAGE", "permanent"],
    [undefined, "EFROM", "permanent"],
    [undefined, "ETO", "permanent"],
    [undefined, undefined, "transient"],
  ];
  it.each(cases)("responseCode=%s code=%s → %s", (rc, code, expected) => {
    expect(classifySendError({ responseCode: rc, code })).toBe(expected);
  });
});

describe("backoffMs", () => {
  it("schedule ≈ 1m,5m,15m,1h,6h within ±20% jitter", () => {
    const expected = [60_000, 300_000, 900_000, 3_600_000, 21_600_000];
    for (let attempt = 1; attempt <= 6; attempt++) {
      const base = expected[Math.min(attempt - 1, expected.length - 1)];
      const v = backoffMs(attempt, () => 0.5);
      expect(v).toBe(base); // rand 0.5 → jitter 1.0
      const lo = backoffMs(attempt, () => 0);
      const hi = backoffMs(attempt, () => 0.9999);
      expect(lo).toBeGreaterThanOrEqual(base * 0.8 - 1);
      expect(hi).toBeLessThanOrEqual(base * 1.2 + 1);
    }
  });
  it("clamps beyond the ladder at 6h", () => {
    expect(backoffMs(10, () => 0.5)).toBe(21_600_000);
  });
  it("BACKOFF_MS ordering documented", () => {
    expect([...BACKOFF_MS]).toEqual([...BACKOFF_MS].sort((a, b) => a - b));
  });
});

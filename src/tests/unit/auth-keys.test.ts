import { describe, expect, it } from "vitest";
import { deriveAuthKey, hashAttemptKey } from "@/server/auth/keys";

describe("HKDF key derivation", () => {
  it("is deterministic for the same label+secret", () => {
    expect(deriveAuthKey("a", "secret-x")).toEqual(
      deriveAuthKey("a", "secret-x"),
    );
  });
  it("produces different keys per label (domain separation)", () => {
    expect(deriveAuthKey("label-a", "s")).not.toEqual(
      deriveAuthKey("label-b", "s"),
    );
  });
  it("produces different keys per secret", () => {
    expect(deriveAuthKey("label", "secret-1")).not.toEqual(
      deriveAuthKey("label", "secret-2"),
    );
  });
});

describe("hashAttemptKey", () => {
  it("returns a 64-hex HMAC-SHA256 (opaque, never the raw value)", () => {
    const h = hashAttemptKey("email:a@b.c", "secret");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("a@b.c");
  });
  it("is stable for equal inputs, different for different inputs", () => {
    const a = hashAttemptKey("ip:1.2.3.4", "s");
    expect(hashAttemptKey("ip:1.2.3.4", "s")).toBe(a);
    expect(hashAttemptKey("ip:1.2.3.5", "s")).not.toBe(a);
    expect(hashAttemptKey("email:a@b.c", "s")).not.toBe(a);
  });
});

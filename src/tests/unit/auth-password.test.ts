import { describe, expect, it } from "vitest";
import argon2 from "argon2";
import {
  hashPassword,
  verifyPassword,
  verifyPasswordWithTiming,
  validatePasswordPolicy,
} from "@/server/auth/password";

describe("password hashing (argon2id)", () => {
  it("hashes and verifies a round-trip", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).toContain("m=19456");
    expect(hash).toContain("t=2");
    expect(hash).toContain("p=1");
    expect((await verifyPassword(hash, "correct horse battery")).ok).toBe(true);
    expect((await verifyPassword(hash, "wrong")).ok).toBe(false);
  });

  it("verifies a hash created with DIFFERENT parameters and flags rehash", async () => {
    const weak = await argon2.hash("some old password", {
      type: argon2.argon2id,
      memoryCost: 4096,
      timeCost: 1,
      parallelism: 1,
    });
    const r = await verifyPassword(weak, "some old password");
    expect(r.ok).toBe(true);
    expect(r.needsRehash).toBe(true);
  });

  it("does not flag rehash for current params", async () => {
    const hash = await hashPassword("a fresh password");
    expect((await verifyPassword(hash, "a fresh password")).needsRehash).toBe(
      false,
    );
  });

  it("returns ok=false (no throw) for corrupt hash strings", async () => {
    expect((await verifyPassword("not-a-hash", "x")).ok).toBe(false);
  });

  it("dummy timing path: null hash still runs a verify and returns ok=false", async () => {
    const r = await verifyPasswordWithTiming(null, "anything");
    expect(r.ok).toBe(false);
    // And a real hash still verifies through the same entry point.
    const hash = await hashPassword("real password");
    expect((await verifyPasswordWithTiming(hash, "real password")).ok).toBe(
      true,
    );
  });
});

describe("password policy", () => {
  it("enforces 10–128 by Unicode code points (emoji count once)", () => {
    expect(validatePasswordPolicy("short").ok).toBe(false);
    // 10 code points including astral emoji — must count as ONE code point.
    expect(validatePasswordPolicy("🔒".repeat(10)).ok).toBe(true);
    expect(validatePasswordPolicy("x".repeat(128)).ok).toBe(true);
    expect(validatePasswordPolicy("x".repeat(129)).ok).toBe(false);
  });

  it("has NO composition rules (all-lowercase, no digits/symbols is fine)", () => {
    expect(validatePasswordPolicy("thisisaquietlowercasepassphrase").ok).toBe(
      true,
    );
    expect(validatePasswordPolicy("spaces are allowed here").ok).toBe(true);
  });

  it("rejects blocklisted passwords (case-insensitive)", () => {
    expect(validatePasswordPolicy("password").ok).toBe(false);
    expect(validatePasswordPolicy("PASSWORD").ok).toBe(false);
    expect(validatePasswordPolicy("dragon").ok).toBe(false);
    expect(validatePasswordPolicy("1234567890").ok).toBe(false);
  });

  it("rejects passwords containing email local-part or name", () => {
    expect(
      validatePasswordPolicy("mynameismail99", {
        email: "mynameismail99@x.com",
      }).ok,
    ).toBe(false);
    expect(
      validatePasswordPolicy("janedoeverysecretpass", {
        email: "u@x.com",
        name: "jane doe",
      }).ok,
    ).toBe(false);
    // short (<3 char) local parts/names are not checked
    expect(
      validatePasswordPolicy("contains the word ab", {
        email: "ab@x.com",
        name: "Al",
      }).ok,
    ).toBe(true);
  });
});

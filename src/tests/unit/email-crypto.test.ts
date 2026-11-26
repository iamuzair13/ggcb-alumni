import { describe, expect, it } from "vitest";
import {
  decryptPayload,
  encryptPayload,
  isPayloadEnvelope,
  PayloadDecryptError,
} from "@/server/email/crypto";

const SECRET = "a".repeat(48);
const OTHER = "b".repeat(48);

describe("payload encryption (AES-256-GCM envelope)", () => {
  const payload = { name: "Ali", token: "tok_123", n: 1 };

  it("round-trips", () => {
    const env = encryptPayload(payload, SECRET);
    expect(isPayloadEnvelope(env)).toBe(true);
    expect(decryptPayload(env, SECRET)).toEqual(payload);
  });

  it("stores no plaintext — token never appears in the envelope", () => {
    const env = encryptPayload(payload, SECRET);
    const json = JSON.stringify(env);
    expect(json).not.toContain("tok_123");
    expect(json).not.toContain("Ali");
    expect(Object.keys(env).sort()).toEqual(["ct", "iv", "tag", "v"]);
  });

  it("unique IVs — same payload encrypts differently", () => {
    const a = encryptPayload(payload, SECRET);
    const b = encryptPayload(payload, SECRET);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it("tamper detection — flipped ct byte fails decryption", () => {
    const env = encryptPayload(payload, SECRET);
    const tampered = { ...env, ct: `${env.ct.slice(0, -2)}AA` };
    expect(() => decryptPayload(tampered, SECRET)).toThrow(PayloadDecryptError);
  });

  it("tampered tag fails", () => {
    const env = encryptPayload(payload, SECRET);
    const tampered = {
      ...env,
      tag: Buffer.from("wrongwrongwrongw").toString("base64"),
    };
    expect(() => decryptPayload(tampered, SECRET)).toThrow(PayloadDecryptError);
  });

  it("wrong key (rotated AUTH_SECRET) fails — permanent failure path", () => {
    const env = encryptPayload(payload, SECRET);
    expect(() => decryptPayload(env, OTHER)).toThrow(PayloadDecryptError);
  });

  it("malformed inputs fail", () => {
    for (const bad of [null, {}, "x", { v: 2 }, { v: 1, iv: "a" }]) {
      expect(() => decryptPayload(bad, SECRET)).toThrow(PayloadDecryptError);
    }
  });
});

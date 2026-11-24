/**
 * Outbox payload encryption — AES-256-GCM with a key derived via
 * HKDF-SHA256 from AUTH_SECRET under a fixed label (never the raw secret).
 *
 * Envelope (stored in the existing jsonb column):
 *   { v: 1, iv: <b64>, tag: <b64>, ct: <b64> }
 *
 * GCM is authenticated: any tamper fails at decrypt. Rotating AUTH_SECRET
 * makes pending rows undecryptable — the worker treats that as a permanent
 * failure with a scrubbed error (docs/ops/email.md §key-rotation).
 *
 * Deliberately free of env/`server-only` imports so unit tests and scripts
 * can call it — the caller supplies the secret.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { deriveAuthKey } from "@/server/auth/keys";

const KEY_LABEL = "email-outbox-payload";
const VERSION = 1;

export interface PayloadEnvelope {
  v: number;
  iv: string;
  tag: string;
  ct: string;
}

export class PayloadDecryptError extends Error {
  constructor() {
    super("payload decryption failed");
    this.name = "PayloadDecryptError";
  }
}

export function isPayloadEnvelope(v: unknown): v is PayloadEnvelope {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as PayloadEnvelope).v === VERSION &&
    typeof (v as PayloadEnvelope).iv === "string" &&
    typeof (v as PayloadEnvelope).tag === "string" &&
    typeof (v as PayloadEnvelope).ct === "string"
  );
}

export function encryptPayload(
  payload: Record<string, unknown>,
  secret: string,
): PayloadEnvelope {
  const key = deriveAuthKey(KEY_LABEL, secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return {
    v: VERSION,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ct: ct.toString("base64"),
  };
}

/** Throws PayloadDecryptError on tamper, wrong key, or malformed input. */
export function decryptPayload(
  envelope: unknown,
  secret: string,
): Record<string, unknown> {
  try {
    if (!isPayloadEnvelope(envelope)) throw new PayloadDecryptError();
    const key = deriveAuthKey(KEY_LABEL, secret);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const pt = Buffer.concat([
      decipher.update(Buffer.from(envelope.ct, "base64")),
      decipher.final(),
    ]);
    const obj: unknown = JSON.parse(pt.toString("utf8"));
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
      throw new PayloadDecryptError();
    }
    return obj as Record<string, unknown>;
  } catch (e) {
    if (e instanceof PayloadDecryptError) throw e;
    throw new PayloadDecryptError();
  }
}

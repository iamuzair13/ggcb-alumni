import { describe, expect, it } from "vitest";
import { smtpOptions } from "@/server/email/transport";

/** STARTTLS/TLS posture per spec §4.6 — a stubbed-config unit test. */
describe("smtpOptions", () => {
  const BASE = {
    SMTP_HOST: "mail.example.test",
    SMTP_PORT: 587,
    SMTP_USER: "u",
    SMTP_PASSWORD: "p",
  };

  it("SMTP_SECURE=false → STARTTLS required (requireTLS, not implicit)", () => {
    const o = smtpOptions({ ...BASE, SMTP_SECURE: "false" }) as {
      secure: boolean;
      requireTLS: boolean;
    };
    expect(o.secure).toBe(false);
    expect(o.requireTLS).toBe(true);
  });

  it("SMTP_SECURE=true → implicit TLS, no STARTTLS upgrade", () => {
    const o = smtpOptions({ ...BASE, SMTP_SECURE: "true" }) as {
      secure: boolean;
      requireTLS: boolean;
    };
    expect(o.secure).toBe(true);
    expect(o.requireTLS).toBe(false);
  });

  it("strict timeouts + TLS>=1.2 + non-pooled", () => {
    const o = smtpOptions({ ...BASE, SMTP_SECURE: "false" }) as Record<
      string,
      unknown
    >;
    expect(o.connectionTimeout).toBe(10_000);
    expect(o.greetingTimeout).toBe(10_000);
    expect(o.socketTimeout).toBe(20_000);
    expect((o.tls as { minVersion: string }).minVersion).toBe("TLSv1.2");
    // nodemailer only pools when pool:true — absent means per-run transport.
    expect("pool" in o).toBe(false);
  });
});

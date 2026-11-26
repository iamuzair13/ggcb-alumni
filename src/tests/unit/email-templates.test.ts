import { describe, expect, it } from "vitest";
import {
  TEMPLATES,
  TEMPLATE_NAMES,
  type TemplateName,
} from "@/server/email/templates";
import { EMAIL_LINK_PATHS, tokenLink } from "@/server/email/links";
import {
  escapeHtml,
  isValidEmailAddress,
  singleLine,
  subjectLine,
} from "@/server/email/escape";

const CTX = { baseUrl: "https://alumni.example.edu.pk" };

/** Sample payloads per template (schema-valid minimal). */
const SAMPLES: Record<TemplateName, Record<string, unknown>> = {
  email_verification: {
    name: "Ali",
    token: "tok_verify_0123456789",
    expiresHours: 24,
  },
  registration_received: { name: "Ali" },
  registration_approved: { name: "Ali" },
  registration_rejected: { name: "Ali", reason: "Record not found" },
  password_reset: {
    name: "Ali",
    token: "tok_reset_0123456789",
    expiresHours: 1,
  },
  password_changed: { name: "Ali" },
  staff_invitation: {
    name: "Ali",
    role: "admin",
    token: "tok_set_012345678901",
    expiresHours: 72,
  },
  ecard_issued: { name: "Ali" },
  story_approved: { name: "Ali", title: "My Story" },
  story_rejected: { name: "Ali", title: "My Story", reason: "Needs edits" },
  change_request_decided: {
    name: "Ali",
    decision: "rejected",
    reason: "No proof",
  },
  smtp_test: { note: "diag" },
};

const HOSTILE = {
  name: "<script>alert(1)</script>\nX-Injected: yes",
  token: "tok_abcdefghijklmnopqrstuvwxyz123456",
  expiresHours: 24,
  reason: '"><img src=x onerror=alert(1)>\r\nBcc: x@y.z',
  title: "<b onclick=alert(1)>story</b>\nSubject: hijack",
  role: "admin" as const,
  decision: "rejected" as const,
};

describe("template catalogue", () => {
  it("all 12 spec templates exist", () => {
    expect(TEMPLATE_NAMES).toEqual(
      expect.arrayContaining([
        "email_verification",
        "registration_received",
        "registration_approved",
        "registration_rejected",
        "password_reset",
        "password_changed",
        "staff_invitation",
        "ecard_issued",
        "story_approved",
        "story_rejected",
        "change_request_decided",
        "smtp_test",
      ]),
    );
    expect(TEMPLATE_NAMES).toHaveLength(12);
  });

  it.each(TEMPLATE_NAMES)(
    "%s: schema accepts its sample, HTML+text render",
    (name) => {
      const tpl = TEMPLATES[name];
      const parsed = tpl.payloadSchema.parse(SAMPLES[name]) as Record<
        string,
        unknown
      >;
      const subject = tpl.subject(parsed);
      const html = tpl.html(parsed, CTX);
      const text = tpl.text(parsed, CTX);
      expect(subject.length).toBeGreaterThan(3);
      expect(subject).not.toMatch(/[\r\n]/);
      expect(html).toContain("<!doctype html>");
      expect(text.length).toBeGreaterThan(20);
      // No remote content of any kind.
      for (const bad of [
        "http://",
        "https://",
        "src=",
        "<img",
        "<script",
        "url(",
        "@import",
        "<link",
      ]) {
        if (
          bad.startsWith("http") &&
          (html.includes("/verify-email?") ||
            html.includes("/reset-password?") ||
            html.includes("/set-password?"))
        )
          continue;
        expect(html.toLowerCase()).not.toContain(bad);
      }
    },
  );

  it.each(TEMPLATE_NAMES)("%s: hostile corpus is escaped/flattened", (name) => {
    const tpl = TEMPLATES[name];
    // Overwrite each free-text field the schema has with hostile input.
    const filled = { ...SAMPLES[name] } as Record<string, unknown>;
    for (const k of ["name", "reason", "title", "note"]) {
      if (k in filled) filled[k] = HOSTILE[k === "title" ? "title" : "reason"];
    }
    if ("name" in filled) filled.name = HOSTILE.name;
    const parsed = tpl.payloadSchema.parse(filled) as Record<string, unknown>;
    const subject = tpl.subject(parsed);
    const html = tpl.html(parsed, CTX);
    const text = tpl.text(parsed, CTX);
    expect(subject).not.toMatch(/[\r\n]/);
    // No LIVE tag can survive escaping — only the inert text remains.
    for (const bad of ["<script", "<img", "<b ", "<a href=javascript"]) {
      expect(html.toLowerCase()).not.toContain(bad);
    }
    expect(html).toContain("&lt;"); // escaped content is present
    expect(text.length).toBeGreaterThan(0);
  });

  it("token templates build links only from baseUrl + fixed path", () => {
    for (const [name, path] of [
      ["email_verification", "/verify-email"],
      ["password_reset", "/reset-password"],
      ["staff_invitation", "/set-password"],
    ] as const) {
      const tpl = TEMPLATES[name];
      const p = tpl.payloadSchema.parse(SAMPLES[name]) as Record<
        string,
        unknown
      >;
      const html = tpl.html(p, CTX);
      const text = tpl.text(p, CTX);
      const expected = `${CTX.baseUrl}${path}?token=`;
      expect(html).toContain(expected);
      expect(text).toContain(expected);
      // No other URL anywhere.
      const urls = text.match(/https?:\/\/\S+/g) ?? [];
      for (const u of urls) expect(u.startsWith(CTX.baseUrl + path)).toBe(true);
    }
  });

  it("EMAIL_LINK_PATHS match spec §4.4", () => {
    expect(EMAIL_LINK_PATHS).toEqual({
      verifyEmail: "/verify-email",
      resetPassword: "/reset-password",
      setPassword: "/set-password",
    });
  });

  it("tokenLink URL-encodes the token", () => {
    const u = tokenLink("https://x.test", "/verify-email", "a b+c?d");
    expect(u).toBe("https://x.test/verify-email?token=a%20b%2Bc%3Fd");
  });

  it("throttle defaults: sensitive 3/hr, others 10/hr", () => {
    expect(TEMPLATES.email_verification.throttle).toEqual({
      max: 3,
      windowSeconds: 3600,
    });
    expect(TEMPLATES.password_reset.throttle).toEqual({
      max: 3,
      windowSeconds: 3600,
    });
    for (const n of TEMPLATE_NAMES.filter(
      (n) =>
        ![
          "email_verification",
          "password_reset",
          "staff_invitation",
          "smtp_test",
        ].includes(n),
    )) {
      expect(TEMPLATES[n].throttle.max).toBe(10);
    }
  });

  it("payload schemas reject extra/missing fields", () => {
    expect(
      TEMPLATES.password_reset.payloadSchema.safeParse({ name: "x" }).success,
    ).toBe(false);
    expect(
      TEMPLATES.email_verification.payloadSchema.safeParse({
        name: "x",
        token: "short",
        expiresHours: 1,
      }).success,
    ).toBe(false);
    expect(
      TEMPLATES.story_approved.payloadSchema.safeParse({
        name: "x",
        title: "t",
        extra: "y",
      }).success,
    ).toBe(false);
  });
});

describe("escape helpers", () => {
  it("escapeHtml covers the five dangerous chars", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;",
    );
  });
  it("singleLine strips CR/LF and caps", () => {
    expect(singleLine("a\r\nb\nc", 200)).toBe("a b c");
    expect(singleLine("x".repeat(300), 10)).toBe("xxxxxxxxx…");
  });
  it("subjectLine never contains newlines", () => {
    expect(subjectLine("a\nb\rc")).toBe("a b c");
  });
});

describe("address validation corpus", () => {
  it.each([
    "a@b.co",
    "first.last@college.edu.pk",
    "x+tag@y.io",
    "o'malley@x.org",
  ])("valid: %s", (v) => expect(isValidEmailAddress(v)).toBe(true));
  it.each([
    "a@b.co\nBcc:x@y.z",
    "a@b.co\r\nSubject:x",
    "a b@c.com",
    "@x.com",
    "a@",
    "a@@b.com",
    `${"a".repeat(65)}@b.co`,
    `${"a".repeat(255)}@b.co`,
    "",
    "a@b",
  ])("invalid: %s", (v) => expect(isValidEmailAddress(v)).toBe(false));
});

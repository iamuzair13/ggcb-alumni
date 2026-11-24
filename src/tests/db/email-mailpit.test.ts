import { describe, expect, it } from "vitest";
import nodemailer from "nodemailer";
import {
  TEMPLATES,
  TEMPLATE_NAMES,
  type TemplateName,
} from "@/server/email/templates";

/**
 * Real-SMTP integration (spec §7): every template rendered and sent
 * through nodemailer into Mailpit; bodies + recipients + link shape are
 * asserted via the Mailpit HTTP API. Runs when MAILPIT_API_URL and
 * MAILPIT_SMTP_PORT are set (CI service / docker-compose); skips cleanly
 * otherwise. STARTTLS-requiring behaviour is covered by unit tests with a
 * stubbed transporter (no TLS listener needed).
 */
const API = process.env.MAILPIT_API_URL;
const PORT = Number(process.env.MAILPIT_SMTP_PORT ?? 0);
const hasMailpit = Boolean(API && PORT);

const CTX = { baseUrl: "https://alumni.example.test" };
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
  change_request_decided: { name: "Ali", decision: "approved" },
  smtp_test: { note: "mailpit" },
};

interface MailpitMessage {
  ID: string;
  To: { Address: string }[];
  Subject: string;
  Text?: string;
  HTML?: string;
}

async function latestFor(to: string): Promise<MailpitMessage> {
  const res = await fetch(
    `${API}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
  );
  const data = (await res.json()) as { messages?: { ID: string }[] };
  const id = data.messages?.[0]?.ID;
  if (!id) throw new Error("message not found in Mailpit");
  const full = await fetch(`${API}/api/v1/message/${id}`);
  return (await full.json()) as MailpitMessage;
}

describe.skipIf(!hasMailpit)("mailpit integration — real SMTP send", () => {
  it.each(TEMPLATE_NAMES)(
    "%s delivers + renders correctly",
    async (name) => {
      const to = `${name}@mailpit.test`;
      const tpl = TEMPLATES[name];
      const p = tpl.payloadSchema.parse(SAMPLES[name]) as Record<
        string,
        unknown
      >;
      const transport = nodemailer.createTransport({
        host: "localhost",
        port: PORT,
        secure: false,
        // Mailpit accepts non-TLS dev delivery; STARTTLS enforcement is a
        // separate unit-tested path (requireTLS on the transport config).
      });
      await transport.sendMail({
        from: "GGCB <noreply@ggcb.test>",
        to,
        subject: tpl.subject(p),
        text: tpl.text(p, CTX),
        html: tpl.html(p, CTX),
      });

      const msg = await latestFor(to);
      expect(msg.To?.[0]?.Address ?? "").toBe(to);
      expect(msg.Subject).toBe(tpl.subject(p));
      expect(msg.Text ?? "").toBe(tpl.text(p, CTX));
      expect(msg.HTML).toContain("<!doctype html>");
      // Link shape: only baseUrl+fixed-path URLs ever appear.
      if (
        ["email_verification", "password_reset", "staff_invitation"].includes(
          name,
        )
      ) {
        const urls = (msg.Text ?? "").match(/https?:\/\/\S+/g) ?? [];
        expect(urls.length).toBe(1);
        expect(urls[0]?.startsWith(CTX.baseUrl)).toBe(true);
      }
      transport.close();
    },
    30_000,
  );
});

import "server-only";
/**
 * Mail transport factory — one fresh transporter per worker run
 * (serverless: no connection pooling across invocations).
 *
 * Three modes (spec §4.1):
 *   off  → no transport at all (worker exits without touching rows)
 *   log  → dev/test only; prints recipient/subject/TEXT body, marks sent
 *   smtp → nodemailer SMTP with strict timeouts and TLS posture
 *
 * Never logs credentials, full connection options, or rendered HTML.
 */
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { getServerEnv } from "@/lib/config/env.server";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  /** Message-ID domain (FROM domain) — set by the worker. */
  messageIdDomain?: string;
}

export type MailTransport = Pick<Transporter, "sendMail">;

/** Dev/test console transport — no network, redacts nothing it prints? */
function logTransport(): MailTransport {
  return {
    async sendMail(msg) {
      // Spec §4.1: prints recipient, template subject, and the rendered
      // TEXT body so a developer can click the link. Never the HTML.
      const text = (msg as { text?: string }).text ?? "";
      console.log(
        `[email:log] to=${(msg as { to?: string }).to} subject=${(msg as { subject?: string }).subject}\n${text}`,
      );
      return { messageId: `<log-${Date.now()}@local>` };
    },
  };
}

/** Pure options builder — unit-testable without a transporter/env cache. */
export function smtpOptions(env: {
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_SECURE?: string;
}): SMTPTransport.Options {
  const secure = env.SMTP_SECURE === "true";
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure, // true = implicit TLS (465); false = STARTTLS required
    requireTLS: !secure, // refuse plaintext AUTH when secure=false
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    tls: { minVersion: "TLSv1.2" },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    // nodemailer is non-pooled by default — a fresh transporter per run
    // keeps nothing alive across serverless invocations.
  };
}

/** Strict-timeout SMTP transport (spec §4.6). */
export function createSmtpTransport(): MailTransport {
  return nodemailer.createTransport(smtpOptions(getServerEnv()));
}

/**
 * Transport for the current EMAIL_MODE, or null for `off`.
 * `log` mode is refused in production by env validation; belt+braces here.
 */
export function transportForCurrentMode(): MailTransport | null {
  const env = getServerEnv();
  switch (env.EMAIL_MODE) {
    case "off":
      return null;
    case "log":
      if (process.env.NODE_ENV === "production") {
        throw new Error("EMAIL_MODE=log is not allowed in production");
      }
      return logTransport();
    case "smtp":
      return createSmtpTransport();
  }
}

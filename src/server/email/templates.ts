/**
 * Transactional template catalogue (spec §4.4) — every email the product
 * will ever send, defined NOW so later prompts only call enqueueEmail.
 *
 * Contract per template:
 *   payloadSchema  — strict Zod; enqueue validates before storing
 *   subject(p)     — single-line (subjectLine strips CR/LF + caps)
 *   html(p, ctx)   — rendered via the shared layout; every value escaped
 *   text(p, ctx)   — plain alternative (always present)
 *   throttle       — max sends per recipient per window (spec defaults)
 *
 * `ctx.baseUrl` is the configured app URL — templates NEVER take a caller-
 * supplied link; token links are built here from fixed paths only
 * (EMAIL_LINK_PATHS — implemented by Prompt 5).
 */
import { z } from "zod";
import { EMAIL_BRAND } from "./brand";
import { cappedText, escapeHtml, singleLine, subjectLine } from "./escape";
import { EMAIL_LINK_PATHS, tokenLink } from "./links";
import { ctaHtml, emailHtml, emailText, para } from "./layout";

export interface TemplateContext {
  baseUrl: string;
}

export interface ThrottleRule {
  /** Max messages per recipient+template inside `windowSeconds`. */
  max: number;
  windowSeconds: number;
}

/**
 * Renderers take the VALIDATED payload as `Record<string, unknown>` —
 * enqueue always schema-validates before this is called. The helpers
 * (escapeHtml/singleLine/cappedText) accept unknown by design.
 */
export interface EmailTemplate {
  payloadSchema: z.ZodType;
  subject: (p: Record<string, unknown>) => string;
  html: (p: Record<string, unknown>, ctx: TemplateContext) => string;
  text: (p: Record<string, unknown>, ctx: TemplateContext) => string;
  throttle: ThrottleRule;
}

// ---- shared helpers ----------------------------------------------------

const HOURLY: ThrottleRule = { max: 10, windowSeconds: 3600 };
const SENSITIVE: ThrottleRule = { max: 3, windowSeconds: 3600 }; // token links

const name = z.string().min(1).max(200);
const reason = z.string().min(1).max(2000);
const token = z.string().min(16).max(512);

function greet(n: unknown): string {
  return para(`Dear ${escapeHtml(singleLine(n))},`);
}
function textGreet(n: unknown): string {
  return `Dear ${singleLine(n)},`;
}
const IGNORE = "If you did not request this message, please ignore it.";

// ---- catalogue ---------------------------------------------------------

const emailVerification: EmailTemplate = {
  payloadSchema: z
    .object({ name, token, expiresHours: z.number().int().positive() })
    .strict(),
  throttle: SENSITIVE,
  subject: () =>
    subjectLine(`${EMAIL_BRAND.shortName} Alumni Portal — verify your email`),
  html: (p, ctx) =>
    emailHtml({
      heading: "Verify your email",
      bodyHtml:
        greet(p.name) +
        para(
          "Thank you for registering with the alumni portal. Confirm this email address to continue:",
        ) +
        ctaHtml(
          tokenLink(ctx.baseUrl, EMAIL_LINK_PATHS.verifyEmail, String(p.token)),
          "Verify email",
        ) +
        para(`This link expires in ${escapeHtml(p.expiresHours)} hours.`),
      afterHtml: IGNORE,
    }),
  text: (p, ctx) =>
    emailText([
      textGreet(p.name),
      "",
      "Confirm this email address by opening:",
      tokenLink(ctx.baseUrl, EMAIL_LINK_PATHS.verifyEmail, String(p.token)),
      `This link expires in ${String(p.expiresHours)} hours.`,
      "",
      IGNORE,
    ]),
};

const registrationReceived: EmailTemplate = {
  payloadSchema: z.object({ name }).strict(),
  throttle: HOURLY,
  subject: () => subjectLine("Registration received — pending review"),
  html: (p) =>
    emailHtml({
      heading: "Registration received",
      bodyHtml:
        greet(p.name) +
        para(
          "We received your alumni registration. It is now pending review by the college — you will get another message once a decision is made.",
        ),
    }),
  text: (p) =>
    emailText([
      textGreet(p.name),
      "",
      "Your alumni registration was received and is pending review. You will get another message once a decision is made.",
    ]),
};

const registrationApproved: EmailTemplate = {
  payloadSchema: z.object({ name }).strict(),
  throttle: HOURLY,
  subject: () => subjectLine("Registration approved — welcome back"),
  html: (p) =>
    emailHtml({
      heading: "Registration approved",
      bodyHtml:
        greet(p.name) +
        para(
          "Your alumni registration has been approved. You can now sign in and use the alumni features of the portal.",
        ),
    }),
  text: (p) =>
    emailText([
      textGreet(p.name),
      "",
      "Your alumni registration has been approved. You can now sign in to the portal.",
    ]),
};

const registrationRejected: EmailTemplate = {
  payloadSchema: z.object({ name, reason }).strict(),
  throttle: HOURLY,
  subject: () => subjectLine("Registration update — not approved"),
  html: (p) =>
    emailHtml({
      heading: "Registration not approved",
      bodyHtml:
        greet(p.name) +
        para(
          "Your alumni registration was reviewed and could not be approved at this time.",
        ) +
        para(
          `<strong>Reason:</strong> ${escapeHtml(cappedText(p.reason, 500))}`,
        ) +
        para("If you believe this is a mistake, please contact the college."),
    }),
  text: (p) =>
    emailText([
      textGreet(p.name),
      "",
      "Your alumni registration could not be approved at this time.",
      `Reason: ${cappedText(p.reason, 500)}`,
      "If you believe this is a mistake, please contact the college.",
    ]),
};

const passwordReset: EmailTemplate = {
  payloadSchema: z
    .object({ name, token, expiresHours: z.number().int().positive() })
    .strict(),
  throttle: SENSITIVE,
  subject: () =>
    subjectLine(`${EMAIL_BRAND.shortName} Alumni Portal — reset your password`),
  html: (p, ctx) =>
    emailHtml({
      heading: "Reset your password",
      bodyHtml:
        greet(p.name) +
        para(
          "A password reset was requested for your account. Continue here:",
        ) +
        ctaHtml(
          tokenLink(
            ctx.baseUrl,
            EMAIL_LINK_PATHS.resetPassword,
            String(p.token),
          ),
          "Reset password",
        ) +
        para(`This link expires in ${escapeHtml(p.expiresHours)} hours.`),
      afterHtml: IGNORE,
    }),
  text: (p, ctx) =>
    emailText([
      textGreet(p.name),
      "",
      "Reset your password by opening:",
      tokenLink(ctx.baseUrl, EMAIL_LINK_PATHS.resetPassword, String(p.token)),
      `This link expires in ${String(p.expiresHours)} hours.`,
      "",
      IGNORE,
    ]),
};

const passwordChanged: EmailTemplate = {
  payloadSchema: z.object({ name }).strict(),
  throttle: HOURLY,
  subject: () => subjectLine("Your password was changed"),
  html: (p) =>
    emailHtml({
      heading: "Password changed",
      bodyHtml: greet(p.name) + para("Your account password was just changed."),
      afterHtml:
        "If you did not make this change, contact the college immediately.",
    }),
  text: (p) =>
    emailText([
      textGreet(p.name),
      "",
      "Your account password was just changed.",
      "If you did not make this change, contact the college immediately.",
    ]),
};

const staffInvitation: EmailTemplate = {
  payloadSchema: z
    .object({
      name,
      role: z.enum(["admin", "viewer", "superadmin"]),
      token,
      expiresHours: z.number().int().positive(),
    })
    .strict(),
  throttle: SENSITIVE,
  subject: () => subjectLine("Staff account — set your password"),
  html: (p, ctx) =>
    emailHtml({
      heading: "Your staff account",
      bodyHtml:
        greet(p.name) +
        para(
          `A staff account was created for you on the alumni portal with the role ${escapeHtml(singleLine(p.role, 40))}. Set your password to activate it:`,
        ) +
        ctaHtml(
          tokenLink(ctx.baseUrl, EMAIL_LINK_PATHS.setPassword, String(p.token)),
          "Set password",
        ) +
        para(`This link expires in ${escapeHtml(p.expiresHours)} hours.`),
      afterHtml: IGNORE,
    }),
  text: (p, ctx) =>
    emailText([
      textGreet(p.name),
      "",
      `A staff account (${singleLine(p.role, 40)}) was created for you. Set your password:`,
      tokenLink(ctx.baseUrl, EMAIL_LINK_PATHS.setPassword, String(p.token)),
      `This link expires in ${String(p.expiresHours)} hours.`,
      "",
      IGNORE,
    ]),
};

const ecardIssued: EmailTemplate = {
  payloadSchema: z.object({ name }).strict(),
  throttle: HOURLY,
  subject: () => subjectLine("Your alumni E-card is ready"),
  html: (p) =>
    emailHtml({
      heading: "Alumni E-card issued",
      bodyHtml:
        greet(p.name) +
        para(
          "Your alumni E-card has been issued. Sign in to the portal to view and download it.",
        ),
    }),
  text: (p) =>
    emailText([
      textGreet(p.name),
      "",
      "Your alumni E-card has been issued. Sign in to the portal to view it.",
    ]),
};

const storyApproved: EmailTemplate = {
  payloadSchema: z.object({ name, title: z.string().min(1).max(300) }).strict(),
  throttle: HOURLY,
  subject: (p) =>
    subjectLine(`Your story was published: ${singleLine(p.title, 80)}`),
  html: (p) =>
    emailHtml({
      heading: "Story published",
      bodyHtml:
        greet(p.name) +
        para(
          `Your success story <strong>${escapeHtml(singleLine(p.title, 120))}</strong> has been approved and published.`,
        ),
    }),
  text: (p) =>
    emailText([
      textGreet(p.name),
      "",
      `Your success story "${singleLine(p.title, 120)}" has been approved and published.`,
    ]),
};

const storyRejected: EmailTemplate = {
  payloadSchema: z
    .object({ name, title: z.string().min(1).max(300), reason })
    .strict(),
  throttle: HOURLY,
  subject: (p) => subjectLine(`Story update: ${singleLine(p.title, 80)}`),
  html: (p) =>
    emailHtml({
      heading: "Story not published",
      bodyHtml:
        greet(p.name) +
        para(
          `Your success story <strong>${escapeHtml(singleLine(p.title, 120))}</strong> could not be published.`,
        ) +
        para(
          `<strong>Reason:</strong> ${escapeHtml(cappedText(p.reason, 500))}`,
        ),
    }),
  text: (p) =>
    emailText([
      textGreet(p.name),
      "",
      `Your success story "${singleLine(p.title, 120)}" could not be published.`,
      `Reason: ${cappedText(p.reason, 500)}`,
    ]),
};

const changeRequestDecided: EmailTemplate = {
  payloadSchema: z
    .object({
      name,
      decision: z.enum(["approved", "rejected"]),
      reason: z.string().max(2000).optional(),
    })
    .strict(),
  throttle: HOURLY,
  subject: (p) =>
    subjectLine(
      p.decision === "approved"
        ? "Your profile change was approved"
        : "Your profile change was rejected",
    ),
  html: (p) =>
    emailHtml({
      heading:
        p.decision === "approved"
          ? "Profile change approved"
          : "Profile change rejected",
      bodyHtml:
        greet(p.name) +
        para(
          p.decision === "approved"
            ? "Your requested profile change has been approved and applied."
            : "Your requested profile change was reviewed and rejected.",
        ) +
        (p.reason
          ? para(
              `<strong>Reason:</strong> ${escapeHtml(cappedText(p.reason, 500))}`,
            )
          : ""),
    }),
  text: (p) =>
    emailText([
      textGreet(p.name),
      "",
      p.decision === "approved"
        ? "Your requested profile change has been approved and applied."
        : "Your requested profile change was reviewed and rejected.",
      ...(p.reason ? [`Reason: ${cappedText(p.reason, 500)}`] : []),
    ]),
};

const smtpTest: EmailTemplate = {
  payloadSchema: z.object({ note: z.string().max(200).optional() }).strict(),
  throttle: { max: 20, windowSeconds: 3600 },
  subject: () =>
    subjectLine(`${EMAIL_BRAND.shortName} Alumni Portal — SMTP test`),
  html: (p) =>
    emailHtml({
      heading: "SMTP configuration test",
      bodyHtml:
        para(
          "This is a diagnostic message from the alumni portal's email subsystem.",
        ) +
        (p.note
          ? para(`<em>${escapeHtml(cappedText(p.note, 200))}</em>`)
          : "") +
        para("If you received it, SMTP delivery is working."),
    }),
  text: (p) =>
    emailText([
      "SMTP configuration test — delivery is working.",
      ...(p.note ? [cappedText(p.note, 200)] : []),
    ]),
};

// ---- registry ----------------------------------------------------------

export const TEMPLATES = {
  email_verification: emailVerification,
  registration_received: registrationReceived,
  registration_approved: registrationApproved,
  registration_rejected: registrationRejected,
  password_reset: passwordReset,
  password_changed: passwordChanged,
  staff_invitation: staffInvitation,
  ecard_issued: ecardIssued,
  story_approved: storyApproved,
  story_rejected: storyRejected,
  change_request_decided: changeRequestDecided,
  smtp_test: smtpTest,
} as const;

export type TemplateName = keyof typeof TEMPLATES;
export const TEMPLATE_NAMES = Object.keys(TEMPLATES) as TemplateName[];

export function isTemplateName(v: unknown): v is TemplateName {
  return typeof v === "string" && v in TEMPLATES;
}

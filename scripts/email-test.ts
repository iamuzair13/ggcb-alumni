/**
 * pnpm email:test -- --to <address>
 *
 * Owner diagnostic: sends the `smtp_test` template DIRECTLY through the
 * configured transport (bypasses the outbox) so provider connectivity
 * can be verified before traffic flows. Requires EMAIL_MODE=smtp.
 * Prints success/failure with a scrubbed reason — never credentials.
 */
import { loadEnvFiles, requireEnv } from "./lib/env";
import { scrubError } from "../src/server/email/scrub";
import { TEMPLATES } from "../src/server/email/templates";
import { isValidEmailAddress } from "../src/server/email/escape";
import { createSmtpTransport } from "../src/server/email/transport";
import { emailBaseUrl } from "../src/server/email/links";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  loadEnvFiles();
  const to = arg("--to");
  if (!to || !isValidEmailAddress(to)) {
    console.error("usage: pnpm email:test -- --to <address>");
    process.exit(2);
  }
  if (process.env.EMAIL_MODE !== "smtp") {
    console.error(
      `[email:test] refused: EMAIL_MODE must be "smtp" (current: ${process.env.EMAIL_MODE ?? "unset"})`,
    );
    process.exit(1);
  }
  for (const v of [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "FROM_EMAIL",
    "FROM_NAME",
  ]) {
    requireEnv(v);
  }

  const tpl = TEMPLATES.smtp_test;
  const payload = tpl.payloadSchema.parse({ note: "manual diagnostic" }) as {
    note?: string;
  };
  const ctx = { baseUrl: emailBaseUrl() };
  const transport = createSmtpTransport();

  try {
    await transport.sendMail({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to,
      replyTo: process.env.REPLY_TO_EMAIL,
      subject: tpl.subject(payload),
      text: tpl.text(payload, ctx),
      html: tpl.html(payload, ctx),
    } as Parameters<typeof transport.sendMail>[0]);
    console.log(`[email:test] sent smtp_test to ${to} — check the mailbox`);
  } catch (e) {
    console.error(`[email:test] send failed: ${scrubError(e)}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`[email:test] ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});

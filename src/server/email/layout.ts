/**
 * Shared single-column layout for every transactional email.
 *
 * Constraints (spec §4.4): inline CSS only, no remote images, no tracking
 * pixels, no web fonts, no scripts, no attachments, no external CSS,
 * mobile-friendly single column. Table-based 600px container is the
 * maximum-portable pattern across mail clients.
 */
import { EMAIL_BRAND } from "./brand";
import { escapeHtml } from "./escape";

export interface LayoutInput {
  /** The one-line heading inside the card. */
  heading: string;
  /** Body paragraphs / blocks — caller escapes values before composing. */
  bodyHtml: string;
  /** Optional trailing sentence ("ignore if you didn't request this"). */
  afterHtml?: string;
}

export function emailHtml({
  heading,
  bodyHtml,
  afterHtml,
}: LayoutInput): string {
  const college = escapeHtml(EMAIL_BRAND.collegeName);
  const support = escapeHtml(EMAIL_BRAND.supportLine);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f5f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e3e5e8;border-radius:8px;">
          <tr><td style="padding:20px 28px;border-bottom:3px solid #0f5132;font-family:Arial,Helvetica,sans-serif;">
            <span style="font-size:16px;font-weight:bold;color:#0f5132;">${college}</span><br>
            <span style="font-size:12px;color:#555;">Alumni Portal</span>
          </td></tr>
          <tr><td style="padding:28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1c1e21;">
            <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#0f5132;">${escapeHtml(heading)}</h1>
            ${bodyHtml}
            ${afterHtml ? `<p style="margin:20px 0 0;font-size:13px;color:#666;">${afterHtml}</p>` : ""}
          </td></tr>
          <tr><td style="padding:16px 28px;border-top:1px solid #e3e5e8;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#8a8d91;">
            ${support}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Text-only alternative: plain lines, brand footer. */
export function emailText(lines: string[]): string {
  return [...lines, "", "—", EMAIL_BRAND.supportLine].join("\n");
}

/** Standard CTA paragraph (URL is caller-built via tokenLink only). */
export function ctaHtml(url: string, label: string): string {
  const u = escapeHtml(url);
  return `<p style="margin:24px 0;"><a href="${u}" style="display:inline-block;background-color:#0f5132;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-size:15px;">${escapeHtml(label)}</a></p>
  <p style="margin:0;font-size:13px;color:#666;">If the button does not work, copy this link into your browser:<br><span style="word-break:break-all;">${u}</span></p>`;
}

export function para(text: string): string {
  return `<p style="margin:0 0 14px;">${text}</p>`;
}

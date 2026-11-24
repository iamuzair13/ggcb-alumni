/**
 * Branding for transactional email — THE single D1 placeholder source.
 * When the college supplies final branding (Open Decision D1), ONLY this
 * file changes; no template edits. Values are deliberately plain — the
 * Phase 1 design-system palette is reused for colour, nothing else.
 */
export const EMAIL_BRAND = {
  /** Full legal name shown in the header/footer. */
  collegeName: "Government Graduate College Burewala",
  /** Short name used in subjects and sign-offs. */
  shortName: "GGCB",
  /** Sender display name (paired with FROM_EMAIL). */
  senderName: "GGCB Alumni Portal",
  /** One-line support sentence in every footer (D1 placeholder). */
  supportLine:
    "This message was sent by the alumni portal of Government Graduate College Burewala.",
} as const;

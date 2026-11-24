/**
 * Typed auth error codes — the ONLY distinct failure outcomes the login
 * surface may produce. Everything else is the generic INVALID message.
 */
export const AUTH_ERROR_CODES = {
  /** Wrong password / unknown email / inactive / password-less — same message. */
  INVALID: "invalid_credentials",
  /** Password correct but email unverified — distinct typed code (§4.5). */
  EMAIL_NOT_VERIFIED: "email_not_verified",
  /** Rate-limit bucket tripped — generic "too many attempts". */
  RATE_LIMITED: "rate_limited",
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

/** login_logs.reason — fixed enum-like strings (never free text). */
export const LOGIN_LOG_REASONS = {
  SUCCESS: "success",
  BAD_CREDENTIALS: "bad_credentials",
  UNKNOWN_EMAIL: "unknown_email",
  INACTIVE: "inactive",
  NO_PASSWORD: "no_password",
  EMAIL_NOT_VERIFIED: "email_not_verified",
  RATE_LIMITED: "rate_limited",
  INVALID_INPUT: "invalid_input",
} as const;

export type LoginLogReason =
  (typeof LOGIN_LOG_REASONS)[keyof typeof LOGIN_LOG_REASONS];

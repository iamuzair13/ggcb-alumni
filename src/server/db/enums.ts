/**
 * Database enum values — TS constants mirroring the SQL native enums.
 * src/tests/db/enums.test.ts compares these against pg_enum on a migrated
 * database so they can never drift. Reuses the Phase 1 constants rather
 * than duplicating them.
 */
import { ROLES } from "@/lib/constants/roles";
import { DATASOURCES, VERIFY_STATUSES } from "@/lib/constants/statuses";

export const USER_ROLES = ROLES;
export const GENDER_TYPES = ["male", "female", "other"] as const;
export { VERIFY_STATUSES, DATASOURCES };
export const CHANGE_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;
export const AUTH_TOKEN_TYPES = [
  "email_verification",
  "password_reset",
] as const;
export const OUTBOX_STATUSES = [
  "pending",
  "sending",
  "sent",
  "failed",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type GenderType = (typeof GENDER_TYPES)[number];
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];
export type AuthTokenType = (typeof AUTH_TOKEN_TYPES)[number];
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

/** enum name → allowed values, iterated by the drift test. */
export const DB_ENUMS: Record<string, readonly string[]> = {
  user_role: USER_ROLES,
  gender_type: GENDER_TYPES,
  verify_status: VERIFY_STATUSES,
  datasource_type: DATASOURCES,
  change_request_status: CHANGE_REQUEST_STATUSES,
  auth_token_type: AUTH_TOKEN_TYPES,
  outbox_status: OUTBOX_STATUSES,
};

/**
 * Shared result types — plain data, safe to import from BOTH server and
 * client components (the ggcb/no-server-imports-in-client rule forbids even
 * type imports from src/server, so cross-boundary types live here).
 */

/** Server-action envelope — never throws to the client. */
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; code: string; message: string };

export type FieldErrors = Record<string, string>;

/** Service-layer outcome for mutations (ok | error + optional field map). */
export type ServiceResult =
  | { status: "ok" }
  | { status: "error"; message: string; fieldErrors?: FieldErrors };

/** Neutral request flows always return this. */
export type NeutralResult = { status: "ok" };

/** Token consume outcomes — "invalid" collapses all failure reasons. */
export type ConsumeResult =
  | { status: "ok" }
  | { status: "invalid" }
  | { status: "policy"; reason: string };

/** Derived staff-user display status. */
export type UserStatus = "active" | "inactive" | "invited";

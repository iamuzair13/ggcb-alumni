import "server-only";
/**
 * Audit helpers (spec §4.9) — `admin_activity_logs` writer + metadata
 * sanitizer + the typed action union.
 *
 * Two usage modes (docs/security/audit-actions.md says which is which):
 *   in-transaction — pass `tx`: the audit row is part of the critical
 *                    change; a failure rolls the change back
 *   best-effort    — no `tx` + `recordAdminActivitySafe`/`after()`:
 *                    failures are swallowed and logged without data
 *
 * Sanitizing is NOT optional: keys matching secrets are dropped
 * (nested), the JSON is capped at ~4 KB with a marker, non-plain values
 * are rejected.
 */
import type postgres from "postgres";
import { sql as pool } from "@/server/db";

/** Actions the product will log — extend per prompt; document each in
 * docs/security/audit-actions.md. */
export const ADMIN_ACTIONS = [
  // Phase 3 (already in use)
  "auth.password_set",
  "auth.sessions_invalidated",
  // Prompt 4 (diagnostics)
  "email.outbox_drained",
  // Prompt 5 (registration/verification flows)
  "user.registered",
  "auth.email_verified",
  "auth.password_reset",
  // Prompt 6+ placeholders (profile/changes)
  "alumni.change_request_created",
  "alumni.change_request_decided",
  // Prompt 5 (staff + departments)
  "admin.user_updated",
  "admin.user_reactivated",
  "admin.invitation_resent",
  "admin.password_reset_sent",
  "admin.department_created",
  "admin.department_updated",
  "admin.department_activated",
  "admin.department_deactivated",
  "admin.department_deleted",
  // Prompt 7 placeholders (admin ops)
  "admin.registration_decided",
  "admin.user_created",
  "admin.user_role_changed",
  "admin.user_deactivated",
  // Prompt 8 placeholders (e-card)
  "ecard.issued",
  "ecard.revoked",
  "ecard.reissued",
  // Prompt 9 placeholders (content moderation)
  "content.moderated",
  "content.featured_changed",
  // Prompt 4.9-style bulk ops / imports (later phases)
  "import.committed",
  "alumni.bulk_action",
  "export.completed",
] as const;

export type AdminAction = (typeof ADMIN_ACTIONS)[number];

/** Keys that must never reach an audit row — dropped case-insensitively. */
const SECRET_KEY_RE = /pass(word)?|token|secret|hash|authorization|cookie/i;

const MAX_METADATA_BYTES = 4096;

type PlainValue =
  | string
  | number
  | boolean
  | null
  | PlainValue[]
  | {
      [k: string]: PlainValue;
    };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== "object" || v === null) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function sanitizeValue(v: unknown, depth: number): PlainValue | undefined {
  if (depth > 8) return undefined;
  if (v === null || typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "boolean") return v;
  if (Array.isArray(v)) {
    return v.slice(0, 100).map((x) => sanitizeValue(x, depth + 1) ?? null);
  }
  if (isPlainObject(v)) {
    const out: Record<string, PlainValue> = {};
    for (const [k, val] of Object.entries(v)) {
      if (SECRET_KEY_RE.test(k)) continue;
      const sv = sanitizeValue(val, depth + 1);
      if (sv !== undefined) out[k] = sv;
    }
    return out;
  }
  return undefined; // functions, Dates-as-objects? (Dates serialize via JSON below), symbols → dropped
}

/**
 * Sanitize caller metadata: drops secret-ish keys (nested), non-plain
 * values, and caps the serialized size with a `__truncated` marker.
 */
export function sanitizeAuditMetadata(
  input: Record<string, unknown> | undefined,
): Record<string, PlainValue> {
  const clean = (sanitizeValue(input ?? {}, 0) ?? {}) as Record<
    string,
    PlainValue
  >;
  let json = JSON.stringify(clean);
  if (json.length <= MAX_METADATA_BYTES) return clean;
  // Shrink long string leaves, then mark — last resort keeps only a flag.
  const shrunk = JSON.parse(json) as Record<string, PlainValue>;
  const truncateStrings = (o: PlainValue): void => {
    if (Array.isArray(o)) return void o.forEach(truncateStrings);
    if (isPlainObject(o)) {
      for (const k of Object.keys(o)) {
        const v = o[k];
        if (typeof v === "string" && v.length > 120)
          o[k] = `${v.slice(0, 120)}…`;
        else truncateStrings(v);
      }
    }
  };
  truncateStrings(shrunk);
  json = JSON.stringify(shrunk);
  if (json.length > MAX_METADATA_BYTES) {
    return { __truncated: true };
  }
  return { ...shrunk, __truncated: true };
}

export interface AdminActivityInput {
  actorUserId: string | null;
  action: AdminAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

/**
 * IN-TRANSACTION mode — throws on failure so the caller's transaction
 * rolls back with it. Use for actions where the audit row IS part of
 * the critical change (approvals, role changes, imports).
 */
export async function recordAdminActivity(
  e: AdminActivityInput,
  opts: { tx?: postgres.Sql | postgres.TransactionSql },
): Promise<void> {
  const exec = (opts.tx ?? pool) as postgres.Sql;
  const metadata = sanitizeAuditMetadata(e.metadata);
  await exec`
    INSERT INTO admin_activity_logs
      (actor_user_id, action, entity_type, entity_id, metadata, ip)
    VALUES (
      ${e.actorUserId}, ${e.action}, ${e.entityType ?? null},
      ${e.entityId ?? null}, ${exec.json(metadata)}, ${e.ip ?? null}
    )
  `;
}

/**
 * BEST-EFFORT mode — for non-critical events; failures are swallowed and
 * logged without data (call from `after()` when the response must not wait).
 */
export async function recordAdminActivitySafe(
  e: AdminActivityInput,
): Promise<void> {
  try {
    await recordAdminActivity(e, {});
  } catch (err) {
    console.warn(
      "[audit] admin_activity_logs write failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

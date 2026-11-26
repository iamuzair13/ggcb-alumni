import type { Role } from "@/lib/constants/roles";

/**
 * Staff-management safety rules — pure functions, unit-tested with
 * injected state; the service re-derives the same facts inside the
 * transaction under a row lock (no TOCTOU).
 *
 * Rules (spec §4.3):
 *   1. You cannot deactivate or demote YOURSELF.
 *   2. The LAST active superadmin can never be deactivated or demoted.
 *   3. Only a superadmin may create or promote a superadmin (the action
 *      layer already restricts all staff mutations to superadmin; the
 *      rule is kept here so the invariant travels with the service).
 */
export type StaffActionKind =
  | "deactivate"
  | "demote"
  | "reactivate"
  | "rename"
  | "resend_invite"
  | "send_reset";

export interface StaffRuleInput {
  actorId: string;
  actorRole: Role;
  target: {
    id: string;
    role: Role;
    isActive: boolean;
    hasPassword: boolean;
  };
  /** For role-changing actions: the role being assigned. */
  newRole?: Role;
  /** Count of active superadmins in the system (incl. the target if it is one). */
  activeSuperadmins: number;
}

export type RuleResult = { ok: true } | { ok: false; reason: string };

function lastSuperadmin(input: StaffRuleInput): boolean {
  return input.target.role === "superadmin" && input.activeSuperadmins <= 1;
}

export function checkStaffRule(
  action: StaffActionKind,
  input: StaffRuleInput,
): RuleResult {
  // Rule 3 — only a superadmin may grant the superadmin role (defense in
  // depth: the action layer already restricts staff mutations to
  // superadmin; "demote" is the generic role-change action).
  if (
    action === "demote" &&
    input.newRole === "superadmin" &&
    input.actorRole !== "superadmin"
  ) {
    return {
      ok: false,
      reason: "Only a superadmin can grant the superadmin role",
    };
  }

  const self = input.actorId === input.target.id;

  switch (action) {
    case "deactivate": {
      if (self)
        return { ok: false, reason: "You cannot deactivate your own account" };
      if (lastSuperadmin(input))
        return {
          ok: false,
          reason: "The last active superadmin cannot be deactivated",
        };
      return { ok: true };
    }
    case "demote": {
      if (self && input.newRole && input.newRole !== "superadmin")
        return { ok: false, reason: "You cannot change your own role" };
      if (lastSuperadmin(input) && input.newRole !== "superadmin")
        return {
          ok: false,
          reason: "The last active superadmin cannot be demoted",
        };
      return { ok: true };
    }
    case "reactivate":
      return { ok: true };
    case "rename":
      return { ok: true };
    case "resend_invite":
      return input.target.hasPassword
        ? { ok: false, reason: "This user already has a password" }
        : { ok: true };
    case "send_reset":
      return input.target.hasPassword
        ? { ok: true }
        : {
            ok: false,
            reason: "This user has no password yet — resend the invitation",
          };
  }
}

import type { UserStatus } from "@/lib/result";
export type { UserStatus };

/** Derived display status: Inactive → Invited → Active. */
export function userStatus(u: {
  is_active: boolean;
  password_hash: string | null;
}): UserStatus {
  if (!u.is_active) return "inactive";
  if (!u.password_hash) return "invited";
  return "active";
}

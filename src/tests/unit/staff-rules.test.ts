import { describe, expect, it } from "vitest";
import {
  checkStaffRule,
  userStatus,
  type StaffRuleInput,
} from "@/server/services/staff-rules";

function target(
  over: Partial<StaffRuleInput["target"]> = {},
): StaffRuleInput["target"] {
  return {
    id: "u-2",
    role: "admin",
    isActive: true,
    hasPassword: true,
    ...over,
  };
}
function input(over: Partial<StaffRuleInput> = {}): StaffRuleInput {
  return {
    actorId: "u-1",
    actorRole: "superadmin",
    target: target(),
    activeSuperadmins: 2,
    ...over,
  };
}

describe("staff safety rules", () => {
  it("cannot deactivate yourself", () => {
    const r = checkStaffRule(
      "deactivate",
      input({ target: target({ id: "u-1" }) }),
    );
    expect(r).toEqual({
      ok: false,
      reason: "You cannot deactivate your own account",
    });
  });

  it("last active superadmin cannot be deactivated", () => {
    const r = checkStaffRule(
      "deactivate",
      input({ target: target({ role: "superadmin" }), activeSuperadmins: 1 }),
    );
    expect(r).toEqual({
      ok: false,
      reason: "The last active superadmin cannot be deactivated",
    });
  });

  it("last active superadmin cannot be demoted", () => {
    const r = checkStaffRule("demote", {
      ...input({
        target: target({ role: "superadmin" }),
        activeSuperadmins: 1,
      }),
      newRole: "admin",
    });
    expect(r).toEqual({
      ok: false,
      reason: "The last active superadmin cannot be demoted",
    });
  });

  it("you cannot demote your own superadmin role", () => {
    const r = checkStaffRule("demote", {
      ...input({ target: target({ id: "u-1", role: "superadmin" }) }),
      newRole: "admin",
    });
    expect(r).toEqual({ ok: false, reason: "You cannot change your own role" });
  });

  it("one of several superadmins can be demoted", () => {
    const r = checkStaffRule("demote", {
      ...input({
        target: target({ role: "superadmin" }),
        activeSuperadmins: 3,
      }),
      newRole: "admin",
    });
    expect(r.ok).toBe(true);
  });

  it("a non-superadmin cannot grant the superadmin role", () => {
    const r = checkStaffRule("demote", {
      ...input({ actorRole: "admin" }),
      newRole: "superadmin",
    });
    expect(r).toEqual({
      ok: false,
      reason: "Only a superadmin can grant the superadmin role",
    });
  });

  it("resend invitation only while the user has no password", () => {
    expect(
      checkStaffRule(
        "resend_invite",
        input({ target: target({ hasPassword: false }) }),
      ).ok,
    ).toBe(true);
    const r = checkStaffRule("resend_invite", input());
    expect(r).toEqual({
      ok: false,
      reason: "This user already has a password",
    });
  });

  it("send reset requires an existing password", () => {
    expect(checkStaffRule("send_reset", input()).ok).toBe(true);
    const r = checkStaffRule(
      "send_reset",
      input({ target: target({ hasPassword: false }) }),
    );
    expect(r.ok).toBe(false);
  });
});

describe("userStatus derivation", () => {
  it("inactive beats invited (a deactivated invitee shows Inactive)", () => {
    expect(userStatus({ is_active: false, password_hash: null })).toBe(
      "inactive",
    );
  });
  it("no password yet = invited", () => {
    expect(userStatus({ is_active: true, password_hash: null })).toBe(
      "invited",
    );
  });
  it("password + active = active", () => {
    expect(userStatus({ is_active: true, password_hash: "argon2" })).toBe(
      "active",
    );
  });
});

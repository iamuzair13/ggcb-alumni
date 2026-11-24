"use server";

/**
 * Staff-user actions — superadmin only (§4.3). defineAction authorizes on
 * the session role; every handler then re-checks the role FRESH against
 * the database (a revoked/downgraded session cannot mutate).
 */
import { z } from "zod";
import { recheckUser } from "@/auth";
import { defineAction } from "@/server/auth/route";
import {
  inviteInput,
  editInput,
  idInput,
  inviteStaff,
  updateStaff,
  setStaffActive,
  resendInvitation,
  sendPasswordReset,
  type ServiceResult,
} from "@/server/services/staff";
import type { SessionUser } from "@/server/auth/session";
import type { Role } from "@/lib/constants/roles";

const FORBIDDEN: ServiceResult = {
  status: "error",
  message: "Insufficient permissions",
};

const setActiveInput = z.object({ id: z.uuid(), active: z.boolean() });

/** Fresh DB re-check of the actor's role for sensitive mutations. */
async function freshRole(user: SessionUser | null): Promise<Role | null> {
  if (!user) return null;
  const c = await recheckUser(user.id, user.sessionVersion);
  return c.valid ? c.role : null;
}

function freshSuperadmin(user: SessionUser | null): Promise<boolean> {
  return freshRole(user).then((r) => r === "superadmin");
}

export const inviteStaffAction = defineAction({
  roles: ["superadmin"],
  input: inviteInput,
  handler: async ({ input, user }): Promise<ServiceResult> => {
    if (!(await freshSuperadmin(user))) return FORBIDDEN;
    return inviteStaff(input, { id: user!.id });
  },
});

export const updateStaffAction = defineAction({
  roles: ["superadmin"],
  input: editInput,
  handler: async ({ input, user }): Promise<ServiceResult> => {
    if (!(await freshSuperadmin(user))) return FORBIDDEN;
    return updateStaff(input, { id: user!.id, role: "superadmin" });
  },
});

export const setStaffActiveAction = defineAction({
  roles: ["superadmin"],
  input: setActiveInput,
  handler: async ({ input, user }): Promise<ServiceResult> => {
    if (!(await freshSuperadmin(user))) return FORBIDDEN;
    return setStaffActive(input.id, input.active, {
      id: user!.id,
      role: "superadmin",
    });
  },
});

export const resendInvitationAction = defineAction({
  roles: ["superadmin"],
  input: idInput,
  handler: async ({ input, user }): Promise<ServiceResult> => {
    if (!(await freshSuperadmin(user))) return FORBIDDEN;
    return resendInvitation(input.id, { id: user!.id });
  },
});

export const sendPasswordResetAction = defineAction({
  roles: ["superadmin"],
  input: idInput,
  handler: async ({ input, user }): Promise<ServiceResult> => {
    if (!(await freshSuperadmin(user))) return FORBIDDEN;
    return sendPasswordReset(input.id, { id: user!.id });
  },
});

"use server";

/**
 * Department actions — superadmin + admin write, viewer read-only (§4.4).
 * Role checks at the action boundary; uniqueness/ownership errors map to
 * field errors the forms display inline.
 */
import { z } from "zod";
import { defineAction } from "@/server/auth/route";
import {
  departmentInput,
  departmentIdInput,
  createDepartment,
  updateDepartment,
  setDepartmentActive,
  deleteDepartment,
} from "@/server/services/departments";
import type { ServiceResult } from "@/server/services/staff";
import { STAFF_OPS } from "@/server/auth/route-policy";

const updateInput = departmentInput.extend({ id: z.uuid() });
const setActiveInput = z.object({ id: z.uuid(), active: z.boolean() });

export const createDepartmentAction = defineAction({
  roles: STAFF_OPS,
  input: departmentInput,
  handler: ({ input, user }) => createDepartment(input, { id: user!.id }),
});

export const updateDepartmentAction = defineAction({
  roles: STAFF_OPS,
  input: updateInput,
  handler: ({ input, user }) =>
    updateDepartment(
      input.id,
      { name: input.name, code: input.code },
      { id: user!.id },
    ),
});

export const setDepartmentActiveAction = defineAction({
  roles: STAFF_OPS,
  input: setActiveInput,
  handler: ({ input, user }) =>
    setDepartmentActive(input.id, input.active, { id: user!.id }),
});

export const deleteDepartmentAction = defineAction({
  roles: STAFF_OPS,
  input: departmentIdInput,
  handler: ({
    input,
    user,
  }): Promise<ServiceResult | { status: "in_use"; alumniCount: number }> =>
    deleteDepartment(input.id, { id: user!.id }),
});

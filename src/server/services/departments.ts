import "server-only";
/**
 * Departments CRUD — /admin/departments (spec §4.4).
 * Viewer reads; superadmin+admin write (enforced at the action layer).
 * Every mutation is audited in-transaction; uniqueness is case-insensitive
 * via the DB's lower(btrim()) indexes — violations map to field errors.
 */
import { z } from "zod";
import { sql } from "@/server/db";
import { recordAdminActivity } from "@/server/audit";
import type { ServiceResult } from "./staff";

export const departmentInput = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(30),
});
export const departmentIdInput = z.object({ id: z.uuid() });

/** Collapse internal whitespace — matches the DB's btrim() normalisation. */
export function normalizeName(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
export function normalizeCode(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  alumni_count: number;
  updated_at: Date;
}

/** All departments with alumni counts — one query (LEFT JOIN + COUNT). */
export async function listDepartments(q?: string): Promise<DepartmentRow[]> {
  const like = q ? `%${q.replaceAll("%", "").replaceAll("_", "")}%` : null;
  return sql<DepartmentRow[]>`
    SELECT d.id, d.name, d.code, d.is_active, d.updated_at,
           count(a.id)::int AS alumni_count
    FROM departments d
    LEFT JOIN alumni a ON a.department_id = d.id
    WHERE (${like}::text IS NULL OR d.name ILIKE ${like} OR d.code ILIKE ${like})
    GROUP BY d.id
    ORDER BY d.name
  `;
}

function uniqueViolation(e: unknown): ServiceResult {
  const msg = String(e);
  if (msg.includes("departments_name_lower_uniq")) {
    return {
      status: "error",
      message: "A department with this name already exists",
      fieldErrors: { name: "A department with this name already exists" },
    };
  }
  if (msg.includes("departments_code_lower_uniq")) {
    return {
      status: "error",
      message: "A department with this code already exists",
      fieldErrors: { code: "A department with this code already exists" },
    };
  }
  throw e;
}

export async function createDepartment(
  input: z.infer<typeof departmentInput>,
  actor: { id: string },
): Promise<ServiceResult> {
  const name = normalizeName(input.name);
  const code = normalizeCode(input.code);
  try {
    await sql.begin(async (tx) => {
      const [d] = await tx<{ id: string }[]>`
        INSERT INTO departments (name, code, is_active)
        VALUES (${name}, ${code}, true) RETURNING id
      `;
      await recordAdminActivity(
        {
          actorUserId: actor.id,
          action: "admin.department_created",
          entityType: "department",
          entityId: d.id,
          metadata: { code },
        },
        { tx },
      );
    });
  } catch (e) {
    if (String(e).includes("departments_")) return uniqueViolation(e);
    throw e;
  }
  return { status: "ok" };
}

export async function updateDepartment(
  id: string,
  input: z.infer<typeof departmentInput>,
  actor: { id: string },
): Promise<ServiceResult> {
  const name = normalizeName(input.name);
  const code = normalizeCode(input.code);
  try {
    return await sql.begin(async (tx) => {
      const [d] = await tx<{ id: string }[]>`
        UPDATE departments SET name = ${name}, code = ${code}
        WHERE id = ${id} RETURNING id
      `;
      if (!d)
        return {
          status: "error",
          message: "Department not found",
        } as ServiceResult;
      await recordAdminActivity(
        {
          actorUserId: actor.id,
          action: "admin.department_updated",
          entityType: "department",
          entityId: id,
        },
        { tx },
      );
      return { status: "ok" } as ServiceResult;
    });
  } catch (e) {
    if (String(e).includes("departments_")) return uniqueViolation(e);
    throw e;
  }
}

export async function setDepartmentActive(
  id: string,
  active: boolean,
  actor: { id: string },
): Promise<ServiceResult> {
  return sql.begin(async (tx) => {
    const [d] = await tx<{ id: string }[]>`
      UPDATE departments SET is_active = ${active}
      WHERE id = ${id} RETURNING id
    `;
    if (!d)
      return {
        status: "error",
        message: "Department not found",
      } as ServiceResult;
    await recordAdminActivity(
      {
        actorUserId: actor.id,
        action: active
          ? "admin.department_activated"
          : "admin.department_deactivated",
        entityType: "department",
        entityId: id,
      },
      { tx },
    );
    return { status: "ok" } as ServiceResult;
  });
}

/**
 * Delete only when unused — the alumni reference count is checked inside
 * the transaction (ggcb_app has alumni SELECT; a referenced department
 * would also fail the RESTRICT FK, but the count gives the better UX:
 * the UI offers deactivate instead of an opaque error).
 */
export async function deleteDepartment(
  id: string,
  actor: { id: string },
): Promise<ServiceResult | { status: "in_use"; alumniCount: number }> {
  return sql.begin(async (tx) => {
    const [ref] = await tx<{ n: number }[]>`
      SELECT count(*)::int AS n FROM alumni WHERE department_id = ${id}
    `;
    if (ref.n > 0) {
      return { status: "in_use", alumniCount: ref.n } as const;
    }
    const [d] = await tx<{ id: string }[]>`
      DELETE FROM departments WHERE id = ${id} RETURNING id
    `;
    if (!d)
      return {
        status: "error",
        message: "Department not found",
      } as ServiceResult;
    await recordAdminActivity(
      {
        actorUserId: actor.id,
        action: "admin.department_deleted",
        entityType: "department",
        entityId: id,
      },
      { tx },
    );
    return { status: "ok" } as ServiceResult;
  });
}

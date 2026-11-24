import "server-only";
/**
 * Staff-user management — /admin/users (superadmin only, spec §4.3).
 * Every mutation: fresh role re-check at the action boundary, row lock
 * inside the transaction, safety rules re-derived under that lock,
 * in-transaction audit row. password_hash is never selected for output.
 */
import { z } from "zod";
import type postgres from "postgres";
import { sql } from "@/server/db";
import { recordAdminActivity } from "@/server/audit";
import { createAuthToken } from "@/server/auth/tokens";
import { enqueueEmail, kickOutbox } from "@/server/email/enqueue";
import { checkStaffRule, userStatus, type UserStatus } from "./staff-rules";
import type { Role } from "@/lib/constants/roles";

export const INVITATION_TTL_MS = 72 * 60 * 60 * 1000; // 72 h (spec §4.2)

export const staffListInput = z.object({
  q: z.string().trim().max(200).optional(),
  role: z.enum(["superadmin", "admin", "viewer", "alumni"]).optional(),
  status: z.enum(["active", "inactive", "invited"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const inviteInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(320),
  role: z.enum(["admin", "viewer", "superadmin"]),
  /** Required-and-true only when role === "superadmin". */
  confirmSuperadmin: z.boolean().optional(),
});

export const editInput = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  role: z.enum(["admin", "viewer", "superadmin"]),
  confirmSuperadmin: z.boolean().optional(),
});

export const idInput = z.object({ id: z.uuid() });

import type { FieldErrors, ServiceResult } from "@/lib/result";
export type { FieldErrors, ServiceResult };

export interface StaffListRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  last_login_at: Date | null;
  created_at: Date;
}
export interface StaffListResult {
  rows: StaffListRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const STAFF_PAGE_SIZE = 20;

/** One query: filtered page + total via window count (≤ 2-query budget). */
export async function listStaffUsers(
  input: z.infer<typeof staffListInput>,
): Promise<StaffListResult> {
  const page = input.page;
  const offset = (page - 1) * STAFF_PAGE_SIZE;
  const q = input.q?.trim();
  const like = q ? `%${q.replaceAll("%", "").replaceAll("_", "")}%` : null;
  const role = input.role ?? null;
  const status = input.status ?? null;

  const rows = await sql<
    {
      id: string;
      name: string;
      email: string;
      role: string;
      is_active: boolean;
      has_password: boolean;
      last_login_at: Date | null;
      created_at: Date;
      total: number;
    }[]
  >`
    SELECT id, name, email::text, role::text, is_active,
           (password_hash IS NOT NULL) AS has_password,
           last_login_at, created_at,
           count(*) OVER ()::int AS total
    FROM users
    WHERE (${like}::text IS NULL OR name ILIKE ${like} OR email::text ILIKE ${like})
      AND (${role}::text IS NULL OR role::text = ${role})
      AND (
        ${status}::text IS NULL
        OR (${status} = 'inactive' AND is_active = false)
        OR (${status} = 'invited' AND is_active = true AND password_hash IS NULL)
        OR (${status} = 'active'  AND is_active = true AND password_hash IS NOT NULL)
      )
    ORDER BY created_at DESC, id
    LIMIT ${STAFF_PAGE_SIZE} OFFSET ${offset}
  `;
  const total = rows[0]?.total ?? 0;
  return {
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role as Role,
      status: userStatus({
        is_active: r.is_active,
        password_hash: r.has_password ? "x" : null,
      }),
      last_login_at: r.last_login_at,
      created_at: r.created_at,
    })),
    total,
    page,
    pageSize: STAFF_PAGE_SIZE,
  };
}

interface LockedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  password_hash: string | null;
}

async function countActiveSuperadmins(
  tx: postgres.TransactionSql,
): Promise<number> {
  const [r] = await tx<{ n: number }[]>`
    SELECT count(*)::int AS n FROM users WHERE role = 'superadmin' AND is_active
  `;
  return r.n;
}

async function lockUserForUpdate(
  tx: postgres.TransactionSql,
  id: string,
): Promise<LockedUser | null> {
  const [u] = await tx<LockedUser[]>`
    SELECT id, name, email::text, role::text AS role, is_active, password_hash
    FROM users WHERE id = ${id} FOR UPDATE
  `;
  return u ?? null;
}

/** Invite: user + 72 h token + invitation email — one transaction. */
export async function inviteStaff(
  input: z.infer<typeof inviteInput>,
  actor: { id: string },
): Promise<ServiceResult> {
  const email = input.email.trim().toLowerCase();
  if (input.role === "superadmin" && input.confirmSuperadmin !== true) {
    return {
      status: "error",
      message: "Confirm the superadmin role before inviting",
      fieldErrors: {
        role: "Superadmin invitations need the explicit confirmation",
      },
    };
  }
  try {
    await sql.begin(async (tx) => {
      const [u] = await tx<{ id: string }[]>`
        INSERT INTO users (email, password_hash, name, role, is_active)
        VALUES (${email}, NULL, ${input.name}, ${input.role}::user_role, true)
        RETURNING id
      `;
      const { raw } = await createAuthToken(
        tx,
        u.id,
        "password_reset",
        INVITATION_TTL_MS,
      );
      await enqueueEmail(
        {
          to: email,
          template: "staff_invitation",
          payload: {
            name: input.name,
            role: input.role,
            token: raw,
            expiresHours: 72,
          },
          idempotencyKey: `invite:${u.id}`,
        },
        { tx },
      );
      await recordAdminActivity(
        {
          actorUserId: actor.id,
          action: "admin.user_created",
          entityType: "user",
          entityId: u.id,
          metadata: { role: input.role },
        },
        { tx },
      );
    });
  } catch (e) {
    if (String(e).includes("users_email_uniq")) {
      return {
        status: "error",
        message: "A staff account already uses this email",
        fieldErrors: { email: "A staff account already uses this email" },
      };
    }
    throw e;
  }
  kickOutbox();
  return { status: "ok" };
}

/** Edit name + role. Role changes run the demote/last-superadmin rules. */
export async function updateStaff(
  input: z.infer<typeof editInput>,
  actor: { id: string; role: Role },
): Promise<ServiceResult> {
  if (input.role === "superadmin" && input.confirmSuperadmin !== true) {
    return {
      status: "error",
      message: "Confirm the superadmin role before saving",
      fieldErrors: { role: "Superadmin roles need the explicit confirmation" },
    };
  }
  return sql.begin(async (tx) => {
    const u = await lockUserForUpdate(tx, input.id);
    if (!u)
      return { status: "error", message: "User not found" } as ServiceResult;
    const supers = await countActiveSuperadmins(tx);
    const rule = checkStaffRule("demote", {
      actorId: actor.id,
      actorRole: actor.role,
      target: {
        id: u.id,
        role: u.role,
        isActive: u.is_active,
        hasPassword: u.password_hash !== null,
      },
      newRole: input.role,
      activeSuperadmins: supers,
    });
    if (!rule.ok)
      return { status: "error", message: rule.reason } as ServiceResult;
    const roleChanged = u.role !== input.role;
    await tx`
      UPDATE users SET name = ${input.name}, role = ${input.role}::user_role,
        session_version = CASE WHEN role::text <> ${input.role} THEN session_version + 1 ELSE session_version END
      WHERE id = ${u.id}
    `;
    await recordAdminActivity(
      {
        actorUserId: actor.id,
        action: roleChanged ? "admin.user_role_changed" : "admin.user_updated",
        entityType: "user",
        entityId: u.id,
        metadata: roleChanged
          ? { from: u.role, to: input.role }
          : { field: "name" },
      },
      { tx },
    );
    return { status: "ok" } as ServiceResult;
  });
}

/** Deactivate / reactivate — bump session_version to sign out sessions. */
export async function setStaffActive(
  id: string,
  active: boolean,
  actor: { id: string; role: Role },
): Promise<ServiceResult> {
  return sql.begin(async (tx) => {
    const u = await lockUserForUpdate(tx, id);
    if (!u)
      return { status: "error", message: "User not found" } as ServiceResult;
    const supers = await countActiveSuperadmins(tx);
    const rule = checkStaffRule(active ? "reactivate" : "deactivate", {
      actorId: actor.id,
      actorRole: actor.role,
      target: {
        id: u.id,
        role: u.role,
        isActive: u.is_active,
        hasPassword: u.password_hash !== null,
      },
      activeSuperadmins: supers,
    });
    if (!rule.ok)
      return { status: "error", message: rule.reason } as ServiceResult;
    await tx`
      UPDATE users SET is_active = ${active}, session_version = session_version + 1
      WHERE id = ${u.id}
    `;
    await recordAdminActivity(
      {
        actorUserId: actor.id,
        action: active ? "admin.user_reactivated" : "admin.user_deactivated",
        entityType: "user",
        entityId: u.id,
      },
      { tx },
    );
    return { status: "ok" } as ServiceResult;
  });
}

/** Resend the invitation — only while the user has no password. */
export async function resendInvitation(
  id: string,
  actor: { id: string },
): Promise<ServiceResult> {
  const ok = await sql.begin(async (tx) => {
    const u = await lockUserForUpdate(tx, id);
    if (!u)
      return { status: "error", message: "User not found" } as ServiceResult;
    const rule = checkStaffRule("resend_invite", {
      actorId: actor.id,
      actorRole: "superadmin",
      target: {
        id: u.id,
        role: u.role,
        isActive: u.is_active,
        hasPassword: u.password_hash !== null,
      },
      activeSuperadmins: 0,
    });
    if (!rule.ok)
      return { status: "error", message: rule.reason } as ServiceResult;
    const { raw } = await createAuthToken(
      tx,
      u.id,
      "password_reset",
      INVITATION_TTL_MS,
    );
    await enqueueEmail(
      {
        to: u.email,
        template: "staff_invitation",
        payload: { name: u.name, role: u.role, token: raw, expiresHours: 72 },
        idempotencyKey: `invite-resend:${u.id}:${Date.now()}`,
      },
      { tx },
    );
    await recordAdminActivity(
      {
        actorUserId: actor.id,
        action: "admin.invitation_resent",
        entityType: "user",
        entityId: u.id,
      },
      { tx },
    );
    return { status: "ok" } as ServiceResult;
  });
  if (ok.status === "ok") kickOutbox();
  return ok;
}

/** Send a password reset — only for users who already have a password. */
export async function sendPasswordReset(
  id: string,
  actor: { id: string },
): Promise<ServiceResult> {
  const ok = await sql.begin(async (tx) => {
    const u = await lockUserForUpdate(tx, id);
    if (!u)
      return { status: "error", message: "User not found" } as ServiceResult;
    const rule = checkStaffRule("send_reset", {
      actorId: actor.id,
      actorRole: "superadmin",
      target: {
        id: u.id,
        role: u.role,
        isActive: u.is_active,
        hasPassword: u.password_hash !== null,
      },
      activeSuperadmins: 0,
    });
    if (!rule.ok)
      return { status: "error", message: rule.reason } as ServiceResult;
    const { raw } = await createAuthToken(tx, u.id, "password_reset");
    await enqueueEmail(
      {
        to: u.email,
        template: "password_reset",
        payload: { name: u.name, token: raw, expiresHours: 1 },
      },
      { tx },
    );
    await recordAdminActivity(
      {
        actorUserId: actor.id,
        action: "admin.password_reset_sent",
        entityType: "user",
        entityId: u.id,
      },
      { tx },
    );
    return { status: "ok" } as ServiceResult;
  });
  if (ok.status === "ok") kickOutbox();
  return ok;
}

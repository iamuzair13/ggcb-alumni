import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Pager } from "@/components/shared/pager";
import { InviteStaffButton, UsersView } from "@/components/admin/users-view";
import { getServerEnv } from "@/lib/config/env.server";
import { sql } from "@/server/db";
import { requireRole } from "@/server/auth/session";
import { listStaffUsers, staffListInput } from "@/server/services/staff";
import { parseEnum, parsePage, parseQuery } from "@/lib/list-params";
import type { Role } from "@/lib/constants/roles";

export const metadata: Metadata = { title: "Staff users" };

const ROLE_ALLOW = ["superadmin", "admin", "viewer", "alumni"] as const;
const STATUS_ALLOW = ["active", "inactive", "invited"] as const;

// Reads live data in the page body — allowed to block (per-segment opt-out).
export const instant = false;

/**
 * Staff users — superadmin only. Guard outside Suspense (admin layout's
 * `instant = false` marks the whole area blocking/dynamic).
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole(["superadmin"]);
  const sp = await searchParams;

  const parsed = staffListInput.parse({
    q: parseQuery(sp.q),
    role: parseEnum(sp.role, ROLE_ALLOW),
    status: parseEnum(sp.status, STATUS_ALLOW),
    page: parsePage(sp.page),
  });
  const [list, supers] = await Promise.all([
    listStaffUsers(parsed),
    sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM users WHERE role = 'superadmin' AND is_active
    `.then((r) => r[0].n),
  ]);
  const emailMode = getServerEnv().EMAIL_MODE;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff users"
        description="Invite staff, assign roles, and manage access."
        actions={<InviteStaffButton />}
      />
      <UsersView
        rows={list.rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role as Role,
          status: r.status,
          lastLoginAt: r.last_login_at?.toISOString() ?? null,
          createdAt: r.created_at.toISOString(),
        }))}
        currentUserId={user.id}
        activeSuperadmins={supers}
        emailMode={emailMode}
      />
      <Pager
        pathname="/admin/users"
        params={sp}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
      />
    </div>
  );
}

import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import {
  CreateDepartmentButton,
  DepartmentsView,
} from "@/components/admin/departments-view";
import { requireStaff } from "@/server/auth/session";
import { listDepartments } from "@/server/services/departments";
import { parseQuery } from "@/lib/list-params";

export const metadata: Metadata = { title: "Departments" };

// Reads live data in the page body — allowed to block (per-segment opt-out).
export const instant = false;

/**
 * Departments — all staff read; only superadmin/admin write (enforced in
 * the actions). Viewer gets the same list with controls removed.
 */
export default async function AdminDepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireStaff();
  const sp = await searchParams;
  const rows = await listDepartments(parseQuery(sp.q));
  const readOnly = user.role === "viewer";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="The college's departments — shown to alumni at registration."
        actions={readOnly ? undefined : <CreateDepartmentButton />}
      />
      <DepartmentsView
        rows={rows.map((d) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          isActive: d.is_active,
          alumniCount: d.alumni_count,
          updatedAt: d.updated_at.toISOString(),
        }))}
        readOnly={readOnly}
      />
    </div>
  );
}

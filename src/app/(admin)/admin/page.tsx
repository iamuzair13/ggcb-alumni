import type { Metadata } from "next";

import { AdminDashboardView } from "@/components/admin/dashboard-view";
import { requireStaff } from "@/server/auth/session";
import { loadAdminDashboard } from "@/server/services/admin-dashboard";

export const metadata: Metadata = { title: "Admin Dashboard" };

// Live aggregates read in the page body — allowed to block (Cache
// Components validation is per-segment; the layout flag opts only itself out).
export const instant = false;

/**
 * Admin dashboard — all staff read the same aggregate surface. Approve/reject
 * happens in the directory; this page only reports.
 */
export default async function AdminDashboardPage() {
  await requireStaff();
  const data = await loadAdminDashboard();
  return <AdminDashboardView data={data} />;
}

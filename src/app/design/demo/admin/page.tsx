import { notFound } from "next/navigation";
import { DemoAdminShell } from "@/components/demo/demo-shells";
import { AdminDashboardView } from "@/features/admin-dashboard/views/dashboard-view";
import { world } from "@/features/_shared/fixtures/world";
import type { AdminDashboardData } from "@/features/admin-dashboard/types";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Dev-only admin dashboard over the fixture world. */
export default function DemoAdminDashboardPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const byStatus = (s: string) =>
    world.alumni.filter((a) => a.verifyStatus === s).length;

  // Registrations grouped by month — last 6 months present in the fixtures.
  const byMonth = new Map<string, number>();
  for (const a of world.alumni) {
    const m = a.createdAt.slice(0, 7);
    byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
  }
  const trend = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([ym, count]) => ({
      month: `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`,
      count,
    }));

  const data: AdminDashboardData = {
    kpis: {
      totalAlumni: world.alumni.length,
      verified: byStatus("verified"),
      underApproval: byStatus("under_approval"),
      rejected: byStatus("rejected"),
      featured: world.alumni.filter((a) => a.isFeatured).length,
      ecardsIssued: world.ecards.length,
      pendingChangeRequests: world.changeRequests.filter(
        (r) => r.status === "pending",
      ).length,
    },
    pendingQueue: world.alumni
      .filter((a) => a.verifyStatus === "under_approval")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
    recentRegistrations: [...world.alumni]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
    trend,
  };

  return (
    <DemoAdminShell>
      <AdminDashboardView data={data} />
    </DemoAdminShell>
  );
}

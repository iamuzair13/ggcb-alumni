import { notFound } from "next/navigation";
import { DemoAdminShell } from "@/components/demo/demo-shells";
import { AnalyticsView } from "@/features/analytics/views/analytics-view";
import { world } from "@/features/_shared/fixtures/world";
import type { AnalyticsData, CategoryCount } from "@/features/analytics/types";
import { VERIFY_STATUS_LABELS } from "@/lib/constants/statuses";

const MONTH_LABELS = [
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

function topN(values: (string | null)[], n: number): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, n);
}

/** Dev-only prototype of /admin/analytics — deterministic fixtures only. */
export default function DemoAdminAnalytics() {
  if (process.env.NODE_ENV === "production") notFound();

  const { alumni, ecards, changeRequests, departments } = world;
  const verified = alumni.filter((a) => a.verifyStatus === "verified");
  const pending = alumni.filter((a) => a.verifyStatus === "under_approval");
  const rejected = alumni.filter((a) => a.verifyStatus === "rejected");

  const byDepartment = departments.map((d) => ({
    label: d.name.replace("Sample ", ""),
    value: d.alumniCount,
  }));

  const yearCounts = new Map<number, number>();
  for (const a of alumni) {
    yearCounts.set(a.passingYear, (yearCounts.get(a.passingYear) ?? 0) + 1);
  }
  const byPassingYear = [...yearCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([y, value]) => ({ label: String(y), value }));

  const monthCounts = new Map<string, number>();
  for (const a of alumni) {
    const key = a.createdAt.slice(0, 7); // "2026-03"
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }
  const registrationsOverTime = [...monthCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => {
      const [y, m] = key.split("-").map(Number);
      return { month: `${MONTH_LABELS[m - 1]} ${y}`, count };
    });

  const data: AnalyticsData = {
    totals: {
      alumni: alumni.length,
      verified: verified.length,
      underApproval: pending.length,
      rejected: rejected.length,
      ecardsIssued: ecards.length,
      changeRequestsPending: changeRequests.filter(
        (c) => c.status === "pending",
      ).length,
    },
    byDepartment,
    byPassingYear,
    registrationsOverTime,
    topCities: topN(
      alumni.map((a) => a.city),
      8,
    ),
    topDistricts: topN(
      alumni.map((a) => a.district),
      8,
    ),
    topEmployers: topN(
      alumni.map((a) => a.employer),
      8,
    ),
    topSectors: topN(
      alumni.map((a) => a.sector),
      8,
    ),
    statusSplit: (["verified", "under_approval", "rejected"] as const).map(
      (s) => ({
        status: s,
        label: VERIFY_STATUS_LABELS[s],
        value: alumni.filter((a) => a.verifyStatus === s).length,
      }),
    ),
  };

  return (
    <DemoAdminShell>
      <AnalyticsView data={data} />
    </DemoAdminShell>
  );
}

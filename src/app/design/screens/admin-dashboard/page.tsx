import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminDashboardView } from "@/components/admin/dashboard-view";
import { AlumniDirectoryView } from "@/components/admin/alumni-directory-view";
import type { AdminDashboardData } from "@/features/admin-dashboard/types";
import type {
  DirectoryFilterOptions,
  DirectoryTabCounts,
} from "@/server/services/alumni-directory";

export const metadata: Metadata = {
  title: "Preview — admin dashboard",
  robots: { index: false, follow: false },
};

const POPULATED: AdminDashboardData = {
  kpis: {
    totalAlumni: 128,
    verified: 104,
    underApproval: 17,
    rejected: 7,
    featured: 6,
    ecardsIssued: 0,
    pendingChangeRequests: 4,
  },
  pendingQueue: [
    {
      id: "00000000-0000-0000-0000-000000000101",
      fullName: "Sample Ayesha Khan",
      rollNumber: "GG-2019-0001",
      departmentName: "Sample Computer Science",
      passingYear: 2023,
      verifyStatus: "under_approval",
      datasource: "registration",
    },
    {
      id: "00000000-0000-0000-0000-000000000102",
      fullName: "Sample Bilal Qureshi",
      rollNumber: "GG-2020-0042",
      departmentName: "Sample Mathematics",
      passingYear: 2024,
      verifyStatus: "under_approval",
      datasource: "registration",
    },
    {
      id: "00000000-0000-0000-0000-000000000103",
      fullName: "Sample Fatima Noor",
      rollNumber: "GG-2018-0017",
      departmentName: "Sample English",
      passingYear: null,
      verifyStatus: "under_approval",
      datasource: "import",
    },
  ],
  recentRegistrations: [
    {
      id: "00000000-0000-0000-0000-000000000104",
      fullName: "Sample Hassan Raza",
      rollNumber: "GG-2021-0099",
      departmentName: "Sample Physics",
      passingYear: 2025,
      verifyStatus: "verified",
      datasource: "registration",
    },
    {
      id: "00000000-0000-0000-0000-000000000103",
      fullName: "Sample Fatima Noor",
      rollNumber: "GG-2018-0017",
      departmentName: "Sample English",
      passingYear: null,
      verifyStatus: "under_approval",
      datasource: "import",
    },
  ],
  trend: [
    { month: "Jun 2026", count: 4 },
    { month: "Jul 2026", count: 9 },
    { month: "Aug 2026", count: 6 },
    { month: "Sep 2026", count: 12 },
    { month: "Oct 2026", count: 8 },
    { month: "Nov 2026", count: 15 },
  ],
};

const EMPTY: AdminDashboardData = {
  kpis: {
    totalAlumni: 0,
    verified: 0,
    underApproval: 0,
    rejected: 0,
    featured: 0,
    ecardsIssued: 0,
    pendingChangeRequests: 0,
  },
  pendingQueue: [],
  recentRegistrations: [],
  trend: [
    { month: "Jun 2026", count: 0 },
    { month: "Jul 2026", count: 0 },
    { month: "Aug 2026", count: 0 },
    { month: "Sep 2026", count: 0 },
    { month: "Oct 2026", count: 0 },
    { month: "Nov 2026", count: 0 },
  ],
};

const DIR_COUNTS: DirectoryTabCounts = {
  verified: 104,
  underApproval: 17,
  rejected: 7,
  pendingChangeRequests: 4,
};

const DIR_OPTIONS: DirectoryFilterOptions = {
  departments: [
    { id: "00000000-0000-0000-0000-000000000011", name: "Sample CS" },
  ],
  passingYears: [2023],
  cities: ["Sample Burewala"],
  districts: [],
  sectors: [],
};

const PREVIEW_REGISTER = (
  <Suspense>
    <AlumniDirectoryView
      pathname="/design/screens/admin-dashboard"
      tab="verified"
      counts={DIR_COUNTS}
      params={{}}
      options={DIR_OPTIONS}
      rows={[]}
      requests={[]}
      total={0}
      page={1}
      pageSize={15}
      sort="name"
      narrowed={false}
    />
  </Suspense>
);

/** Dev-only preview of /admin states (populated + empty register). */
export default function AdminDashboardScreensPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 space-y-12 px-4 py-10">
      <section className="space-y-6">
        <h2 className="font-mono text-xs text-muted-foreground">
          Merged /admin — stats + register + context
        </h2>
        <AdminDashboardView data={POPULATED} register={PREVIEW_REGISTER} />
      </section>
      <section className="space-y-6">
        <h2 className="font-mono text-xs text-muted-foreground">
          Empty register — what a fresh deployment looks like
        </h2>
        <AdminDashboardView data={EMPTY} register={PREVIEW_REGISTER} />
      </section>
    </main>
  );
}

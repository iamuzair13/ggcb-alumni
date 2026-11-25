import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AlumniDirectoryView } from "@/components/admin/alumni-directory-view";
import type {
  ChangeRequestRow,
  DirectoryFilterOptions,
  DirectoryRow,
  DirectoryTabCounts,
} from "@/server/services/alumni-directory";

export const metadata: Metadata = {
  title: "Preview — alumni directory",
  robots: { index: false, follow: false },
};

const ROW = (
  i: number,
  overrides: Partial<DirectoryRow> = {},
): DirectoryRow => ({
  id: `00000000-0000-0000-0000-00000000${String(100 + i).slice(-4)}`,
  fullName: `Sample Alumnus ${String(i).padStart(2, "0")}`,
  rollNumber: `GG-20${String(18 + (i % 6)).padStart(2, "0")}-${String(
    i,
  ).padStart(4, "0")}`,
  departmentName: [
    "Sample Computer Science",
    "Sample Mathematics",
    "Sample English",
  ][i % 3]!,
  passingYear: 2019 + (i % 6),
  city:
    i % 4 === 0
      ? null
      : ["Sample Burewala", "Sample Lahore", "Sample Multan"][i % 3]!,
  verifyStatus: "verified",
  datasource: i % 3 === 0 ? "import" : "registration",
  isFeatured: i === 2,
  createdAt: `2026-${String(10 - (i % 5)).padStart(2, "0")}-15T09:00:00.000Z`,
  ...overrides,
});

const POPULATED_ROWS: DirectoryRow[] = Array.from({ length: 6 }, (_, i) =>
  ROW(i + 1),
);

const POPULATED_COUNTS: DirectoryTabCounts = {
  verified: 104,
  underApproval: 17,
  rejected: 7,
  pendingChangeRequests: 4,
};

const POPULATED_OPTIONS: DirectoryFilterOptions = {
  departments: [
    {
      id: "00000000-0000-0000-0000-000000000011",
      name: "Sample Computer Science",
    },
    { id: "00000000-0000-0000-0000-000000000012", name: "Sample English" },
    { id: "00000000-0000-0000-0000-000000000013", name: "Sample Mathematics" },
  ],
  passingYears: [2025, 2024, 2023, 2022, 2021, 2020],
  cities: ["Sample Burewala", "Sample Lahore", "Sample Multan"],
  districts: ["Sample Vehari"],
  sectors: ["Education", "Government", "Private"],
};

const REQUEST_ROWS: ChangeRequestRow[] = [
  {
    id: "cr-1",
    alumniId: "a-1",
    alumniName: "Sample Ayesha Khan",
    rollNumber: "GG-2019-0001",
    fields: ["Passing year"],
    status: "pending",
    reviewNote: null,
    createdAt: "2026-11-20T09:00:00.000Z",
    reviewedAt: null,
  },
  {
    id: "cr-2",
    alumniId: "a-2",
    alumniName: "Sample Bilal Qureshi",
    rollNumber: "GG-2020-0042",
    fields: ["Full name", "Department"],
    status: "approved",
    reviewNote: null,
    createdAt: "2026-11-12T09:00:00.000Z",
    reviewedAt: "2026-11-14T09:00:00.000Z",
  },
];

const EMPTY_COUNTS: DirectoryTabCounts = {
  verified: 0,
  underApproval: 0,
  rejected: 0,
  pendingChangeRequests: 0,
};

/** Dev-only preview of /admin/alumni states. */
export default function AdminAlumniScreensPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    // min-w-0: as a flex item of the flex-col body, main's min-width:auto
    // would otherwise floor at the tab strip's max-content (~574px).
    <main className="mx-auto w-full max-w-6xl min-w-0 space-y-12 px-4 py-10">
      <Suspense>
        <section className="space-y-6">
          <h2 className="font-mono text-xs text-muted-foreground">
            Verified tab — populated register
          </h2>
          <AlumniDirectoryView
            pathname="/design/screens/admin-alumni"
            tab="verified"
            counts={POPULATED_COUNTS}
            params={{}}
            options={POPULATED_OPTIONS}
            rows={POPULATED_ROWS}
            requests={[]}
            total={POPULATED_COUNTS.verified}
            page={1}
            pageSize={15}
            sort="name"
            narrowed={false}
          />
        </section>
        <section className="space-y-6">
          <h2 className="font-mono text-xs text-muted-foreground">
            Change-requests tab — pending first
          </h2>
          <AlumniDirectoryView
            pathname="/design/screens/admin-alumni"
            tab="requests"
            counts={POPULATED_COUNTS}
            params={{ tab: "requests" }}
            options={POPULATED_OPTIONS}
            rows={[]}
            requests={REQUEST_ROWS}
            total={REQUEST_ROWS.length}
            page={1}
            pageSize={15}
            sort="name"
            narrowed={false}
          />
        </section>
        <section className="space-y-6">
          <h2 className="font-mono text-xs text-muted-foreground">
            Empty register — what a fresh deployment looks like
          </h2>
          <AlumniDirectoryView
            pathname="/design/screens/admin-alumni"
            tab="verified"
            counts={EMPTY_COUNTS}
            params={{}}
            options={{
              departments: [],
              passingYears: [],
              cities: [],
              districts: [],
              sectors: [],
            }}
            rows={[]}
            requests={[]}
            total={0}
            page={1}
            pageSize={15}
            sort="name"
            narrowed={false}
          />
        </section>
      </Suspense>
    </main>
  );
}

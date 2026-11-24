import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import {
  CreateDepartmentButton,
  DepartmentsView,
  type DepartmentViewRow,
} from "@/components/admin/departments-view";

export const metadata: Metadata = {
  title: "Preview — departments",
  robots: { index: false, follow: false },
};

const ROWS: DepartmentViewRow[] = [
  {
    id: "00000000-0000-0000-0000-000000000011",
    name: "Computer Science",
    code: "BSCS",
    isActive: true,
    alumniCount: 42,
    updatedAt: "2026-02-10T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000012",
    name: "English",
    code: "BAENG",
    isActive: true,
    alumniCount: 0,
    updatedAt: "2026-01-22T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000013",
    name: "Mathematics",
    code: "BAMTH",
    isActive: false,
    alumniCount: 7,
    updatedAt: "2025-11-30T00:00:00.000Z",
  },
];

/** Dev-only preview of /admin/departments states (blueprint §2). */
export default function DepartmentsScreensPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <main className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        <section className="space-y-6">
          <h2 className="font-mono text-xs text-muted-foreground">
            Populated — write role (one row protected from delete by alumni
            count)
          </h2>
          <PageHeader
            title="Departments"
            description="The college's departments — shown to alumni at registration."
            actions={<CreateDepartmentButton />}
          />
          <DepartmentsView rows={ROWS} />
        </section>
        <section className="space-y-6">
          <h2 className="font-mono text-xs text-muted-foreground">
            Viewer read-only — no controls
          </h2>
          <PageHeader
            title="Departments"
            description="The college's departments — shown to alumni at registration."
          />
          <DepartmentsView rows={ROWS} readOnly />
        </section>
        <section className="space-y-6">
          <h2 className="font-mono text-xs text-muted-foreground">
            Empty state
          </h2>
          <PageHeader
            title="Departments"
            description="The college's departments — shown to alumni at registration."
          />
          <DepartmentsView rows={[]} />
        </section>
      </main>
    </Suspense>
  );
}

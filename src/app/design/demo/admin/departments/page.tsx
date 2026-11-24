import { notFound } from "next/navigation";
import { DemoAdminShell } from "@/components/demo/demo-shells";
import { DepartmentsDemoView } from "@/features/alumni-directory/views/departments-demo-view";
import { world } from "@/features/_shared/fixtures/world";

/** Dev-only departments screen over the fixture world. */
export default function DemoAdminDepartmentsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <DemoAdminShell>
      <DepartmentsDemoView
        rows={world.departments.map((d, i) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          isActive: d.isActive,
          alumniCount: d.alumniCount,
          updatedAt: `2026-0${(i % 9) + 1}-1${i % 9}`,
        }))}
      />
    </DemoAdminShell>
  );
}

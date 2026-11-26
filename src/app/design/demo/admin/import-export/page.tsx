import { notFound } from "next/navigation";
import { DemoAdminShell } from "@/components/demo/demo-shells";
import { ImportExportView } from "@/features/import-export/views/import-export-view";
import { importExportFixture } from "@/features/import-export/fixtures";

/** Dev-only prototype of /admin/import-export — deterministic fixtures only. */
export default function DemoAdminImportExport() {
  if (process.env.NODE_ENV === "production") notFound();

  const fixture = importExportFixture();

  return (
    <DemoAdminShell>
      <ImportExportView
        batches={fixture.batches}
        rowCountEstimate={fixture.rowCountEstimate}
      />
    </DemoAdminShell>
  );
}

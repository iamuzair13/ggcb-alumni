"use client";

/**
 * Import / Export — /admin/import-export (blueprint §3.3). The viewer
 * persona is role-gated by adminRouteAllowed → DemoForbidden (mirrors the
 * real route policy).
 */
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { useDemo } from "@/components/demo/demo-provider";
import { DemoForbidden } from "@/components/demo/demo-shells";
import { adminRouteAllowed } from "@/features/_shared/personas";
import { formatDate } from "@/lib/utils/format";
import { ArrowLeftRight } from "lucide-react";

import type { ImportBatch, ImportStatus } from "../types";
import { ImportWizard } from "./import-wizard";
import { ExportPanel } from "./export-panel";

const STATUS_STYLES: Record<ImportStatus, string> = {
  committed: "border-transparent bg-success text-success-foreground",
  validated: "border-transparent bg-info text-info-foreground",
  dry_run: "border-transparent bg-secondary text-secondary-foreground",
  draft: "border-transparent bg-muted text-muted-foreground",
  failed: "border-transparent bg-destructive/10 text-destructive",
};
const STATUS_LABELS: Record<ImportStatus, string> = {
  committed: "Committed",
  validated: "Validated",
  dry_run: "Dry run",
  draft: "Draft",
  failed: "Failed",
};

export function ImportExportView({
  batches,
  rowCountEstimate,
}: {
  batches: ImportBatch[];
  rowCountEstimate: number;
}) {
  const { persona } = useDemo();
  if (!adminRouteAllowed(persona, "/admin/import-export")) {
    return <DemoForbidden />;
  }
  return (
    <ImportExportInner batches={batches} rowCountEstimate={rowCountEstimate} />
  );
}

function ImportExportInner({
  batches,
  rowCountEstimate,
}: {
  batches: ImportBatch[];
  rowCountEstimate: number;
}) {
  const columns: DataTableColumn<ImportBatch>[] = [
    {
      key: "file",
      header: "File",
      cell: (b) => <span className="font-medium">{b.fileName}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (b) => (
        <Badge variant="outline" className={STATUS_STYLES[b.status]}>
          {STATUS_LABELS[b.status]}
        </Badge>
      ),
    },
    {
      key: "rows",
      header: "Rows",
      className: "tnum text-right",
      cell: (b) => b.totalRows,
    },
    {
      key: "inserted",
      header: "Inserted",
      className: "tnum text-right",
      cell: (b) => b.insertedRows,
    },
    {
      key: "errors",
      header: "Errors",
      className: "tnum text-right",
      cell: (b) => b.errorRows,
    },
    {
      key: "date",
      header: "Date",
      cell: (b) => <span className="tnum">{formatDate(b.createdAt)}</span>,
    },
    {
      key: "by",
      header: "By",
      cell: (b) =>
        b.committedBy ?? <span className="text-muted-foreground">—</span>,
    },
  ];

  const sorted = [...batches].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Import / Export"
        description="Bulk-load alumni records from a spreadsheet, or export the register honouring the current filters."
      />
      <Tabs defaultValue="import" className="w-full">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="import" className="pt-4">
          <ImportWizard />
        </TabsContent>
        <TabsContent value="export" className="pt-4">
          <ExportPanel rowCount={rowCountEstimate} />
        </TabsContent>
      </Tabs>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Batch history</h2>
        <DataTable
          columns={columns}
          rows={sorted}
          caption="Import batches"
          empty={
            <EmptyState
              icon={ArrowLeftRight}
              title="No imports yet"
              description="Upload a spreadsheet above — every batch is recorded here."
            />
          }
        />
      </section>
    </div>
  );
}

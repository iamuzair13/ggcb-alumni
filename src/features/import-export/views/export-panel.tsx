"use client";

/**
 * Export builder — /admin/import-export. Column checklist, format pick and
 * a filters summary; the download itself is a wired-later stub.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Download, ListFilter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InlineAlert } from "@/components/shared/inline-alert";

import { IMPORT_TARGETS, type ImportTargetField } from "../types";

export function ExportPanel({ rowCount }: { rowCount: number }) {
  const [columns, setColumns] = useState<Set<ImportTargetField>>(
    () => new Set(IMPORT_TARGETS.map((t) => t.field)),
  );
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");

  function toggle(field: ImportTargetField, on: boolean) {
    setColumns((cs) => {
      const next = new Set(cs);
      if (on) next.add(field);
      else next.delete(field);
      return next;
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="font-heading text-base font-semibold">Columns</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick which alumni fields land in the file.
        </p>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {IMPORT_TARGETS.map((t) => {
            const id = `export-col-${t.field}`;
            return (
              <li key={t.field} className="flex items-center gap-3">
                <Checkbox
                  id={id}
                  checked={columns.has(t.field)}
                  onCheckedChange={(v) => toggle(t.field, v === true)}
                  aria-labelledby={`${id}-label`}
                />
                <span id={`${id}-label`} className="text-sm">
                  {t.label}
                  {t.required ? (
                    <span className="text-muted-foreground"> *</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          * required to import the file back later.
        </p>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
            <ListFilter className="size-4 text-primary" aria-hidden="true" />
            Filters
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No filters — all alumni. When wired, filters set on the alumni list
            carry over to this export.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="font-heading text-base font-semibold">Format</h2>
          <RadioGroup
            value={format}
            onValueChange={(v) => setFormat(v as "csv" | "xlsx")}
            className="mt-3"
            aria-label="Export format"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem
                value="csv"
                id="fmt-csv"
                aria-labelledby="fmt-csv-label"
              />
              <span id="fmt-csv-label" className="text-sm">
                CSV — opens in any spreadsheet app
              </span>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem
                value="xlsx"
                id="fmt-xlsx"
                aria-labelledby="fmt-xlsx-label"
              />
              <span id="fmt-xlsx-label" className="text-sm">
                Excel (.xlsx) — keeps column types
              </span>
            </div>
          </RadioGroup>
        </Card>

        {columns.size === 0 ? (
          <InlineAlert variant="warning">
            Pick at least one column to export.
          </InlineAlert>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
          <p className="tnum text-sm text-muted-foreground">
            ≈ {rowCount} rows · {columns.size} columns · {format.toUpperCase()}
          </p>
          <Button
            disabled={columns.size === 0}
            onClick={() => toast("This will be wired in a later slice.")}
          >
            <Download data-icon="inline-start" aria-hidden="true" />
            Download export
          </Button>
        </div>
      </div>
    </div>
  );
}

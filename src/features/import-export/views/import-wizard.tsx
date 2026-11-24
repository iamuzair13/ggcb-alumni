"use client";

/**
 * Import wizard — /admin/import-export (blueprint §3.3, context.md §4.9).
 * Five steps: Upload → Map columns → Validate → Review → Commit. All
 * simulated client-side over a fixed sample file + deterministic errors.
 */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileSpreadsheet,
  FileUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Stepper } from "@/components/shared/stepper";
import { DropZone } from "@/components/shared/drop-zone";
import { InlineAlert } from "@/components/shared/inline-alert";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { KpiCard } from "@/components/shared/kpi-card";
import { useDemo } from "@/components/demo/demo-provider";

import { autoMapColumns } from "../auto-map";
import {
  IMPORT_TARGETS,
  type ImportColumnMapping,
  type ImportRowError,
} from "../types";

const STEPS = ["Upload", "Map columns", "Validate", "Review", "Commit"];
const IGNORE = "__ignore__";

const SAMPLE_FILE = { name: "alumni-2022-batch-2.xlsx", size: 1_284_672 };
const SAMPLE_HEADERS = [
  "Roll No",
  "Student Name",
  "Dept",
  "Pass Year",
  "Email",
  "City",
  "Employer",
  "Extra Col",
];
const SAMPLE_ROWS: string[][] = [
  [
    "2015-CS-001",
    "Sample Ahmed Raza",
    "Comp Sci",
    "2019",
    "ahmed@example.invalid",
    "Burewala",
    "Sample School",
    "—",
  ],
  [
    "2015-CS-002",
    "Sample Fatima Noor",
    "English",
    "2019",
    "fatima@example.invalid",
    "Lahore",
    "Sample Bank",
    "—",
  ],
  [
    "2016-CS-003",
    "Sample Bilal Khan",
    "Mathematics",
    "2020",
    "bilal@example.invalid",
    "Vehari",
    "Sample Textiles",
    "—",
  ],
  [
    "2016-CS-004",
    "Sample Ayesha Malik",
    "Physics",
    "2020",
    "ayesha@example.invalid",
    "Multan",
    "Sample Foundation",
    "—",
  ],
  [
    "2017-CS-005",
    "Sample Usman Tariq",
    "Economics",
    "2021",
    "usman@example.invalid",
    "Sahiwal",
    "Sample Software House",
    "—",
  ],
];

/** Deterministic demo outcome — 48 rows in the file, 8 rejected. */
const TOTAL_ROWS = 48;
const IMPORT_ERRORS: ImportRowError[] = [
  { row: 3, field: "rollNumber", message: "Roll number is missing." },
  { row: 7, field: "email", message: "Email is not a valid address." },
  {
    row: 11,
    field: "department",
    message: "“Comp Science” is not a known department.",
  },
  {
    row: 18,
    field: "rollNumber",
    message: "Roll number already exists in the register.",
  },
  {
    row: 24,
    field: "passingYear",
    message: "Passing year must be a four-digit year.",
  },
  { row: 29, field: "fullName", message: "Full name is missing." },
  { row: 36, field: "department", message: "Department column is empty." },
  { row: 42, field: "email", message: "Email is not a valid address." },
];
const VALID_ROWS = TOTAL_ROWS - IMPORT_ERRORS.length;

const TARGET_LABELS: ReadonlyMap<string, string> = new Map(
  IMPORT_TARGETS.map((t) => [t.field, t.label]),
);

export function ImportWizard() {
  const { simulate } = useDemo();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ImportColumnMapping[]>([]);
  const [validatePhase, setValidatePhase] = useState<
    "idle" | "running" | "done"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [commitOpen, setCommitOpen] = useState(false);
  const [commitPhase, setCommitPhase] = useState<"idle" | "running" | "done">(
    "idle",
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup the simulated timer on unmount (no state in the effect body).
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  /** Simulated validation — kicked off by the "Validate rows" click. */
  function startValidation() {
    setValidatePhase("running");
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          setValidatePhase("done");
          return 100;
        }
        return p + 9;
      });
    }, 110);
  }

  const requiredFields: readonly string[] = IMPORT_TARGETS.filter(
    (t) => t.required,
  ).map((t) => t.field);
  const assigned = mapping
    .map((m) => m.targetField)
    .filter((f): f is string => f !== null);
  const missingRequired = requiredFields.filter((f) => !assigned.includes(f));
  const duplicates = assigned.filter((f, i) => assigned.indexOf(f) !== i);
  const mappingValid = missingRequired.length === 0 && duplicates.length === 0;

  function updateMapping(sourceHeader: string, targetField: string) {
    setMapping((ms) =>
      ms.map((m) =>
        m.sourceHeader === sourceHeader
          ? {
              ...m,
              targetField: targetField === IGNORE ? null : targetField,
              required:
                targetField !== IGNORE && requiredFields.includes(targetField),
            }
          : m,
      ),
    );
  }

  function reset() {
    setStep(0);
    setFile(null);
    setUploadError(null);
    setMapping([]);
    setValidatePhase("idle");
    setProgress(0);
    setCommitPhase("idle");
  }

  return (
    <div className="space-y-5">
      <Stepper steps={STEPS} current={step} />

      {step === 0 ? (
        <Card className="p-5">
          <h2 className="font-heading text-base font-semibold">
            Upload the spreadsheet
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            An Excel (.xlsx) or CSV export of the old register — the first row
            must be column headers.
          </p>
          <div className="mt-4 space-y-4">
            <DropZone
              accept=".xlsx,.csv"
              maxBytes={10 * 1024 * 1024}
              hint=".xlsx or .csv, up to 10 MB"
              onFile={(f, error) => {
                if (error) {
                  setUploadError(error);
                  return;
                }
                if (f) {
                  setFile({ name: f.name, size: f.size });
                  setUploadError(null);
                }
              }}
            />
            {uploadError ? (
              <InlineAlert variant="destructive">{uploadError}</InlineAlert>
            ) : null}
            {file ? (
              <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <FileSpreadsheet
                  className="size-8 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="tnum text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                  Remove
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFile(SAMPLE_FILE);
                  setUploadError(null);
                }}
              >
                <FileUp data-icon="inline-start" aria-hidden="true" />
                Use the sample file “{SAMPLE_FILE.name}”
              </Button>
            )}
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              disabled={!file}
              onClick={() => {
                setMapping(autoMapColumns(SAMPLE_HEADERS));
                setStep(1);
              }}
            >
              Map columns
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card className="p-5">
          <h2 className="font-heading text-base font-semibold">
            Map the columns
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Match each column in “{file?.name}” to an alumni field. Columns left
            as “Ignore” are skipped. Required fields must be mapped.
          </p>

          {missingRequired.length > 0 || duplicates.length > 0 ? (
            <InlineAlert variant="warning" className="mt-4">
              {missingRequired.length > 0
                ? `Required fields not mapped: ${missingRequired
                    .map((f) => TARGET_LABELS.get(f))
                    .join(", ")}. `
                : null}
              {duplicates.length > 0
                ? `Each field can be mapped once — ${[...new Set(duplicates)]
                    .map((f) => TARGET_LABELS.get(f))
                    .join(", ")} is used more than once.`
                : null}
            </InlineAlert>
          ) : null}

          <div className="mt-4 overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File column</TableHead>
                  <TableHead>Maps to</TableHead>
                  <TableHead>Required</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapping.map((m) => (
                  <TableRow key={m.sourceHeader}>
                    <TableCell className="font-medium">
                      {m.sourceHeader}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.targetField ?? IGNORE}
                        onValueChange={(v) =>
                          updateMapping(m.sourceHeader, String(v))
                        }
                      >
                        <SelectTrigger
                          className="w-full min-w-44"
                          aria-label={`Map column ${m.sourceHeader}`}
                        >
                          <span className="flex-1 text-left">
                            {m.targetField
                              ? TARGET_LABELS.get(m.targetField)
                              : "Ignore"}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORE}>Ignore</SelectItem>
                          {IMPORT_TARGETS.map((t) => (
                            <SelectItem key={t.field} value={t.field}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {m.targetField &&
                      requiredFields.includes(m.targetField) ? (
                        <Badge variant="secondary">Required</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {SAMPLE_HEADERS.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {SAMPLE_ROWS.map((r, i) => (
                  <TableRow key={i}>
                    {r.map((c, j) => (
                      <TableCell
                        key={j}
                        className="whitespace-nowrap text-muted-foreground"
                      >
                        {c}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="px-3 py-2 text-xs text-muted-foreground">
              First 5 rows of {TOTAL_ROWS}.
            </p>
          </div>

          <div className="mt-5 flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft data-icon="inline-start" aria-hidden="true" />
              Back
            </Button>
            <Button
              disabled={!mappingValid}
              onClick={() => {
                setStep(2);
                startValidation();
              }}
            >
              Validate rows
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="p-5">
          <h2 className="font-heading text-base font-semibold">
            Validate the rows
          </h2>
          {validatePhase !== "done" ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Checking {TOTAL_ROWS} rows against the register…
              </p>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label="Validation progress"
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-100"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <KpiCard label="Rows checked" value={TOTAL_ROWS} />
                <KpiCard label="Valid" value={VALID_ROWS} accent />
                <KpiCard label="Errors" value={IMPORT_ERRORS.length} />
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Problem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {IMPORT_ERRORS.map((e) => (
                      <TableRow key={`${e.row}-${e.field}`}>
                        <TableCell className="tnum">{e.row}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {e.field}
                        </TableCell>
                        <TableCell>{e.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast("This will be wired in a later slice.")}
              >
                <Download data-icon="inline-start" aria-hidden="true" />
                Download error report
              </Button>
            </div>
          )}
          <div className="mt-5 flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                setValidatePhase("idle");
                setProgress(0);
                setStep(1);
              }}
            >
              <ArrowLeft data-icon="inline-start" aria-hidden="true" />
              Back
            </Button>
            <Button
              disabled={validatePhase !== "done"}
              onClick={() => setStep(3)}
            >
              Review import
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="p-5">
          <h2 className="font-heading text-base font-semibold">
            Review — dry run
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nothing is written yet. This is what will happen on commit for “
            {file?.name}”.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <KpiCard label="Will be inserted" value={VALID_ROWS} accent />
            <KpiCard label="Will be skipped" value={IMPORT_ERRORS.length} />
            <KpiCard
              label="Columns mapped"
              value={`${mapping.filter((m) => m.targetField).length} / ${mapping.length}`}
            />
          </div>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              New alumni get verify status “under approval” — staff review them
              in the directory.
            </li>
            <li>Rows with errors are skipped, not partially imported.</li>
            <li>The commit is recorded in the audit log and batch history.</li>
          </ul>
          <div className="mt-5 flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft data-icon="inline-start" aria-hidden="true" />
              Back
            </Button>
            <Button onClick={() => setStep(4)}>
              Continue to commit
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card className="p-5">
          {commitPhase !== "done" ? (
            <>
              <h2 className="font-heading text-base font-semibold">
                Commit the import
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Inserts {VALID_ROWS} alumni records from “{file?.name}” and
                skips the {IMPORT_ERRORS.length} rows with errors.
              </p>
              <div className="mt-5 flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                  Back
                </Button>
                <Button onClick={() => setCommitOpen(true)}>
                  Commit import
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <InlineAlert variant="success" title="Import committed">
                {VALID_ROWS} rows inserted, {IMPORT_ERRORS.length} skipped. A
                new import.batches row was added — it would appear in the batch
                history below.
              </InlineAlert>
              <Button variant="outline" onClick={reset}>
                Start another import
              </Button>
            </div>
          )}
        </Card>
      ) : null}

      <ConfirmDialog
        open={commitOpen}
        onOpenChange={setCommitOpen}
        title={`Commit ${VALID_ROWS} rows?`}
        description={`This inserts ${VALID_ROWS} alumni records from “${file?.name}” and skips ${IMPORT_ERRORS.length} rows with errors. Recorded in the audit log.`}
        confirmLabel={`Commit ${VALID_ROWS} rows`}
        pending={commitPhase === "running"}
        onConfirm={async () => {
          setCommitPhase("running");
          await simulate(null, 700);
          setCommitPhase("done");
          setCommitOpen(false);
          toast.success("Import committed");
        }}
      />
    </div>
  );
}

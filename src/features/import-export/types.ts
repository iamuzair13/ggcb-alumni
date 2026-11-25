/** Import/export VMs — context.md §4.9. */
export type ImportStatus =
  "draft" | "validated" | "committed" | "dry_run" | "failed";

export interface ImportBatch {
  id: string;
  fileName: string;
  status: ImportStatus;
  mappingUsed: string;
  totalRows: number;
  insertedRows: number;
  errorRows: number;
  createdAt: string;
  committedBy: string | null;
}

export interface ImportColumnMapping {
  sourceHeader: string;
  targetField: string | null; // null → column ignored
  required: boolean;
}

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportValidationResult {
  total: number;
  valid: number;
  errors: ImportRowError[];
  previewRows: string[][]; // first 5 rows for the mapping table
}

export const IMPORT_TARGETS = [
  { field: "rollNumber", label: "Roll number", required: true },
  { field: "fullName", label: "Full name", required: true },
  { field: "department", label: "Department", required: true },
  { field: "sessionStartYear", label: "Session start", required: false },
  { field: "sessionEndYear", label: "Session end", required: false },
  { field: "passingYear", label: "Passing year", required: false },
  { field: "email", label: "Email", required: false },
  { field: "phone", label: "Phone", required: false },
  { field: "city", label: "City", required: false },
  { field: "district", label: "District", required: false },
  { field: "employer", label: "Employer", required: false },
  { field: "jobTitle", label: "Job title", required: false },
] as const;

export type ImportTargetField = (typeof IMPORT_TARGETS)[number]["field"];

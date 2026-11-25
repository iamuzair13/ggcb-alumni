import type {
  ImportBatch,
  ImportColumnMapping,
  ImportValidationResult,
} from "./types";

export interface ImportExportPort {
  batches(): ImportBatch[];
  autoMap(headers: string[]): ImportColumnMapping[];
  validate(mapping: ImportColumnMapping[]): ImportValidationResult;
  commit(dryRun: boolean): { inserted: number; skipped: number };
}

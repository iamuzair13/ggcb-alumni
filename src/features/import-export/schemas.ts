import { z } from "zod";
import { IMPORT_TARGETS } from "./types";

const targetFields = IMPORT_TARGETS.map((t) => t.field) as [
  string,
  ...string[],
];

export const importMappingSchema = z.object({
  mapping: z
    .array(
      z.object({
        sourceHeader: z.string().min(1),
        targetField: z.enum(targetFields).nullable(),
      }),
    )
    .min(1),
});
export type ImportMappingInput = z.infer<typeof importMappingSchema>;

export const exportSchema = z.object({
  columns: z.array(z.enum(targetFields)).min(1, "Pick at least one column."),
  format: z.enum(["csv", "xlsx"]).default("csv"),
  honourFilters: z.boolean().default(true),
});
export type ExportInput = z.infer<typeof exportSchema>;

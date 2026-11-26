/** Zod schemas for the admin alumni surface — shared client/server later. */
import { z } from "zod";
import { VERIFY_STATUSES } from "@/lib/constants/statuses";

export const alumniFiltersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  departmentId: z.string().optional(),
  passingYear: z.coerce.number().int().min(1950).max(2100).optional(),
  session: z.string().max(12).optional(),
  city: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
  employer: z.string().max(120).optional(),
  sector: z.string().max(120).optional(),
  gender: z.enum(["male", "female"]).optional(),
  verifyStatus: z.enum(VERIFY_STATUSES).optional(),
  featured: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  sort: z.string().max(40).optional(),
});
export type AlumniFiltersInput = z.infer<typeof alumniFiltersSchema>;

export const rejectReasonSchema = z
  .string()
  .trim()
  .min(10, "Give the alumnus a reason (at least 10 characters).")
  .max(500);

export const reviewDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  reason: rejectReasonSchema.optional(),
  alumniIds: z.array(z.string().min(1)).min(1).max(500),
});

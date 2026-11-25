import { z } from "zod";
import { OPPORTUNITY_TYPES } from "@/lib/constants/statuses";

export const opportunitySchema = z.object({
  type: z.enum(OPPORTUNITY_TYPES),
  title: z.string().trim().min(3).max(140),
  organization: z.string().trim().min(2).max(140),
  description: z.string().trim().max(4000),
  applyUrl: z
    .string()
    .url("Enter a full https:// link.")
    .optional()
    .or(z.literal("")),
  contact: z.string().trim().max(140).optional(),
  deadline: z.string().min(1, "Pick a deadline."),
  isPublished: z.boolean().default(true),
});
export type OpportunityInput = z.infer<typeof opportunitySchema>;

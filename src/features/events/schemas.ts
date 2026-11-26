import { z } from "zod";
import { EVENT_TYPES } from "@/lib/constants/statuses";

export const eventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(4000),
  startsAt: z.string().min(1, "Pick a date."),
  endsAt: z.string().optional(),
  venue: z.string().trim().max(140),
  isPublished: z.boolean().default(true),
});
export type EventInput = z.infer<typeof eventSchema>;

import { z } from "zod";

export const announcementSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(1, "Write the announcement body.").max(8000),
  publishAt: z.string().min(1, "Pick a publish date."),
  expiresAt: z.string().optional(),
  isPinned: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

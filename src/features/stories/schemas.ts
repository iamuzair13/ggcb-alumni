import { z } from "zod";

export const storySchema = z.object({
  title: z.string().trim().min(3, "Give your story a title.").max(140),
  content: z
    .string()
    .trim()
    .min(50, "Tell us a little more — at least 50 characters.")
    .max(5000, "Keep it under 5,000 characters."),
  imageAlt: z.string().trim().max(140).optional(),
});
export type StoryInput = z.infer<typeof storySchema>;

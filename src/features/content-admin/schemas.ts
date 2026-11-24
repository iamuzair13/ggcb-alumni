import { z } from "zod";

export const featureSchema = z.object({
  alumniId: z.string().min(1),
  achievement: z
    .string()
    .trim()
    .min(10, "Describe the achievement (at least 10 characters).")
    .max(200),
});
export type FeatureInput = z.infer<typeof featureSchema>;

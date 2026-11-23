import { z } from "zod";

/**
 * Public environment (client-safe). Only NEXT_PUBLIC_* variables — these are
 * inlined into the client bundle, so never put secrets here.
 */
const publicSchema = z.object({
  /** Canonical site URL for absolute links/metadata. Optional this phase. */
  NEXT_PUBLIC_APP_URL: z.url().optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;

export const publicEnv: PublicEnv = (() => {
  const result = publicSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!result.success) {
    console.warn(
      `[env] invalid public environment: ${result.error.issues
        .map((i) => i.message)
        .join(", ")}`,
    );
    return {};
  }
  return result.data;
})();

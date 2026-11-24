/** Registration service port — the real container calls server actions. */
import type { Department } from "@/features/alumni-directory/types";
import type { RegisterDraft, RegisterOutcome } from "./types";

export interface RegisterPort {
  departments(): Department[];
  submit(draft: RegisterDraft): Promise<RegisterOutcome>;
  resendVerification(email: string): Promise<{ ok: true }>;
}

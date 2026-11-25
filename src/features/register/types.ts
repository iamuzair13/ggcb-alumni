/** Registration view models (context.md §4.2 — check-existence flow). */

export interface RegisterDraft {
  fullName: string;
  rollNumber: string;
  departmentId: string;
  sessionStartYear: number;
  sessionEndYear: number;
  passingYear: number;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  consent: boolean;
}

export type RegisterOutcome =
  | { kind: "submitted" }
  | { kind: "neutral" } // duplicate/throttled → identical message
  | { kind: "validation"; fieldErrors: Record<string, string> };

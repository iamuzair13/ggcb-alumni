/** E-card VM — context.md §4.5. */
import type { Alumnus, Ecard } from "@/features/alumni-directory/types";

export interface EcardView {
  alumnus: Pick<
    Alumnus,
    | "fullName"
    | "rollNumber"
    | "departmentName"
    | "passingYear"
    | "sessionStartYear"
    | "sessionEndYear"
    | "photoPath"
  >;
  card: Ecard | null; // null = not yet issued
}

/** Public verification shape — minimal data only (never email/phone/roll). */
export interface EcardVerifyResult {
  ok: boolean;
  name?: string;
  department?: string;
  passingYear?: number;
  status?: "active" | "revoked";
}

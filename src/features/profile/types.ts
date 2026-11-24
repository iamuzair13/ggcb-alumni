/** Profile hub VM — editable vs restricted fields (context.md §4.3). */
import type {
  Alumnus,
  AlumniChangeRequest,
} from "@/features/alumni-directory/types";

export interface ProfileSections {
  alumnus: Alumnus;
  completeness: { percent: number; missing: string[] };
}

export interface EditableProfile {
  phone: string;
  city: string;
  district: string;
  country: string;
  employer: string;
  jobTitle: string;
  sector: string;
  bio: string;
  linkedin: string;
  mentorAvailable: boolean;
  directoryVisible: boolean;
  showEmail: boolean;
  showPhone: boolean;
}

/** Restricted fields request changes via this draft (never direct edits). */
export interface ChangeRequestDraft {
  field:
    | "fullName"
    | "rollNumber"
    | "departmentId"
    | "session"
    | "passingYear"
    | "gender";
  newValue: string;
  note: string;
}

export type { AlumniChangeRequest };

/**
 * Alumni directory view models — snake_case DB → camelCase VM.
 * Field names mirror context.md §6 `alumni` + `alumni_change_requests`.
 */
import type { Datasource, VerifyStatus } from "@/lib/constants/statuses";

export interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  alumniCount: number;
}

export interface Alumnus {
  id: string;
  userId: string | null; // null for imported-only records
  rollNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  gender: "male" | "female";
  departmentId: string;
  departmentName: string;
  degree: string; // 'BS' only for now — context.md §2
  sessionStartYear: number;
  sessionEndYear: number;
  passingYear: number;
  city: string | null;
  district: string | null;
  country: string | null;
  employer: string | null;
  jobTitle: string | null;
  sector: string | null;
  bio: string | null;
  socialLinks: Record<string, string>;
  photoPath: string | null;
  mentorAvailable: boolean;
  directoryVisible: boolean;
  showEmail: boolean;
  showPhone: boolean;
  verifyStatus: VerifyStatus;
  rejectReason: string | null;
  isFeatured: boolean;
  achievement: string | null;
  datasource: Datasource;
  createdAt: string;
}

export interface ChangeField {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

export interface AlumniChangeRequest {
  id: string;
  alumniId: string;
  alumniName: string;
  rollNumber: string;
  changes: ChangeField[];
  status: "pending" | "approved" | "rejected";
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface Ecard {
  alumniId: string;
  cardNo: string;
  status: "active" | "revoked";
  verifyToken: string;
  issuedAt: string;
  revokedAt: string | null;
}

export interface AlumniFilters {
  q?: string;
  departmentId?: string;
  passingYear?: number;
  session?: string;
  city?: string;
  district?: string;
  employer?: string;
  sector?: string;
  gender?: string;
  verifyStatus?: VerifyStatus;
  featured?: boolean;
  page?: number;
  sort?: string;
}

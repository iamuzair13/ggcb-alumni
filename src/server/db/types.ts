/**
 * Hand-written row types matching the §6 schema — one interface per table.
 * No ORM: these document the contract; queries select explicit columns.
 */
import type {
  AuthTokenType,
  ChangeRequestStatus,
  GenderType,
  OutboxStatus,
  UserRole,
} from "./enums";
import type { Datasource, VerifyStatus } from "@/lib/constants/statuses";

export interface AppliedMigrationRow {
  id: number;
  name: string;
  checksum: string;
  applied_at: Date;
  execution_ms: number | null;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  role: UserRole;
  is_active: boolean;
  email_verified_at: Date | null;
  last_login_at: Date | null;
  session_version: number;
  created_at: Date;
  updated_at: Date;
}

export interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AlumniRow {
  id: string;
  user_id: string | null;
  roll_number: string;
  roll_number_norm: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  gender: GenderType | null;
  department_id: string;
  degree: string;
  session_start_year: number | null;
  session_end_year: number | null;
  passing_year: number | null;
  city: string | null;
  district: string | null;
  country: string | null;
  employer: string | null;
  job_title: string | null;
  sector: string | null;
  bio: string | null;
  social_links: Record<string, unknown>;
  photo_path: string | null;
  mentor_available: boolean;
  directory_visible: boolean;
  show_email: boolean;
  show_phone: boolean;
  is_featured: boolean;
  achievement: string | null;
  verify_status: VerifyStatus;
  reject_reason: string | null;
  verified_by: string | null;
  verified_at: Date | null;
  datasource: Datasource;
  created_at: Date;
  updated_at: Date;
}

export interface AlumniChangeRequestRow {
  id: string;
  alumni_id: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  status: ChangeRequestStatus;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  review_note: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuthAttemptRow {
  id: number;
  kind: string;
  key_hash: string;
  succeeded: boolean;
  attempted_at: Date;
}

export interface AuthTokenRow {
  id: string;
  user_id: string;
  type: AuthTokenType;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface EmailOutboxRow {
  id: string;
  to_email: string;
  template: string;
  payload: Record<string, unknown> | null;
  status: OutboxStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: Date;
  locked_at: Date | null;
  last_error: string | null;
  sent_at: Date | null;
  created_at: Date;
}

export interface EmailLogRow {
  id: number;
  outbox_id: string | null;
  to_email: string;
  template: string;
  status: string;
  error: string | null;
  created_at: Date;
}

export interface AdminActivityLogRow {
  id: number;
  actor_user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  created_at: Date;
}

export interface LoginLogRow {
  id: number;
  user_id: string | null;
  email_attempted: string | null;
  success: boolean;
  reason: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: Date;
}

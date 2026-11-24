/**
 * Status/type constants — string unions only, no DB dependency.
 * Mirrors context.md §4 enums so labels stay consistent across the app.
 */

export const VERIFY_STATUSES = [
  "under_approval",
  "verified",
  "rejected",
] as const;
export type VerifyStatus = (typeof VERIFY_STATUSES)[number];

export const VERIFY_STATUS_LABELS: Record<VerifyStatus, string> = {
  under_approval: "Under approval",
  verified: "Verified",
  rejected: "Rejected",
};

export const EVENT_TYPES = ["reunion", "seminar", "talk", "other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const OPPORTUNITY_TYPES = [
  "job",
  "internship",
  "scholarship",
  "other",
] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export const ECARD_STATUSES = ["active", "revoked"] as const;
export type EcardStatus = (typeof ECARD_STATUSES)[number];

export const DATASOURCES = ["registration", "import"] as const;
export type Datasource = (typeof DATASOURCES)[number];

/** Opportunities — context.md §4.7. */
import type { OpportunityType } from "@/lib/constants/statuses";

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  organization: string;
  description: string;
  applyUrl: string | null;
  contact: string | null;
  deadline: string;
  isPublished: boolean;
}

export function isExpired(o: Opportunity, today = new Date()): boolean {
  return new Date(o.deadline) < today;
}

export type { OpportunityType };

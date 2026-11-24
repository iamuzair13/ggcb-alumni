import type { Opportunity, OpportunityType } from "./types";

export interface OpportunitiesPort {
  list(type?: OpportunityType, q?: string): Opportunity[];
  save(item: Opportunity): Opportunity;
  remove(id: string): void;
}

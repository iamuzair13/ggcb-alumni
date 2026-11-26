/**
 * Service ports for the alumni directory — the container pages implement
 * these over the database later; the demo implements them over fixtures.
 */
import type {
  Alumnus,
  AlumniChangeRequest,
  AlumniFilters,
  Department,
} from "./types";

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AlumniDirectoryPort {
  listAlumni(filters: AlumniFilters): Paged<Alumnus>;
  getAlumnus(id: string): Alumnus | undefined;
  tabCounts(): Record<
    "verified" | "under_approval" | "rejected" | "requests",
    number
  >;
  filterOptions(): {
    departments: Department[];
    passingYears: number[];
    cities: string[];
    districts: string[];
    employers: string[];
    sectors: string[];
  };
  decide(
    ids: string[],
    decision: "approve" | "reject",
    reason?: string,
  ): number;
  feature(ids: string[], featured: boolean): number;
  listChangeRequests(status?: string): AlumniChangeRequest[];
  decideChangeRequest(
    id: string,
    decision: "approve" | "reject",
    note?: string,
  ): void;
}

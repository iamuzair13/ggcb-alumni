import type { AuditEvent, AuditFilters } from "./types";

export interface AuditLogsPort {
  list(
    filters: AuditFilters,
    page: number,
    pageSize: number,
  ): {
    items: AuditEvent[];
    total: number;
  };
}

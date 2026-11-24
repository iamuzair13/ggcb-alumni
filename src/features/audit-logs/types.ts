/** Audit log VM — context.md §4.11. */
export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  metadata: Record<string, unknown>; // already sanitised server-side
}

export interface AuditFilters {
  actor?: string;
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
}

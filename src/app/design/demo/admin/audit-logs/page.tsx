import { notFound } from "next/navigation";
import { DemoAdminShell } from "@/components/demo/demo-shells";
import { AuditLogsView } from "@/features/audit-logs/views/audit-logs-view";
import { auditLogsFixture } from "@/features/audit-logs/fixtures";

/** Dev-only prototype of /admin/audit-logs — deterministic fixtures only. */
export default function DemoAdminAuditLogs() {
  if (process.env.NODE_ENV === "production") notFound();

  // Newest first — the same order the real query returns.
  const events = [...auditLogsFixture()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <DemoAdminShell>
      <AuditLogsView events={events} />
    </DemoAdminShell>
  );
}

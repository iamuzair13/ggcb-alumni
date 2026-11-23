import type { Metadata } from "next";
import { ScrollText } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";
import { requireRole } from "@/server/auth/session";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AdminAuditLogsPage() {
  await requireRole(["superadmin", "admin"]);
  return (
    <PlaceholderPage
      title="Audit Logs"
      description="Admin activity, login, and email audit trails."
      icon={ScrollText}
    />
  );
}

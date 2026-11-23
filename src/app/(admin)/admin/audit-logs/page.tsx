import type { Metadata } from "next";
import { ScrollText } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = { title: "Audit Logs" };

export default function AdminAuditLogsPage() {
  return (
    <PlaceholderPage
      title="Audit Logs"
      description="Admin activity, login, and email audit trails."
      icon={ScrollText}
    />
  );
}

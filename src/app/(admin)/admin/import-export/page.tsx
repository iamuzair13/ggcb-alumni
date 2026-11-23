import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";
import { requireRole } from "@/server/auth/session";

export const metadata: Metadata = { title: "Import/Export" };

export default async function AdminImportExportPage() {
  await requireRole(["superadmin", "admin"]);
  return (
    <PlaceholderPage
      title="Import/Export"
      description="Bulk Excel/CSV import with column mapping, staging, and filtered export."
      icon={ArrowLeftRight}
    />
  );
}

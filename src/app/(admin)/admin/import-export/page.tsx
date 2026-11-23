import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = { title: "Import/Export" };

export default function AdminImportExportPage() {
  return (
    <PlaceholderPage
      title="Import/Export"
      description="Bulk Excel/CSV import with column mapping, staging, and filtered export."
      icon={ArrowLeftRight}
    />
  );
}

import type { Metadata } from "next";
import { Users } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = { title: "Alumni" };

export default function AdminAlumniPage() {
  return (
    <PlaceholderPage
      title="Alumni"
      description="Searchable, filterable alumni list with approval workflows and bulk actions."
      icon={Users}
    />
  );
}

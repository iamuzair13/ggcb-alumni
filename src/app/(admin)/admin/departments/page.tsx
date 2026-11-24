import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = { title: "Departments" };

export default function AdminDepartmentsPage() {
  return (
    <PlaceholderPage
      title="Departments"
      description="Manage the college's departments (name, code, active status)."
      icon={Building2}
    />
  );
}

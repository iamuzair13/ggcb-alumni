import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default function AdminDashboardPage() {
  return (
    <PlaceholderPage
      title="Dashboard"
      description="Totals, registration trends, and alumni breakdowns by department and year."
      icon={LayoutDashboard}
    />
  );
}

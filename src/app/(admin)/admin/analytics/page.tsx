import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = { title: "Analytics" };

export default function AdminAnalyticsPage() {
  return (
    <PlaceholderPage
      title="Analytics"
      description="Single analytics dashboard: totals, trends, and breakdowns."
      icon={BarChart3}
    />
  );
}

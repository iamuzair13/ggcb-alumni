import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = { title: "Content" };

export default function AdminContentPage() {
  return (
    <PlaceholderPage
      title="Content"
      description="Events, announcements, opportunities, and success-story moderation."
      icon={FileText}
    />
  );
}

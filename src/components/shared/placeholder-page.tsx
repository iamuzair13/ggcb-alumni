import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * Navigation placeholder for sections scheduled in later prompts.
 * Renders the page's title + a designed empty state — never fake data.
 */
export function PlaceholderPage({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon}
        title={`${title} is coming soon`}
        description="This section is a navigation placeholder. It will be implemented in a later phase."
      />
    </div>
  );
}

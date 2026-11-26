/** Alumni dashboard VM — the three verify-status variants (§3.2). */
import type { Alumnus, Ecard } from "@/features/alumni-directory/types";
import type { AdminEvent } from "@/features/events/types";
import type { Announcement } from "@/features/announcements/types";
import type { Opportunity } from "@/features/opportunities/types";
import type { Story } from "@/features/stories/types";

export interface AlumniDashboardData {
  me: Alumnus;
  ecard: Ecard | null;
  completeness: { percent: number; missing: string[] };
  upcomingEvents: AdminEvent[];
  latestAnnouncements: Announcement[];
  openOpportunities: Opportunity[];
  featuredStory: Story | null;
}

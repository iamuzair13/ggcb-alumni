"use client";

/**
 * Content admin — /admin/content (blueprint §3.3). Five tabs over the
 * same pattern: list → dialog create/edit → confirm delete. Rows live in
 * local state here (not inside the tab panels) so edits survive switching
 * tabs in the prototype.
 */
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { useDemo } from "@/components/demo/demo-provider";

import type { AdminEvent } from "@/features/events/types";
import type { Announcement } from "@/features/announcements/types";
import type { Opportunity } from "@/features/opportunities/types";
import type { Story } from "@/features/stories/types";
import type { Alumnus } from "@/features/alumni-directory/types";
import type { FeaturedEntry } from "../types";

import { EventsTab } from "./events-tab";
import { AnnouncementsTab } from "./announcements-tab";
import { OpportunitiesTab } from "./opportunities-tab";
import { StoriesTab } from "./stories-tab";
import { FeaturedTab } from "./featured-tab";

export interface ContentViewProps {
  events: AdminEvent[];
  announcements: Announcement[];
  opportunities: Opportunity[];
  stories: Story[];
  featured: FeaturedEntry[];
  /** Verified alumni pool — the featured picker filters out featured ids. */
  verifiedAlumni: Alumnus[];
}

export function ContentView(props: ContentViewProps) {
  const { persona } = useDemo();
  const readOnly = persona.role !== "admin" && persona.role !== "superadmin";

  const [events, setEvents] = useState(props.events);
  const [announcements, setAnnouncements] = useState(props.announcements);
  const [opportunities, setOpportunities] = useState(props.opportunities);
  const [stories, setStories] = useState(props.stories);
  const [featured, setFeatured] = useState(props.featured);

  const pendingStories = stories.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Content"
        description="Events, announcements, opportunities, alumni stories and the featured-alumni list."
      />
      <Tabs defaultValue="events" className="w-full">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="stories">
              Stories review
              {pendingStories > 0 ? (
                <Badge variant="secondary" className="ml-1">
                  {pendingStories}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="featured">Featured alumni</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="events" className="pt-4">
          <EventsTab rows={events} setRows={setEvents} readOnly={readOnly} />
        </TabsContent>
        <TabsContent value="announcements" className="pt-4">
          <AnnouncementsTab
            rows={announcements}
            setRows={setAnnouncements}
            readOnly={readOnly}
          />
        </TabsContent>
        <TabsContent value="opportunities" className="pt-4">
          <OpportunitiesTab
            rows={opportunities}
            setRows={setOpportunities}
            readOnly={readOnly}
          />
        </TabsContent>
        <TabsContent value="stories" className="pt-4">
          <StoriesTab rows={stories} setRows={setStories} readOnly={readOnly} />
        </TabsContent>
        <TabsContent value="featured" className="pt-4">
          <FeaturedTab
            featured={featured}
            setFeatured={setFeatured}
            alumni={props.verifiedAlumni}
            readOnly={readOnly}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

/**
 * Alumni events — upcoming/past tabs with a list/calendar toggle
 * (blueprint §3.2). Read-only: rows open a detail sheet; there is nothing
 * to submit.
 */
import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, LayoutList, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DateBlock } from "@/components/shared/date-block";
import { CalendarGrid } from "@/components/shared/calendar-grid";
import { EmptyState } from "@/components/shared/empty-state";
import { ParagraphText } from "@/components/shared/paragraph-text";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { AdminEvent, EventType } from "../types";

const TYPE_LABELS: Record<EventType, string> = {
  reunion: "Reunion",
  seminar: "Seminar",
  talk: "Talk",
  other: "Other",
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function EventSheet({
  event,
  onClose,
}: {
  event: Row | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={event !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto">
        {event ? (
          <>
            <SheetHeader>
              <SheetTitle>{event.title}</SheetTitle>
              <SheetDescription>
                <Badge variant="secondary" className="mr-2">
                  {TYPE_LABELS[event.type]}
                </Badge>
                {event.isPast ? "Past event" : "Upcoming"}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-3 px-4 pb-4 text-sm">
              <p className="flex items-center gap-2">
                <CalendarDays
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                {event.startsAt.length === 10
                  ? formatDate(event.startsAt)
                  : formatDateTime(event.startsAt)}
                {event.endsAt ? ` – ${formatDate(event.endsAt)}` : ""}
              </p>
              <p className="flex items-center gap-2">
                <MapPin
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                {event.venue}
              </p>
              <ParagraphText
                text={event.description}
                className="text-muted-foreground"
              />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

type Row = AdminEvent & { isPast: boolean };

export function EventsView({ events }: { events: AdminEvent[] }) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selected, setSelected] = useState<Row | null>(null);

  const today = startOfToday();
  const { upcoming, past } = useMemo(() => {
    const withFlag: Row[] = events.map((e) => ({
      ...e,
      isPast: new Date(e.startsAt) < today,
    }));
    return {
      upcoming: withFlag
        .filter((e) => !e.isPast)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      past: withFlag
        .filter((e) => e.isPast)
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    };
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps -- `today` is a render-time constant

  function eventList(rows: Row[]) {
    if (rows.length === 0) {
      return (
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled"
          description="The college posts events here first — check back soon."
          className="mt-4"
        />
      );
    }
    return (
      <ul className="mt-4 space-y-3">
        {rows.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => setSelected(e)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors",
                "hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                e.isPast && "opacity-70",
              )}
            >
              <DateBlock iso={e.startsAt} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{e.title}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {TYPE_LABELS[e.type]}
                  </Badge>
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3" aria-hidden="true" />
                  {e.venue}
                  {e.isPast ? " · Past" : ""}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reunions, seminars and college events open to alumni.
          </p>
        </div>
        {/* List / calendar toggle */}
        <div
          role="group"
          aria-label="View as"
          className="flex rounded-lg border p-0.5"
        >
          <Button
            size="sm"
            variant={view === "list" ? "secondary" : "ghost"}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <LayoutList data-icon="inline-start" aria-hidden="true" />
            List
          </Button>
          <Button
            size="sm"
            variant={view === "calendar" ? "secondary" : "ghost"}
            aria-pressed={view === "calendar"}
            onClick={() => setView("calendar")}
          >
            <CalendarDays data-icon="inline-start" aria-hidden="true" />
            Calendar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        {(["upcoming", "past"] as const).map((tab) => {
          const rows = tab === "upcoming" ? upcoming : past;
          return (
            <TabsContent key={tab} value={tab}>
              {view === "list" ? (
                eventList(rows)
              ) : (
                <div className="mt-4">
                  <CalendarGrid
                    events={rows.map((e) => ({
                      id: e.id,
                      date: e.startsAt,
                      title: e.title,
                    }))}
                    onSelect={(ce) =>
                      setSelected(rows.find((r) => r.id === ce.id) ?? null)
                    }
                  />
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <EventSheet event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

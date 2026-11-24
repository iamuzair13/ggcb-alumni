"use client";

/**
 * Lightweight month grid for the events calendar — hand-built, no lib.
 * Pure date math helpers are exported for unit tests.
 */
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CalendarEvent {
  id: string;
  date: string; // ISO yyyy-mm-dd
  title: string;
}

/** Days of the calendar page for a given month (Mon-first, 6 weeks max). */
export function monthGrid(
  year: number,
  month: number,
): { date: Date; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first offset
  const start = new Date(year, month, 1 - lead);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d, inMonth: d.getMonth() === month };
  });
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarGrid({
  events,
  onSelect,
}: {
  events: CalendarEvent[];
  onSelect?: (e: CalendarEvent) => void;
}) {
  const [now] = useState(() => new Date());
  const [ym, setYm] = useState(() => ({
    y: new Date().getFullYear(),
    m: new Date().getMonth(),
  }));
  const days = useMemo(() => monthGrid(ym.y, ym.m), [ym]);
  const byDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = e.date.slice(0, 10);
      m.set(key, [...(m.get(key) ?? []), e]);
    }
    return m;
  }, [events]);

  function shift(delta: number) {
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => shift(-1)}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <p className="text-sm font-semibold" aria-live="polite">
          {MONTHS[ym.m]} {ym.y}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => shift(1)}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div
        role="grid"
        aria-label={`Events in ${MONTHS[ym.m]} ${ym.y}`}
        className="grid grid-cols-7"
      >
        {/* role="row" wrappers are display:contents — ARIA-valid, layout-neutral */}
        <div role="row" className="contents">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              role="columnheader"
              className="border-b px-1 py-1.5 text-center text-[11px] font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, w) => (
          <div key={w} role="row" className="contents">
            {days.slice(w * 7, w * 7 + 7).map(({ date, inMonth }) => {
              const key = date.toISOString().slice(0, 10);
              const dayEvents = byDate.get(key) ?? [];
              const isToday = key === now.toISOString().slice(0, 10);
              return (
                <div
                  key={key}
                  role="gridcell"
                  className={cn(
                    "min-h-16 border-r border-b p-1 last:border-r-0",
                    !inMonth && "bg-muted/30",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs",
                      isToday &&
                        "bg-primary font-semibold text-primary-foreground",
                      !inMonth && "text-muted-foreground",
                    )}
                  >
                    {date.getDate()}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onSelect?.(e)}
                        className="block w-full truncate rounded bg-primary/10 px-1 py-0.5 text-left text-[10px] font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {e.title}
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="px-1 text-[10px] text-muted-foreground">
                        +{dayEvents.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

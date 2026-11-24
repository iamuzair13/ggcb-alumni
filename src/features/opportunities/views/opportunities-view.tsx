"use client";

/**
 * Alumni opportunities — type chips + text search over published items.
 * Expired cards are muted with a "Closed" badge and a disabled apply
 * control. Links open externally; email-only items show a Contact mailto.
 */
import { useMemo, useState } from "react";
import { Briefcase, ExternalLink, Mail, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DeadlineBadge } from "@/components/shared/deadline-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ParagraphText } from "@/components/shared/paragraph-text";
import { cn } from "@/lib/utils";
import { isExpired } from "../types";
import type { Opportunity, OpportunityType } from "../types";

const TYPE_LABELS: Record<OpportunityType, string> = {
  job: "Job",
  internship: "Internship",
  scholarship: "Scholarship",
  other: "Other",
};

const FILTERS: { id: "all" | OpportunityType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "job", label: "Jobs" },
  { id: "internship", label: "Internships" },
  { id: "scholarship", label: "Scholarships" },
  { id: "other", label: "Other" },
];

export function OpportunitiesView({
  opportunities,
}: {
  opportunities: Opportunity[];
}) {
  const [type, setType] = useState<"all" | OpportunityType>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return opportunities.filter((o) => {
      if (type !== "all" && o.type !== type) return false;
      if (!needle) return true;
      return [o.title, o.organization, o.description]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [opportunities, type, q]);

  const filteredOut = opportunities.length > 0 && filtered.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Opportunities</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jobs, internships and scholarships shared with alumni.
        </p>
      </div>

      {/* Type chips */}
      <div
        role="group"
        aria-label="Filter by type"
        className="flex flex-wrap gap-2"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={type === f.id}
            onClick={() => setType(f.id)}
            className={cn(
              "min-h-11 rounded-full border px-3.5 text-sm font-medium transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              type === f.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, organisation or description…"
          aria-label="Search opportunities"
          className="h-11 pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={
            filteredOut
              ? "No opportunities match these filters"
              : "No opportunities yet"
          }
          description={
            filteredOut
              ? "Adjust the search or clear the filters to see everything."
              : "New postings from the college and partners appear here."
          }
          action={
            filteredOut ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQ("");
                  setType("all");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((o) => {
            const expired = isExpired(o);
            return (
              <li key={o.id}>
                <Card className={cn("p-4", expired && "bg-muted/40")}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{TYPE_LABELS[o.type]}</Badge>
                        {expired ? (
                          <Badge className="bg-muted text-muted-foreground">
                            Closed
                          </Badge>
                        ) : null}
                        <p className="text-sm font-medium">{o.title}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {o.organization}
                      </p>
                    </div>
                    <DeadlineBadge deadline={o.deadline} />
                  </div>
                  <ParagraphText
                    text={o.description}
                    className="mt-2 line-clamp-2 text-sm text-muted-foreground"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {expired ? (
                      <>
                        <Button size="sm" variant="outline" disabled>
                          Apply
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Applications closed
                        </span>
                      </>
                    ) : o.applyUrl ? (
                      <Button
                        size="sm"
                        variant="outline"
                        render={
                          <a
                            href={o.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                      >
                        Apply
                        <ExternalLink
                          data-icon="inline-end"
                          aria-hidden="true"
                        />
                      </Button>
                    ) : o.contact ? (
                      <Button
                        size="sm"
                        variant="outline"
                        render={<a href={`mailto:${o.contact}`} />}
                      >
                        <Mail data-icon="inline-start" aria-hidden="true" />
                        Contact: {o.contact}
                      </Button>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

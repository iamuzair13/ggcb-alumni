"use client";

/**
 * Alumni announcements — pinned first, expandable bodies, attachment chip.
 * Only published announcements reach this view (the page filters).
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Megaphone, Paperclip, Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ParagraphText } from "@/components/shared/paragraph-text";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { Announcement } from "../types";

function fileName(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

export function AnnouncementsView({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const now = new Date();
    return announcements
      .filter((a) => !a.expiresAt || new Date(a.expiresAt) >= now)
      .sort(
        (a, b) =>
          Number(b.isPinned) - Number(a.isPinned) ||
          b.publishAt.localeCompare(a.publishAt),
      );
  }, [announcements]);

  if (sorted.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-semibold">Announcements</h1>
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="When the college posts news for alumni, it shows up here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Announcements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Notices from the college, pinned items first.
        </p>
      </div>

      <ul className="space-y-3">
        {sorted.map((a) => {
          const expanded = openId === a.id;
          return (
            <li key={a.id} className="rounded-xl border bg-card p-4">
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : a.id)}
                aria-expanded={expanded}
                aria-controls={`ann-${a.id}`}
                className="flex w-full items-start justify-between gap-3 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    {a.isPinned ? (
                      <Badge variant="secondary" className="text-[10px]">
                        <Pin className="size-3" aria-hidden="true" />
                        Pinned
                      </Badge>
                    ) : null}
                    <span className="text-sm font-medium">{a.title}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {formatDate(a.publishAt)}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
                    expanded && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>

              {expanded ? (
                <div id={`ann-${a.id}`} className="mt-3 border-t pt-3">
                  <ParagraphText
                    text={a.body}
                    className="text-sm text-muted-foreground"
                  />
                  {a.attachmentPath ? (
                    <button
                      type="button"
                      onClick={() =>
                        toast("This will be wired in a later slice.")
                      }
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <Paperclip className="size-3.5" aria-hidden="true" />
                      {fileName(a.attachmentPath)}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

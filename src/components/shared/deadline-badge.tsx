"use client";

/** Deadline chip — days-left colouring, text always carries the state. */
import { useState } from "react";
import { cn } from "@/lib/utils";

export function DeadlineBadge({ deadline }: { deadline: string }) {
  // "Today" is captured once at mount — the chip is a snapshot by design.
  const [now] = useState(() => Date.now());
  const days = Math.ceil((new Date(deadline).getTime() - now) / 86_400_000);
  const expired = days < 0;
  const soon = !expired && days <= 14;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        expired && "bg-muted text-muted-foreground",
        soon && "bg-warning text-warning-foreground",
        !expired && !soon && "bg-success text-success-foreground",
      )}
    >
      {expired ? "Closed" : days === 0 ? "Closes today" : `${days}d left`}
    </span>
  );
}

import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Placeholder brand mark (context.md §13-D1 — real logo not yet supplied).
 * Rebranding = edit this component and the colour tokens in globals.css.
 */
export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <GraduationCap className="size-5" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-heading text-base font-semibold tracking-tight">
            GGCB
          </span>
          <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground">
            Alumni Portal
          </span>
        </span>
      )}
    </span>
  );
}

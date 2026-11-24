/** Profile completeness meter — label + bar + what is missing. */
import { cn } from "@/lib/utils";

export function CompletenessMeter({
  percent,
  missing,
  className,
}: {
  percent: number;
  missing: string[];
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">Profile completeness</p>
        <p className="tnum text-sm font-semibold text-primary">{percent}%</p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completeness"
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      {missing.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Add {missing.slice(0, 3).join(", ")}
          {missing.length > 3 && ` and ${missing.length - 3} more`} to complete
          your record.
        </p>
      )}
      <span className={cn("sr-only")}>
        {missing.length === 0 ? "Profile complete." : ""}
      </span>
    </div>
  );
}

/** Calendar-style date block for event tiles. */
import { cn } from "@/lib/utils";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function DateBlock({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex w-14 shrink-0 flex-col items-center rounded-md border border-border bg-card py-1.5 text-center",
        className,
      )}
    >
      <span className="text-[10px] font-semibold tracking-wide text-primary uppercase">
        {MONTHS[d.getMonth()]}
      </span>
      <span className="font-heading text-xl leading-tight font-semibold">
        {d.getDate()}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {d.getFullYear()}
      </span>
    </div>
  );
}

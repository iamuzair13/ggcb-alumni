/** KPI card for admin dashboards — big number + label + optional trend. */
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4",
        accent && "border-primary/40",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="tnum mt-1 font-heading text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** KPI card for admin dashboards — big number + label + optional trend. */
import Link from "next/link";

import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  accent = false,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: boolean;
  /** When set, the whole card is a link (stats double as filters). */
  href?: string;
}) {
  const body = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="tnum mt-1 font-heading text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </>
  );
  const classes = cn(
    "rounded-lg border bg-card p-4",
    accent && "border-primary/40",
    href &&
      "outline-none transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50",
  );
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

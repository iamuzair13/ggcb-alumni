import { cn } from "@/lib/utils";

/**
 * The ledger rule — the signature divider of the "college ledger" design
 * language (docs/design/ui-direction.md): a thin rule with a heavier tick
 * at its left edge, like the margin of a register page. Decorative only.
 */
export function LedgerRule({
  className,
  tick = true,
}: {
  className?: string;
  /** The heavier mark at the left edge. */
  tick?: boolean;
}) {
  return (
    <div aria-hidden="true" className={cn("flex items-center", className)}>
      {tick && <span className="h-5 w-1.5 rounded-sm bg-primary" />}
      <span className="ml-3 h-px flex-1 bg-border" />
      <span className="ml-1.5 h-px w-10 bg-border" />
    </div>
  );
}

/**
 * Faint ledger-line texture for expressive surfaces (hero, footer).
 * Pure CSS gradient stripes at low alpha — no raster, no dependency.
 */
export function LedgerPattern({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 [background-image:repeating-linear-gradient(to_bottom,transparent,transparent_27px,var(--border)_27px,var(--border)_28px)] opacity-40",
        className,
      )}
    />
  );
}

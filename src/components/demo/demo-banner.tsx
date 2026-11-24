import { FlaskConical } from "lucide-react";

/**
 * Persistent "Demo data" strip on every /design/demo page — the visual
 * contract that nothing here is real. Rendered by the demo layout.
 */
export function DemoBanner() {
  return (
    <div
      role="status"
      className="border-b border-warning-foreground/20 bg-warning px-4 py-1.5 text-center text-xs font-medium text-warning-foreground"
    >
      <FlaskConical
        className="mr-1.5 inline-block size-3.5 align-[-2px]"
        aria-hidden="true"
      />
      Demo data — not real. Clickable prototype for review; fixtures only.
    </div>
  );
}

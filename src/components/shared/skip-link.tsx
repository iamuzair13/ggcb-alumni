import { cn } from "@/lib/utils";

/**
 * Skip link — first focusable element on every shell so keyboard users can
 * bypass navigation (WCAG 2.4.1).
 */
export function SkipLink({
  targetId = "main-content",
  className,
}: {
  targetId?: string;
  className?: string;
}) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-80 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none",
        className,
      )}
    >
      Skip to main content
    </a>
  );
}

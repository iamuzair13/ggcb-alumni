import { cn } from "@/lib/utils";

/**
 * Standard page header: title (serif), optional description, optional
 * actions slot on the right, optional breadcrumb slot above the title.
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {breadcrumb}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-pretty sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-prose text-sm text-pretty text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

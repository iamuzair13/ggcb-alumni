import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  /**
   * Plain-text fallback for the mobile card's <dt> when `header` is
   * interactive (e.g. a sort link) — an interactive element doesn't belong
   * inside a term, and it would repeat once per card.
   */
  headerText?: string;
  cell: (row: T) => React.ReactNode;
  /** Class applied to both head and body cells (e.g. "text-right tnum"). */
  className?: string;
}

/**
 * Responsive table pattern (documented in docs/design/design-system.md §9):
 *
 * - ≥ sm: a real <table> whose overflow scrolls *inside its own container* —
 *   the page never scrolls horizontally.
 * - < sm: each row renders as a stacked card with "Header: value" pairs.
 *
 * Pass the same `columns` definition to both layouts so nothing diverges.
 */
export function DataTable<T extends { id: string | number }>({
  columns,
  rows,
  caption,
  empty,
  className,
  compact = false,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  caption?: string;
  empty?: React.ReactNode;
  className?: string;
  /** Density toggle — tighter rows for scanning. */
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return <>{empty}</>;
  }

  return (
    <div className={className}>
      {/* Stacked cards — small screens */}
      <ul className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-lg border bg-card p-3 text-card-foreground"
          >
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {columns.map((col) => (
                <div key={col.key} className="contents">
                  <dt className="font-medium text-muted-foreground">
                    {col.headerText ?? col.header}
                  </dt>
                  <dd className={cn("min-w-0", col.className)}>
                    {col.cell(row)}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {/* Real table — its own scroll container on both axes, so the header
          sticks while the page below scrolls (sticky needs a true scroller —
          overflow-x:auto alone turns into one, which is why thead sticky
          fails inside most table wrappers). */}
      <div className="hidden max-h-[72vh] overflow-auto rounded-lg border sm:block">
        <Table>
          {caption ? <TableCaption>{caption}</TableCaption> : null}
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "sticky top-0 z-10 bg-card",
                    compact ? "h-8" : undefined,
                    col.className,
                  )}
                  scope="col"
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      compact ? "py-1.5 text-xs" : undefined,
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

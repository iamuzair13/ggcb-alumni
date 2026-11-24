import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { buildListHref, type SearchParams } from "@/lib/list-params";

/**
 * Pager — "Showing x–y of n" + previous/next links (blueprint §2).
 * Server component: links carry the full param set, so page state is a
 * real URL (shareable, back-button friendly). Compact prev/next is enough
 * for staff lists at this scale; windowed numbers can be added later.
 */
export function Pager({
  pathname,
  params,
  total,
  page,
  pageSize,
}: {
  pathname: string;
  params: SearchParams;
  total: number;
  page: number;
  pageSize: number;
}) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const href = (p: number) =>
    buildListHref(pathname, params, { page: p > 1 ? p : undefined });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="tnum text-sm text-muted-foreground">
        Showing {start}–{end} of {total}
      </p>
      {totalPages > 1 ? (
        <Pagination aria-label="Pages">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={page > 1 ? href(page - 1) : undefined}
                aria-disabled={page <= 1}
                className={
                  page <= 1 ? "pointer-events-none opacity-50" : undefined
                }
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                href="#"
                isActive
                aria-current="page"
                onClick={(e) => e.preventDefault()}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href={page < totalPages ? href(page + 1) : undefined}
                aria-disabled={page >= totalPages}
                className={
                  page >= totalPages
                    ? "pointer-events-none opacity-50"
                    : undefined
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}

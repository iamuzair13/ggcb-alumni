/**
 * Alumni directory (read model) — tabbed by verification state, URL-driven
 * search/filters/sort/pagination over live data.
 *
 * Read-only on purpose like the dashboard: approve/reject must issue an
 * E-card in the same transaction (context.md §4.5) and there is no ecard
 * table yet — decisions land with that slice. Until then every staff role
 * gets the same truthful surface.
 */
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  CircleStar,
  Clock,
  FileEdit,
  Rows2,
  Search,
  Upload,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buildListHref, type SearchParams } from "@/lib/list-params";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ListToolbar,
  type ToolbarFilter,
} from "@/components/shared/list-toolbar";
import { Pager } from "@/components/shared/pager";
import type {
  ChangeRequestRow,
  DirectoryFilterOptions,
  DirectoryRow,
  DirectorySort,
  DirectoryTab,
  DirectoryTabCounts,
} from "@/server/services/alumni-directory";

const TABS: {
  id: DirectoryTab;
  label: string;
  key: keyof DirectoryTabCounts;
  /** Count chip tint — the same status hue the ledger cell carries. */
  chip: string;
  /** Active underline + label ink. */
  active: string;
}[] = [
  {
    id: "verified",
    label: "Verified",
    key: "verified",
    chip: "bg-success text-success-foreground",
    active: "border-success-foreground text-success-foreground",
  },
  {
    id: "under_approval",
    label: "Under approval",
    key: "underApproval",
    chip: "bg-warning text-warning-foreground",
    active: "border-warning-foreground text-warning-foreground",
  },
  {
    id: "rejected",
    label: "Rejected",
    key: "rejected",
    chip: "bg-destructive/10 text-destructive",
    active: "border-destructive text-destructive",
  },
  {
    id: "requests",
    label: "Change requests",
    key: "pendingChangeRequests",
    chip: "bg-info text-info-foreground",
    active: "border-info-foreground text-info-foreground",
  },
];

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const fmtDate = (iso: string | null) =>
  iso ? dateFmt.format(new Date(iso)) : "—";

/* ── tab strip (links, not Tabs — state lives in the URL) ───────────── */

function TabStrip({
  tab,
  counts,
  params,
  pathname,
}: {
  tab: DirectoryTab;
  counts: DirectoryTabCounts;
  params: SearchParams;
  pathname: string;
}) {
  return (
    <nav aria-label="Alumni record sets">
      {/* Block-level scroller + w-max row: the ul's min-content must not
          propagate into the flex-column body (page-level overflow). */}
      <div className="overflow-x-auto border-b">
        <ul role="list" className="flex w-max min-w-full gap-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <li key={t.id} className="shrink-0">
                <Link
                  href={buildListHref(pathname, params, {
                    tab: t.id === "verified" ? undefined : t.id,
                    page: undefined,
                  })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? cn("font-medium", t.active)
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      "tnum rounded-full px-1.5 py-0.5 text-xs",
                      t.chip,
                    )}
                  >
                    {counts[t.key]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/* ── sortable column header ─────────────────────────────────────────── */

function SortHeader({
  label,
  sort,
  next,
  params,
  tab,
  pathname,
}: {
  label: string;
  sort: DirectorySort;
  next: DirectorySort;
  params: SearchParams;
  tab: DirectoryTab;
  pathname: string;
}) {
  const active = sort === next || (next === "name" && sort === "name_desc");
  const toggled =
    next === "name" && sort === "name"
      ? ("name_desc" as const)
      : next === "name" && sort === "name_desc"
        ? ("name" as const)
        : next;
  return (
    <Link
      href={buildListHref(pathname, params, {
        tab: tab === "verified" ? undefined : tab,
        sort: toggled === "name" ? undefined : toggled,
        page: undefined,
      })}
      className="inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={`Sort by ${label.toLowerCase()}`}
      aria-current={active ? "true" : undefined}
    >
      {label}
      {active ? (
        sort === "name_desc" || sort === "year" || sort === "recent" ? (
          <ArrowDown className="size-3 text-primary" aria-hidden="true" />
        ) : (
          <ArrowUp className="size-3 text-primary" aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown
          className="size-3 text-muted-foreground/50"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

/* ── request status badge ───────────────────────────────────────────── */

const REQ_STYLES = {
  pending: {
    icon: Clock,
    label: "Pending",
    classes: "bg-warning text-warning-foreground",
  },
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    classes: "bg-success text-success-foreground",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    classes: "bg-destructive/10 text-destructive",
  },
} as const;

function RequestStatusBadge({
  status,
}: {
  status: ChangeRequestRow["status"];
}) {
  const s = REQ_STYLES[status];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 border-transparent", s.classes)}
    >
      <s.icon className="size-3" aria-hidden="true" />
      {s.label}
    </Badge>
  );
}

/* ── the view ───────────────────────────────────────────────────────── */

export function AlumniDirectoryView({
  tab,
  counts,
  params,
  options,
  rows,
  requests,
  total,
  page,
  pageSize,
  sort,
  narrowed,
  pathname,
  compact = false,
}: {
  tab: DirectoryTab;
  counts: DirectoryTabCounts;
  params: SearchParams;
  options: DirectoryFilterOptions;
  rows: DirectoryRow[];
  requests: ChangeRequestRow[];
  total: number;
  page: number;
  pageSize: number;
  sort: DirectorySort;
  /** Any narrowing (q or a filter) is active — changes empty-state copy. */
  narrowed: boolean;
  /** Route the list lives under — all generated hrefs stay local. */
  pathname: string;
  /** Compact row density — URL state like everything else. */
  compact?: boolean;
}) {
  const registerEmpty =
    counts.verified + counts.underApproval + counts.rejected === 0;

  const toolbarFilters: ToolbarFilter[] = [
    {
      key: "dept",
      label: "Department",
      options: options.departments.map((d) => ({ value: d.id, label: d.name })),
    },
    {
      key: "year",
      label: "Year",
      options: options.passingYears.map((y) => ({
        value: String(y),
        label: String(y),
      })),
    },
    {
      key: "city",
      label: "City",
      options: options.cities.map((c) => ({ value: c, label: c })),
    },
    {
      key: "district",
      label: "District",
      options: options.districts.map((c) => ({ value: c, label: c })),
    },
    {
      key: "sector",
      label: "Sector",
      options: options.sectors.map((s) => ({ value: s, label: s })),
    },
    {
      key: "gender",
      label: "Gender",
      options: [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "featured",
      label: "Featured",
      options: [{ value: "1", label: "Featured only" }],
    },
  ];

  const alumniColumns: DataTableColumn<DirectoryRow>[] = [
    {
      key: "name",
      headerText: "Name",
      header: (
        <SortHeader
          label="Name"
          sort={sort}
          next="name"
          params={params}
          tab={tab}
          pathname={pathname}
        />
      ),
      cell: (a) => (
        <span className="flex items-center gap-2">
          <span className="min-w-0 truncate font-medium">{a.fullName}</span>
          {a.isFeatured ? (
            <CircleStar
              className="size-3.5 shrink-0 text-accent-foreground"
              role="img"
              aria-label="Featured alumnus"
            />
          ) : null}
        </span>
      ),
    },
    {
      key: "roll",
      header: "Roll no.",
      cell: (a) => <span className="font-mono text-xs">{a.rollNumber}</span>,
    },
    { key: "dept", header: "Department", cell: (a) => a.departmentName },
    {
      key: "year",
      headerText: "Year",
      header: (
        <SortHeader
          label="Year"
          sort={sort}
          next="year"
          params={params}
          tab={tab}
          pathname={pathname}
        />
      ),
      cell: (a) => <span className="tnum">{a.passingYear ?? "—"}</span>,
      className: "tnum",
    },
    { key: "city", header: "City", cell: (a) => a.city ?? "—" },
    {
      key: "source",
      header: "Source",
      cell: (a) => (
        <Badge
          variant="secondary"
          className={cn(
            "capitalize",
            a.datasource === "registration" && "bg-primary/10 text-primary",
          )}
        >
          {a.datasource}
        </Badge>
      ),
    },
    {
      key: "added",
      headerText: "Added",
      header: (
        <SortHeader
          label="Added"
          sort={sort}
          next="recent"
          params={params}
          tab={tab}
          pathname={pathname}
        />
      ),
      cell: (a) => <span className="tnum">{fmtDate(a.createdAt)}</span>,
    },
  ];

  const requestColumns: DataTableColumn<ChangeRequestRow>[] = [
    {
      key: "alumnus",
      header: "Alumnus",
      cell: (r) => (
        <span className="block">
          <span className="block truncate font-medium">{r.alumniName}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {r.rollNumber}
          </span>
        </span>
      ),
    },
    {
      key: "fields",
      header: "Requested change",
      cell: (r) => r.fields.join(", "),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <RequestStatusBadge status={r.status} />,
    },
    {
      key: "submitted",
      header: "Submitted",
      cell: (r) => <span className="tnum">{fmtDate(r.createdAt)}</span>,
    },
    {
      key: "reviewed",
      header: "Reviewed",
      cell: (r) => <span className="tnum">{fmtDate(r.reviewedAt)}</span>,
    },
  ];

  const alumniEmpty = narrowed ? (
    <EmptyState
      icon={Search}
      title="No records match"
      description="Nothing in this list matches the current search or filters — clear a filter or try a different term."
    />
  ) : registerEmpty ? (
    <EmptyState
      icon={Upload}
      title="The register is empty"
      description="No alumni records exist yet. Import the college's existing Excel list to start the register, or wait for registrations."
      action={
        <Link
          href="/admin/import-export"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Upload className="size-3.5" aria-hidden="true" />
          Import the alumni list
        </Link>
      }
    />
  ) : (
    <EmptyState
      icon={
        tab === "verified"
          ? UserCheck
          : tab === "under_approval"
            ? Clock
            : UserX
      }
      title={
        tab === "verified"
          ? "No verified alumni yet"
          : tab === "under_approval"
            ? "No registrations waiting"
            : "No rejected records"
      }
      description={
        tab === "verified"
          ? "Approved registrations appear here once staff review them."
          : tab === "under_approval"
            ? "New self-service registrations queue here for review."
            : "Rejected registrations land here with their review reason."
      }
    />
  );

  return (
    <div className="space-y-4">
      <TabStrip tab={tab} counts={counts} params={params} pathname={pathname} />

      <ListToolbar
        searchPlaceholder={
          tab === "requests"
            ? "Search name or roll no.…"
            : "Search name, roll no. or email…"
        }
        filters={tab === "requests" ? [] : toolbarFilters}
      />

      <div className="flex justify-end">
        <Link
          href={buildListHref(pathname, params, {
            density: compact ? undefined : "compact",
          })}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Rows2 className="size-3.5" aria-hidden="true" />
          {compact ? "Comfortable view" : "Compact view"}
        </Link>
      </div>

      {tab === "requests" ? (
        <DataTable
          compact={compact}
          columns={requestColumns}
          rows={requests}
          caption="Alumni change requests — restricted-field edits waiting for review."
          empty={
            narrowed ? (
              <EmptyState
                icon={Search}
                title="No requests match"
                description="No change request matches this search — check the spelling or clear it."
              />
            ) : (
              <EmptyState
                icon={FileEdit}
                title="No change requests"
                description="When verified alumni request restricted-field edits, they queue here for review."
              />
            )
          }
        />
      ) : (
        <DataTable
          compact={compact}
          columns={alumniColumns}
          rows={rows}
          caption={`Alumni records — ${TABS.find((t) => t.id === tab)?.label.toLowerCase()}.`}
          empty={alumniEmpty}
        />
      )}

      <Pager
        pathname={pathname}
        params={params}
        total={total}
        page={page}
        pageSize={pageSize}
      />

      {tab !== "requests" ? (
        <p className="text-xs text-muted-foreground">
          Approval, rejection and featuring decisions arrive with the E-card
          slice — approving a registration must issue the E-card in the same
          transaction.
        </p>
      ) : null}
      {tab === "requests" ? (
        <p className="text-xs text-muted-foreground">
          Review actions arrive with the same slice — approving applies the diff
          to the record in one transaction and writes an audit row.
        </p>
      ) : null}
    </div>
  );
}

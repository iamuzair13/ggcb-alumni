"use client";

/**
 * Admin alumni directory (demo) — tabs by verification state plus change
 * requests, debounced search + faceted filters (popover on desktop,
 * bottom sheet on mobile), row selection with bulk decisions, a detail
 * sheet and a change-request review sheet.
 *
 * All mutation is local: the fixture adapter owns a mutable copy of the
 * prop slices, `simulate()` fakes latency, `bump()` re-reads.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  FileEdit,
  Filter,
  Search,
  Star,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DiffTable } from "@/components/shared/diff-table";
import { EmptyState } from "@/components/shared/empty-state";
import {
  RowActions,
  type RowActionItem,
} from "@/components/shared/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { DemoForbidden } from "@/components/demo/demo-shells";
import { useDemo } from "@/components/demo/demo-provider";
import { adminRouteAllowed } from "@/features/_shared/personas";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

import { createDirectoryAdapter } from "../fixtures/adapter";
import { rejectReasonSchema } from "../schemas";
import type { Alumnus, AlumniChangeRequest, Department } from "../types";
import { RejectReasonDialog } from "./reject-reason-dialog";

const DEMO_BASE = "/design/demo";
const PAGE_SIZE = 15;
const ANY = "__any__";

type TabId = "verified" | "under_approval" | "rejected" | "requests";
const TAB_IDS: TabId[] = ["verified", "under_approval", "rejected", "requests"];

interface DirectoryFilters {
  departmentId?: string;
  passingYear?: number;
  city?: string;
  district?: string;
  sector?: string;
  gender?: string;
  featured?: boolean;
}

interface PendingAction {
  kind: "approve" | "reject" | "feature" | "unfeature";
  ids: string[];
}

interface FilterOptionSet {
  departments: Department[];
  passingYears: number[];
  cities: string[];
  districts: string[];
  sectors: string[];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

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
  status: AlumniChangeRequest["status"];
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

/** Compact definition list for sheet sections. */
function DefList({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "Showing x–y of n" + prev/next — local-state variant of Pager. */
function LocalPager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="tnum text-sm text-muted-foreground">
        Showing {start}–{end} of {total}
      </p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            Previous
          </Button>
          <span className="tnum text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/* ── filter controls (shared by desktop popover + mobile sheet) ────── */

function FilterSelect({
  label,
  value,
  options,
  onValue,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onValue: (v: string | undefined) => void;
}) {
  const current = value || ANY;
  const currentLabel =
    current === ANY
      ? `All ${label.toLowerCase()}`
      : (options.find((o) => o.value === current)?.label ?? label);
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select
        value={current}
        onValueChange={(v) => onValue(v === ANY ? undefined : String(v))}
      >
        <SelectTrigger className="w-full" aria-label={`Filter by ${label}`}>
          <span className="flex-1 text-left">{currentLabel}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{`All ${label.toLowerCase()}`}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterControls({
  filters,
  options,
  onChange,
}: {
  filters: DirectoryFilters;
  options: FilterOptionSet;
  onChange: (f: DirectoryFilters) => void;
}) {
  const set = (patch: Partial<DirectoryFilters>) =>
    onChange({ ...filters, ...patch });
  return (
    <div className="space-y-3">
      <FilterSelect
        label="Department"
        value={filters.departmentId ?? ""}
        options={options.departments.map((d) => ({
          value: d.id,
          label: d.name,
        }))}
        onValue={(v) => set({ departmentId: v })}
      />
      <FilterSelect
        label="Passing year"
        value={filters.passingYear ? String(filters.passingYear) : ""}
        options={options.passingYears.map((y) => ({
          value: String(y),
          label: String(y),
        }))}
        onValue={(v) => set({ passingYear: v ? Number(v) : undefined })}
      />
      <div className="grid grid-cols-2 gap-3">
        <FilterSelect
          label="City"
          value={filters.city ?? ""}
          options={options.cities.map((c) => ({ value: c, label: c }))}
          onValue={(v) => set({ city: v })}
        />
        <FilterSelect
          label="District"
          value={filters.district ?? ""}
          options={options.districts.map((c) => ({ value: c, label: c }))}
          onValue={(v) => set({ district: v })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FilterSelect
          label="Sector"
          value={filters.sector ?? ""}
          options={options.sectors.map((c) => ({ value: c, label: c }))}
          onValue={(v) => set({ sector: v })}
        />
        <FilterSelect
          label="Gender"
          value={filters.gender ?? ""}
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
          onValue={(v) => set({ gender: v })}
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Checkbox
          id="filter-featured"
          checked={filters.featured === true}
          onCheckedChange={(v) =>
            set({ featured: v === true ? true : undefined })
          }
          aria-labelledby="filter-featured-label"
        />
        <Label id="filter-featured-label" htmlFor="filter-featured">
          Featured alumni only
        </Label>
      </div>
    </div>
  );
}

/* ── feature dialog (achievement required) ─────────────────────────── */

function FeatureDialog({
  open,
  onOpenChange,
  count,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  count: number;
  pending: boolean;
  onSubmit: (achievement: string) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fresh state each time the dialog opens — adjust state during render.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setText("");
      setError(null);
    }
  }

  function submit() {
    const parsed = rejectReasonSchema.safeParse(text);
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ??
          "Give the achievement (at least 10 characters).",
      );
      return;
    }
    onSubmit(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Feature {count === 1 ? "this alumnus" : `${count} alumni`}?
          </DialogTitle>
          <DialogDescription>
            Featured alumni appear on the public stories gallery. Describe the
            achievement — it is shown next to their name.
          </DialogDescription>
        </DialogHeader>
        <FormField
          label="Achievement"
          required
          error={error ?? undefined}
          hint="One sentence, shown publicly."
        >
          {(id, describedBy) => (
            <Textarea
              id={id}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              aria-describedby={describedBy}
              aria-invalid={error ? true : undefined}
              placeholder="e.g. Founded a rural literacy programme…"
            />
          )}
        </FormField>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" loading={pending} onClick={submit}>
            Feature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── main view ─────────────────────────────────────────────────────── */

export function AlumniDirectoryView({
  alumni,
  changeRequests,
  departments,
  initialTab = "verified",
}: {
  alumni: Alumnus[];
  changeRequests: AlumniChangeRequest[];
  departments: Department[];
  initialTab?: string;
}) {
  const { persona, simulate } = useDemo();
  const router = useRouter();
  const adapter = useMemo(
    () => createDirectoryAdapter(alumni, changeRequests, departments),
    [alumni, changeRequests, departments],
  );
  const [, bump] = useReducer((x: number) => x + 1, 0);

  const [tab, setTab] = useState<TabId>(
    TAB_IDS.includes(initialTab as TabId) ? (initialTab as TabId) : "verified",
  );
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<DirectoryFilters>({});
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [reqSheetId, setReqSheetId] = useState<string | null>(null);
  const [action, setAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [reqNote, setReqNote] = useState("");
  const [reqBusy, setReqBusy] = useState<"approve" | "reject" | null>(null);

  // Debounced search (~300 ms).
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  // Any narrowing resets to page 1 and clears the selection — adjust
  // state during render rather than in an effect (no extra pass).
  const [prevNarrow, setPrevNarrow] = useState({ tab, q, filters, sort });
  if (
    prevNarrow.tab !== tab ||
    prevNarrow.q !== q ||
    prevNarrow.filters !== filters ||
    prevNarrow.sort !== sort
  ) {
    setPrevNarrow({ tab, q, filters, sort });
    setPage(1);
    setSelected(new Set());
  }

  if (!adminRouteAllowed(persona, "/admin/alumni")) return <DemoForbidden />;
  const canMutate = persona.role === "admin" || persona.role === "superadmin";

  const counts = adapter.tabCounts();
  const options = adapter.filterOptions();

  const paged =
    tab === "requests"
      ? { items: [] as Alumnus[], total: 0 }
      : adapter.listAlumni({
          verifyStatus: tab,
          q: q || undefined,
          ...filters,
          page,
          sort,
        });

  const reqQuery = q.toLowerCase();
  const reqRows = adapter
    .listChangeRequests()
    .filter(
      (r) =>
        !reqQuery ||
        `${r.alumniName} ${r.rollNumber}`.toLowerCase().includes(reqQuery),
    )
    .sort((a, b) => {
      if ((a.status === "pending") !== (b.status === "pending"))
        return a.status === "pending" ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  const reqPaged = {
    items: reqRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: reqRows.length,
  };

  const sheetAlumnus = sheetId ? adapter.getAlumnus(sheetId) : undefined;
  const sheetRequest = reqSheetId
    ? adapter.listChangeRequests().find((r) => r.id === reqSheetId)
    : undefined;

  /* ── active filter chips ── */
  const deptName = (id?: string) =>
    options.departments.find((d) => d.id === id)?.name ?? id;
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (q) chips.push({ key: "q", label: `“${q}”`, clear: () => setQInput("") });
  if (filters.departmentId)
    chips.push({
      key: "departmentId",
      label: `Department: ${deptName(filters.departmentId)}`,
      clear: () => setFilters({ ...filters, departmentId: undefined }),
    });
  if (filters.passingYear)
    chips.push({
      key: "passingYear",
      label: `Year: ${filters.passingYear}`,
      clear: () => setFilters({ ...filters, passingYear: undefined }),
    });
  for (const [key, label] of [
    ["city", "City"],
    ["district", "District"],
    ["sector", "Sector"],
    ["gender", "Gender"],
  ] as const) {
    const v = filters[key];
    if (v)
      chips.push({
        key,
        label: `${label}: ${v === "male" ? "Male" : v === "female" ? "Female" : v}`,
        clear: () => setFilters({ ...filters, [key]: undefined }),
      });
  }
  if (filters.featured)
    chips.push({
      key: "featured",
      label: "Featured only",
      clear: () => setFilters({ ...filters, featured: undefined }),
    });
  // The requests tab honours search only — filter chips would mislead.
  const visibleChips =
    tab === "requests" ? chips.filter((c) => c.key === "q") : chips;
  const clearAll = () => {
    setQInput("");
    setFilters({});
  };

  /* ── sorting headers ── */
  function sortHeader(key: "name" | "year", label: string) {
    const active = sort === key || sort === `${key}:desc`;
    const desc = sort === `${key}:desc`;
    return (
      <button
        type="button"
        onClick={() => setSort(!active ? key : desc ? key : `${key}:desc`)}
        className="inline-flex items-center gap-1 rounded-sm font-medium text-foreground/80 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={`Sort by ${label}${active ? (desc ? " — descending" : " — ascending") : ""}`}
      >
        {label}
        {desc ? (
          <ArrowDown className="size-3" aria-hidden="true" />
        ) : active ? (
          <ArrowUp className="size-3" aria-hidden="true" />
        ) : (
          <ArrowUpDown className="size-3 opacity-40" aria-hidden="true" />
        )}
      </button>
    );
  }

  /* ── selection ── */
  const pageIds = paged.items.map((a) => a.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const togglePage = (on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      for (const id of pageIds) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  const toggleOne = (id: string, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  /* ── mutations ── */
  async function runApprove(ids: string[]) {
    setActionBusy(true);
    await simulate(null, 550);
    const n = adapter.decide(ids, "approve");
    bump();
    setActionBusy(false);
    setAction(null);
    setSelected(new Set());
    toast.success(`${n} registration${n === 1 ? "" : "s"} approved`);
  }

  async function runReject(ids: string[], reason: string) {
    setActionBusy(true);
    await simulate(null, 600);
    const n = adapter.decide(ids, "reject", reason);
    bump();
    setActionBusy(false);
    setAction(null);
    setSelected(new Set());
    toast.success(`${n} registration${n === 1 ? "" : "s"} rejected`);
  }

  async function runFeature(ids: string[], achievement: string) {
    setActionBusy(true);
    await simulate(null, 500);
    adapter.feature(ids, true);
    for (const id of ids) {
      const a = adapter.getAlumnus(id);
      if (a) a.achievement = achievement;
    }
    bump();
    setActionBusy(false);
    setAction(null);
    setSelected(new Set());
    toast.success(
      `${ids.length} record${ids.length === 1 ? "" : "s"} featured`,
    );
  }

  async function runUnfeature(ids: string[]) {
    setActionBusy(true);
    await simulate(null, 500);
    adapter.feature(ids, false);
    bump();
    setActionBusy(false);
    setAction(null);
    setSelected(new Set());
    toast.success("Removed from featured");
  }

  async function decideRequest(
    r: AlumniChangeRequest,
    decision: "approve" | "reject",
  ) {
    setReqBusy(decision);
    await simulate(null, 550);
    adapter.decideChangeRequest(r.id, decision, reqNote.trim() || undefined);
    bump();
    setReqBusy(null);
    setReqNote("");
    toast.success(
      `Change request ${decision === "approve" ? "approved" : "rejected"}`,
    );
  }

  /* ── columns ── */
  function rowItems(a: Alumnus): RowActionItem[] {
    const items: RowActionItem[] = [
      {
        key: "details",
        label: "Open details",
        onSelect: () => setSheetId(a.id),
      },
      {
        key: "record",
        label: "Open full record",
        onSelect: () => router.push(`${DEMO_BASE}/admin/alumni/${a.id}`),
      },
    ];
    if (!canMutate) return items;
    if (a.verifyStatus === "under_approval") {
      items.push(
        {
          key: "approve",
          label: "Approve",
          onSelect: () => setAction({ kind: "approve", ids: [a.id] }),
        },
        {
          key: "reject",
          label: "Reject…",
          destructive: true,
          onSelect: () => setAction({ kind: "reject", ids: [a.id] }),
        },
      );
    }
    if (a.verifyStatus === "verified") {
      items.push(
        a.isFeatured
          ? {
              key: "unfeature",
              label: "Remove from featured…",
              onSelect: () => setAction({ kind: "unfeature", ids: [a.id] }),
            }
          : {
              key: "feature",
              label: "Feature…",
              onSelect: () => setAction({ kind: "feature", ids: [a.id] }),
            },
      );
    }
    return items;
  }

  const alumniColumns: DataTableColumn<Alumnus>[] = [
    ...(canMutate
      ? [
          {
            key: "select",
            className: "w-9",
            header: (
              <Checkbox
                aria-label="Select all on this page"
                checked={allPageSelected}
                onCheckedChange={(v) => togglePage(v === true)}
              />
            ),
            cell: (a: Alumnus) => (
              <Checkbox
                aria-label={`Select ${a.fullName}`}
                checked={selected.has(a.id)}
                onCheckedChange={(v) => toggleOne(a.id, v === true)}
              />
            ),
          } satisfies DataTableColumn<Alumnus>,
        ]
      : []),
    {
      key: "name",
      header: sortHeader("name", "Name"),
      cell: (a) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar size="sm">
            <AvatarFallback>{initials(a.fullName)}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => setSheetId(a.id)}
            className="min-w-0 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="block truncate font-medium underline-offset-4 hover:underline">
              {a.fullName}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {a.email}
            </span>
          </button>
        </div>
      ),
    },
    {
      key: "roll",
      header: "Roll no",
      cell: (a) => <span className="font-mono text-xs">{a.rollNumber}</span>,
    },
    { key: "dept", header: "Department", cell: (a) => a.departmentName },
    {
      key: "year",
      header: sortHeader("year", "Year"),
      className: "tnum",
      cell: (a) => a.passingYear,
    },
    { key: "city", header: "City", cell: (a) => a.city ?? "—" },
    {
      key: "status",
      header: "Status",
      cell: (a) => <StatusBadge status={a.verifyStatus} />,
    },
    {
      key: "featured",
      header: <span className="sr-only">Featured</span>,
      cell: (a) =>
        a.isFeatured ? (
          <span className="inline-flex items-center gap-1 text-accent-foreground">
            <Star className="size-4 fill-current" aria-hidden="true" />
            <span className="sr-only">Featured</span>
          </span>
        ) : (
          <span className="text-muted-foreground" aria-hidden="true">
            —
          </span>
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (a) => (
        <RowActions label={`Actions for ${a.fullName}`} items={rowItems(a)} />
      ),
    },
  ];

  const reqColumns: DataTableColumn<AlumniChangeRequest>[] = [
    {
      key: "alumnus",
      header: "Alumnus",
      cell: (r) => (
        <button
          type="button"
          onClick={() => setReqSheetId(r.id)}
          className="min-w-0 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="block font-medium underline-offset-4 hover:underline">
            {r.alumniName}
          </span>
          <span className="block font-mono text-xs text-muted-foreground">
            {r.rollNumber}
          </span>
        </button>
      ),
    },
    {
      key: "changes",
      header: "Requested change",
      cell: (r) => (
        <span className="text-muted-foreground">
          {r.changes.map((c) => c.label).join(", ")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <RequestStatusBadge status={r.status} />,
    },
    {
      key: "submitted",
      header: "Submitted",
      cell: (r) => formatDate(r.createdAt),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (r) => (
        <RowActions
          label={`Actions for request by ${r.alumniName}`}
          items={[
            {
              key: "review",
              label: "Review request",
              onSelect: () => setReqSheetId(r.id),
            },
            {
              key: "record",
              label: "Open alumnus record",
              onSelect: () =>
                router.push(`${DEMO_BASE}/admin/alumni/${r.alumniId}`),
            },
          ]}
        />
      ),
    },
  ];

  const filterCount = Object.values(filters).filter(Boolean).length;

  const toolbar = (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search name, roll number or email…"
            aria-label="Search alumni"
            className="pl-9"
          />
        </div>
        {tab !== "requests" ? (
          <div className="relative">
            <Button
              variant="outline"
              aria-expanded={popoverOpen || filterSheetOpen}
              onClick={() => {
                if (window.matchMedia("(min-width: 640px)").matches) {
                  setPopoverOpen((o) => !o);
                } else {
                  setFilterSheetOpen(true);
                }
              }}
            >
              <Filter data-icon="inline-start" aria-hidden="true" />
              Filters
              {filterCount > 0 ? (
                <Badge variant="secondary" className="ml-1">
                  {filterCount}
                </Badge>
              ) : null}
            </Button>
            {popoverOpen ? (
              <>
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setPopoverOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-2 hidden w-80 rounded-lg border bg-popover p-4 shadow-lg sm:block">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">Filters</p>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setFilters({})}
                    >
                      Reset
                    </Button>
                  </div>
                  <FilterControls
                    filters={filters}
                    options={options}
                    onChange={setFilters}
                  />
                </div>
              </>
            ) : null}
          </div>
        ) : null}
        <Button
          variant="ghost"
          onClick={() => toast("This will be wired in a later slice.")}
        >
          Export
        </Button>
      </div>
      {visibleChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {visibleChips.map((c) => (
            <Badge key={c.key} variant="secondary" className="gap-1.5 pr-1">
              {c.label}
              <button
                type="button"
                aria-label={`Clear ${c.label} filter`}
                onClick={c.clear}
                className="rounded-full p-0.5 outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="xs" onClick={clearAll}>
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );

  const alumniEmpty = (
    <EmptyState
      icon={Users}
      title="No alumni match these filters"
      description="Adjust or clear them to see everyone. Searching “zzz” is a reliable way to see this empty state."
      action={
        visibleChips.length > 0 ? (
          <Button variant="outline" onClick={clearAll}>
            Clear search and filters
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Alumni"
        description="Every registration and imported record — review, approve and keep the register tidy."
      />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabId)}
        className="space-y-4"
      >
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="verified">
              Verified
              <Badge variant="secondary" className="tnum">
                {counts.verified}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="under_approval">
              Under approval
              <Badge variant="secondary" className="tnum">
                {counts.under_approval}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected
              <Badge variant="secondary" className="tnum">
                {counts.rejected}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="requests">
              Change requests
              <Badge variant="secondary" className="tnum">
                {counts.requests}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {(["verified", "under_approval", "rejected"] as const).map((t) => (
          <TabsContent key={t} value={t} className="space-y-4">
            {toolbar}
            {canMutate && selected.size > 0 ? (
              <div
                className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3"
                role="status"
              >
                <span className="tnum text-sm font-medium">
                  {selected.size} selected
                </span>
                <Button
                  size="sm"
                  onClick={() =>
                    setAction({ kind: "approve", ids: [...selected] })
                  }
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    setAction({ kind: "reject", ids: [...selected] })
                  }
                >
                  Reject…
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setAction({ kind: "feature", ids: [...selected] })
                  }
                >
                  Feature…
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setAction({ kind: "unfeature", ids: [...selected] })
                  }
                >
                  Unfeature…
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </Button>
              </div>
            ) : null}
            <DataTable
              columns={alumniColumns}
              rows={paged.items}
              caption="Alumni records"
              empty={alumniEmpty}
            />
            <LocalPager
              page={page}
              pageSize={PAGE_SIZE}
              total={paged.total}
              onPage={setPage}
            />
          </TabsContent>
        ))}

        <TabsContent value="requests" className="space-y-4">
          {toolbar}
          <DataTable
            columns={reqColumns}
            rows={reqPaged.items}
            caption="Change requests"
            empty={
              <EmptyState
                icon={FileEdit}
                title="No change requests"
                description={
                  q
                    ? "No requests match that search — clear it to see them all."
                    : "When alumni ask to fix restricted fields, the requests land here."
                }
                action={
                  q ? (
                    <Button variant="outline" onClick={() => setQInput("")}>
                      Clear search
                    </Button>
                  ) : undefined
                }
              />
            }
          />
          <LocalPager
            page={page}
            pageSize={PAGE_SIZE}
            total={reqPaged.total}
            onPage={setPage}
          />
        </TabsContent>
      </Tabs>

      {/* Filters — mobile bottom sheet */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              Narrow the register by department, year and location.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-2">
            <FilterControls
              filters={filters}
              options={options}
              onChange={setFilters}
            />
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setFilters({})}>
              Reset
            </Button>
            <Button onClick={() => setFilterSheetOpen(false)}>
              Show results
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Alumni detail sheet */}
      <Sheet
        open={sheetAlumnus !== undefined}
        onOpenChange={(o) => !o && setSheetId(null)}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          {sheetAlumnus ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarFallback>
                      {initials(sheetAlumnus.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <SheetTitle className="truncate">
                      {sheetAlumnus.fullName}
                    </SheetTitle>
                    <SheetDescription className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={sheetAlumnus.verifyStatus} />
                      <span className="font-mono text-xs">
                        {sheetAlumnus.rollNumber}
                      </span>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="space-y-5 px-4">
                {sheetAlumnus.verifyStatus === "rejected" &&
                sheetAlumnus.rejectReason ? (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <span className="font-medium">Reject reason:</span>{" "}
                    {sheetAlumnus.rejectReason}
                  </p>
                ) : null}
                <section aria-label="Personal">
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Personal
                  </h3>
                  <DefList
                    items={[
                      ["Gender", sheetAlumnus.gender],
                      ["Bio", sheetAlumnus.bio],
                      [
                        "Featured",
                        sheetAlumnus.isFeatured
                          ? (sheetAlumnus.achievement ?? "Yes")
                          : "No",
                      ],
                    ]}
                  />
                </section>
                <section aria-label="Academic">
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Academic
                  </h3>
                  <DefList
                    items={[
                      ["Roll no", sheetAlumnus.rollNumber],
                      ["Department", sheetAlumnus.departmentName],
                      ["Degree", sheetAlumnus.degree],
                      [
                        "Session",
                        `${sheetAlumnus.sessionStartYear}–${sheetAlumnus.sessionEndYear}`,
                      ],
                      ["Passing year", String(sheetAlumnus.passingYear)],
                    ]}
                  />
                </section>
                <section aria-label="Contact">
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Contact
                  </h3>
                  <DefList
                    items={[
                      ["Email", sheetAlumnus.email],
                      ["Phone", sheetAlumnus.phone],
                      ["City", sheetAlumnus.city],
                      ["District", sheetAlumnus.district],
                      ["Country", sheetAlumnus.country],
                    ]}
                  />
                </section>
                <section aria-label="Work">
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Work
                  </h3>
                  <DefList
                    items={[
                      ["Employer", sheetAlumnus.employer],
                      ["Job title", sheetAlumnus.jobTitle],
                      ["Sector", sheetAlumnus.sector],
                    ]}
                  />
                </section>
                <p className="text-xs text-muted-foreground">
                  Source: {sheetAlumnus.datasource} · registered{" "}
                  {formatDate(sheetAlumnus.createdAt)}
                </p>
              </div>
              <SheetFooter>
                <Button
                  render={
                    <Link
                      href={`${DEMO_BASE}/admin/alumni/${sheetAlumnus.id}`}
                    />
                  }
                >
                  Open full record
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Change-request review sheet */}
      <Sheet
        open={sheetRequest !== undefined}
        onOpenChange={(o) => {
          if (!o) {
            setReqSheetId(null);
            setReqNote("");
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          {sheetRequest ? (
            <>
              <SheetHeader>
                <SheetTitle>Change request</SheetTitle>
                <SheetDescription>
                  {sheetRequest.alumniName} ·{" "}
                  <span className="font-mono">{sheetRequest.rollNumber}</span>
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4">
                <div className="flex items-center justify-between">
                  <RequestStatusBadge status={sheetRequest.status} />
                  <span className="text-xs text-muted-foreground">
                    Submitted {formatDate(sheetRequest.createdAt)}
                  </span>
                </div>
                <DiffTable changes={sheetRequest.changes} />
                {sheetRequest.status !== "pending" ? (
                  <p className="text-xs text-muted-foreground">
                    Reviewed {sheetRequest.reviewedAt} by{" "}
                    {sheetRequest.reviewedBy ?? "staff"}
                    {sheetRequest.reviewNote
                      ? ` — ${sheetRequest.reviewNote}`
                      : ""}
                  </p>
                ) : canMutate ? (
                  <>
                    <FormField
                      label="Review note"
                      hint="Optional — recorded with the decision."
                    >
                      {(id, describedBy) => (
                        <Textarea
                          id={id}
                          value={reqNote}
                          onChange={(e) => setReqNote(e.target.value)}
                          aria-describedby={describedBy}
                          placeholder="Checked against the register…"
                        />
                      )}
                    </FormField>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        loading={reqBusy === "approve"}
                        disabled={reqBusy !== null}
                        onClick={() => decideRequest(sheetRequest, "approve")}
                      >
                        <CheckCircle2
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                        Approve change
                      </Button>
                      <Button
                        className="flex-1"
                        variant="destructive"
                        loading={reqBusy === "reject"}
                        disabled={reqBusy !== null}
                        onClick={() => decideRequest(sheetRequest, "reject")}
                      >
                        <XCircle data-icon="inline-start" aria-hidden="true" />
                        Reject change
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Waiting for staff review.
                  </p>
                )}
              </div>
              <SheetFooter>
                <Button
                  variant="outline"
                  render={
                    <Link
                      href={`${DEMO_BASE}/admin/alumni/${sheetRequest.alumniId}`}
                    />
                  }
                >
                  Open alumnus record
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Bulk / single-record action dialogs */}
      <ConfirmDialog
        open={action?.kind === "approve"}
        onOpenChange={(o) => !o && !actionBusy && setAction(null)}
        title={`Approve ${action?.ids.length ?? 0} registration${(action?.ids.length ?? 0) === 1 ? "" : "s"}?`}
        description="The records move to verified and the alumni can sign in to the portal."
        confirmLabel={`Approve ${action?.ids.length ?? 0}`}
        pending={actionBusy}
        onConfirm={() => action && runApprove(action.ids)}
      />
      <ConfirmDialog
        open={action?.kind === "unfeature"}
        onOpenChange={(o) => !o && !actionBusy && setAction(null)}
        title={`Remove ${action?.ids.length ?? 0} record${(action?.ids.length ?? 0) === 1 ? "" : "s"} from featured?`}
        description="They stay verified — they just leave the featured gallery."
        confirmLabel={`Unfeature ${action?.ids.length ?? 0}`}
        pending={actionBusy}
        onConfirm={() => action && runUnfeature(action.ids)}
      />
      <RejectReasonDialog
        open={action?.kind === "reject"}
        onOpenChange={(o) => !o && !actionBusy && setAction(null)}
        title={`Reject ${action?.ids.length ?? 0} registration${(action?.ids.length ?? 0) === 1 ? "" : "s"}?`}
        description="The reason is recorded and shown to the alumnus."
        confirmLabel={`Reject ${action?.ids.length ?? 0}`}
        pending={actionBusy}
        onSubmit={(reason) => action && runReject(action.ids, reason)}
      />
      <FeatureDialog
        open={action?.kind === "feature"}
        onOpenChange={(o) => !o && !actionBusy && setAction(null)}
        count={action?.ids.length ?? 0}
        pending={actionBusy}
        onSubmit={(achievement) =>
          action && runFeature(action.ids, achievement)
        }
      />
    </div>
  );
}

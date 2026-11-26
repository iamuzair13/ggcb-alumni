"use client";

/**
 * Audit logs — /admin/audit-logs (blueprint §3.3). Read-only filterable
 * table; viewer is role-gated to DemoForbidden via adminRouteAllowed
 * (mirrors the real route policy). Filters + paging are client state.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, ListFilter, ScrollText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { useDemo } from "@/components/demo/demo-provider";
import { DemoForbidden } from "@/components/demo/demo-shells";
import { adminRouteAllowed } from "@/features/_shared/personas";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

import type { AuditEvent } from "../types";

const PAGE_SIZE = 15;
const ANY = "__any__";

interface Filters {
  actor: string;
  action: string;
  entity: string;
  from: string;
  to: string;
}
const EMPTY_FILTERS: Filters = {
  actor: ANY,
  action: ANY,
  entity: ANY,
  from: "",
  to: "",
};

export function AuditLogsView({ events }: { events: AuditEvent[] }) {
  const { persona } = useDemo();
  if (!adminRouteAllowed(persona, "/admin/audit-logs")) {
    return <DemoForbidden />;
  }
  return <AuditLogsInner events={events} />;
}

function AuditLogsInner({ events }: { events: AuditEvent[] }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const actors = useMemo(
    () => [...new Set(events.map((e) => e.actor))].sort(),
    [events],
  );
  const actions = useMemo(
    () => [...new Set(events.map((e) => e.action))].sort(),
    [events],
  );
  const entities = useMemo(
    () => [...new Set(events.map((e) => e.entity))].sort(),
    [events],
  );

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (filters.actor !== ANY && e.actor !== filters.actor) return false;
        if (filters.action !== ANY && e.action !== filters.action) return false;
        if (filters.entity !== ANY && e.entity !== filters.entity) return false;
        const day = e.createdAt.slice(0, 10);
        if (filters.from && day < filters.from) return false;
        if (filters.to && day > filters.to) return false;
        return true;
      }),
    [events, filters],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function update(patch: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  const activeCount =
    (filters.actor !== ANY ? 1 : 0) +
    (filters.action !== ANY ? 1 : 0) +
    (filters.entity !== ANY ? 1 : 0) +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0);

  const controls = (
    <>
      <FilterSelect
        id="flt-actor"
        label="Actor"
        value={filters.actor}
        options={actors}
        onChange={(v) => update({ actor: v })}
      />
      <FilterSelect
        id="flt-action"
        label="Action"
        value={filters.action}
        options={actions}
        onChange={(v) => update({ action: v })}
      />
      <FilterSelect
        id="flt-entity"
        label="Entity"
        value={filters.entity}
        options={entities}
        onChange={(v) => update({ entity: v })}
      />
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="flt-from" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id="flt-from"
            type="date"
            value={filters.from}
            onChange={(e) => update({ from: e.target.value })}
            className="w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="flt-to" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="flt-to"
            type="date"
            value={filters.to}
            onChange={(e) => update({ to: e.target.value })}
            className="w-36"
          />
        </div>
      </div>
    </>
  );

  const columns: DataTableColumn<AuditEvent>[] = [
    {
      key: "time",
      header: "Time",
      cell: (e) => <span className="tnum">{formatDateTime(e.createdAt)}</span>,
    },
    { key: "actor", header: "Actor", cell: (e) => e.actor },
    {
      key: "action",
      header: "Action",
      cell: (e) => (
        <Badge variant="outline" className="font-mono text-[11px]">
          {e.action}
        </Badge>
      ),
    },
    { key: "entity", header: "Entity", cell: (e) => e.entity },
    {
      key: "entityId",
      header: "Entity ID",
      cell: (e) => (
        <span
          className="inline-block max-w-28 truncate align-middle font-mono text-xs text-muted-foreground"
          title={e.entityId}
        >
          {e.entityId}
        </span>
      ),
    },
    {
      key: "open",
      header: <span className="sr-only">Details</span>,
      className: "text-right",
      cell: (e) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelected(e)}
          aria-label={`Details for audit event ${e.id}`}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit logs"
        description="Every staff action on the register — read-only."
      />

      {/* Filters — inline ≥ sm, in a sheet below that (blueprint §2). */}
      <div className="hidden flex-wrap items-end gap-3 sm:flex">{controls}</div>
      <div className="sm:hidden">
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                aria-label={
                  activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"
                }
              />
            }
          >
            <ListFilter data-icon="inline-start" aria-hidden="true" />
            Filters
            {activeCount > 0 ? (
              <Badge variant="secondary" className="ml-1">
                {activeCount}
              </Badge>
            ) : null}
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Narrow the audit log by actor, action, entity or date.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
              {controls}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {activeCount > 0 ? (
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {events.length} events match
          </p>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setPage(1);
            }}
          >
            <X data-icon="inline-start" aria-hidden="true" />
            Clear all
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={pageRows}
        caption="Audit events"
        empty={
          <EmptyState
            icon={ScrollText}
            title="No events match these filters"
            description="Adjust or clear the filters to see more of the audit log."
          />
        }
      />

      {filtered.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="tnum text-sm text-muted-foreground">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(filtered.length, safePage * PAGE_SIZE)} of{" "}
            {filtered.length}
          </p>
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                Previous
              </Button>
              <span className="tnum text-sm text-muted-foreground">
                Page {safePage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Detail sheet — sanitised metadata, pretty-printed. */}
      <Sheet
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        {selected ? (
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Audit event</SheetTitle>
              <SheetDescription>
                <span className="font-mono">{selected.id}</span> ·{" "}
                {formatDateTime(selected.createdAt)}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Actor</dt>
                <dd>{selected.actor}</dd>
                <dt className="text-muted-foreground">Action</dt>
                <dd>
                  <span className="font-mono text-xs">{selected.action}</span>
                </dd>
                <dt className="text-muted-foreground">Entity</dt>
                <dd>{selected.entity}</dd>
                <dt className="text-muted-foreground">Entity ID</dt>
                <dd className="font-mono text-xs">{selected.entityId}</dd>
              </dl>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Metadata
                </p>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(selected.id);
                    toast.success("ID copied");
                  } catch {
                    toast.error("Could not copy — select the ID manually.");
                  }
                }}
              >
                <Copy data-icon="inline-start" aria-hidden="true" />
                Copy ID
              </Button>
            </div>
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  );
}

/** One labelled select filter with an "All" option. */
function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={(v) => onChange(String(v))}>
        <SelectTrigger id={id} className={cn("w-full sm:w-44")}>
          <span className="flex-1 text-left">
            {value === ANY ? `All ${label.toLowerCase()}s` : value}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{`All ${label.toLowerCase()}s`}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

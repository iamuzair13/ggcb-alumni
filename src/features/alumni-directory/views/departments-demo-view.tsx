"use client";

/**
 * Departments demo view — mirrors the built /admin/departments screen
 * (src/components/admin/departments-view.tsx) anatomy: search toolbar,
 * DataTable, labelled row actions, create/edit dialog, confirm dialogs.
 * Actions are local stubs (useState + simulate + toast) — the real view
 * calls server actions internally, which a fixture-only demo must not.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  RowActions,
  type RowActionItem,
} from "@/components/shared/row-actions";
import { DemoForbidden } from "@/components/demo/demo-shells";
import { useDemo } from "@/components/demo/demo-provider";
import { adminRouteAllowed } from "@/features/_shared/personas";
import { formatDate } from "@/lib/utils/format";
import type { DepartmentViewRow } from "@/components/admin/departments-view";

function statusChip(d: DepartmentViewRow) {
  return (
    <Badge
      variant="outline"
      className={
        d.isActive
          ? "border-transparent bg-success text-success-foreground"
          : "border-transparent bg-muted text-muted-foreground"
      }
    >
      {d.isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

/** Create/edit dialog — name + code, local validation. */
function DeptFormDialog({
  open,
  onOpenChange,
  initial,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: DepartmentViewRow;
  pending: boolean;
  onSubmit: (name: string, code: string) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fresh state each time the dialog opens — adjust state during render.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(initial?.name ?? "");
      setCode(initial?.code ?? "");
      setErrors({});
    }
  }

  function submit() {
    const next: Record<string, string> = {};
    if (name.trim().length < 3)
      next.name = "Give the department name (at least 3 characters).";
    if (code.trim().length < 2)
      next.code = "Give a short code (at least 2 characters).";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit(name.trim(), code.trim().toUpperCase());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? `Edit ${initial.name}` : "Create department"}
          </DialogTitle>
          <DialogDescription>
            Departments appear in the registration form and the alumni
            directory.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Name" required error={errors.name}>
            {(id, describedBy) => (
              <Input
                id={id}
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((er) => ({ ...er, name: "" }));
                }}
                aria-describedby={describedBy}
                aria-invalid={errors.name ? true : undefined}
              />
            )}
          </FormField>
          <FormField
            label="Code"
            required
            error={errors.code}
            hint="Short code used on cards and lists, e.g. BSCS."
          >
            {(id, describedBy) => (
              <Input
                id={id}
                required
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setErrors((er) => ({ ...er, code: "" }));
                }}
                aria-describedby={describedBy}
                aria-invalid={errors.code ? true : undefined}
                className="font-mono uppercase"
              />
            )}
          </FormField>
        </div>
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
            {initial ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DepartmentsDemoView({
  rows: initialRows,
}: {
  rows: DepartmentViewRow[];
}) {
  const { persona, simulate } = useDemo();
  const [rows, setRows] = useState(initialRows);
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editDept, setEditDept] = useState<DepartmentViewRow | null>(null);
  const [confirm, setConfirm] = useState<{
    dept: DepartmentViewRow;
    kind: "deactivate" | "activate" | "delete";
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [dialogPending, setDialogPending] = useState(false);

  if (!adminRouteAllowed(persona, "/admin/departments"))
    return <DemoForbidden />;
  const readOnly = persona.role === "viewer";

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? rows.filter(
        (d) =>
          d.name.toLowerCase().includes(needle) ||
          d.code.toLowerCase().includes(needle),
      )
    : rows;

  function rowItems(d: DepartmentViewRow): RowActionItem[] {
    return [
      { key: "edit", label: "Edit…", onSelect: () => setEditDept(d) },
      d.isActive
        ? {
            key: "deactivate",
            label: "Deactivate…",
            onSelect: () => setConfirm({ dept: d, kind: "deactivate" }),
          }
        : {
            key: "activate",
            label: "Activate",
            onSelect: () => setConfirm({ dept: d, kind: "activate" }),
          },
      {
        key: "delete",
        label: "Delete…",
        destructive: true,
        disabled: d.alumniCount > 0,
        disabledReason:
          d.alumniCount > 0 ? `${d.alumniCount} alumni` : undefined,
        onSelect: () => setConfirm({ dept: d, kind: "delete" }),
      },
    ];
  }

  const columns: DataTableColumn<DepartmentViewRow>[] = [
    {
      key: "name",
      header: "Name",
      cell: (d) => <span className="font-medium">{d.name}</span>,
    },
    {
      key: "code",
      header: "Code",
      cell: (d) => <span className="font-mono text-xs">{d.code}</span>,
    },
    { key: "status", header: "Status", cell: statusChip },
    {
      key: "count",
      header: "Alumni",
      className: "tnum text-right",
      cell: (d) => d.alumniCount,
    },
    { key: "updated", header: "Updated", cell: (d) => formatDate(d.updatedAt) },
    ...(readOnly
      ? []
      : [
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            className: "text-right",
            cell: (d: DepartmentViewRow) => (
              <RowActions label={`Actions for ${d.name}`} items={rowItems(d)} />
            ),
          } satisfies DataTableColumn<DepartmentViewRow>,
        ]),
  ];

  async function submitForm(name: string, code: string) {
    setDialogPending(true);
    await simulate(null, 500);
    if (editDept) {
      setRows((rs) =>
        rs.map((d) =>
          d.id === editDept.id
            ? { ...d, name, code, updatedAt: "2026-11-24" }
            : d,
        ),
      );
      toast.success("Changes saved");
    } else {
      setRows((rs) => [
        ...rs,
        {
          id: `dep-demo-${rs.length + 1}`,
          name,
          code,
          isActive: true,
          alumniCount: 0,
          updatedAt: "2026-11-24",
        },
      ]);
      toast.success(`${name} created`);
    }
    setDialogPending(false);
    setCreateOpen(false);
    setEditDept(null);
  }

  async function runConfirm() {
    if (!confirm) return;
    setPending(true);
    await simulate(null, 500);
    if (confirm.kind === "delete") {
      setRows((rs) => rs.filter((d) => d.id !== confirm.dept.id));
      toast.success(`${confirm.dept.name} deleted`);
    } else {
      const active = confirm.kind === "activate";
      setRows((rs) =>
        rs.map((d) =>
          d.id === confirm.dept.id ? { ...d, isActive: active } : d,
        ),
      );
      toast.success(
        `${confirm.dept.name} ${active ? "activated" : "deactivated"}`,
      );
    }
    setPending(false);
    setConfirm(null);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Departments"
        description="The college's departments — shown to alumni at registration."
        actions={
          !readOnly ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Create department
            </Button>
          ) : undefined
        }
      />

      <div className="relative max-w-md">
        <Search
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or code…"
          aria-label="Search departments"
          className="pl-9"
        />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        caption="Departments"
        empty={
          <EmptyState
            icon={Building2}
            title={needle ? "No departments match" : "No departments yet"}
            description={
              needle
                ? "Adjust or clear the search to see them all."
                : "Create the college's first department so registrations can pick one."
            }
            action={
              needle ? (
                <Button variant="outline" onClick={() => setQ("")}>
                  Clear search
                </Button>
              ) : !readOnly ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Create department
                </Button>
              ) : undefined
            }
          />
        }
      />

      {!readOnly ? (
        <>
          <DeptFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            pending={dialogPending}
            onSubmit={submitForm}
          />
          <DeptFormDialog
            open={editDept !== null}
            onOpenChange={(o) => !o && setEditDept(null)}
            initial={editDept ?? undefined}
            pending={dialogPending}
            onSubmit={submitForm}
          />
          <ConfirmDialog
            open={confirm !== null}
            onOpenChange={(o) => !o && !pending && setConfirm(null)}
            title={
              confirm?.kind === "delete"
                ? `Delete ${confirm.dept.name}?`
                : confirm?.kind === "deactivate"
                  ? `Deactivate ${confirm.dept.name}?`
                  : `Activate ${confirm?.dept.name ?? ""}?`
            }
            description={
              confirm?.kind === "delete"
                ? "This permanently removes the department. Only unused departments can be deleted."
                : confirm?.kind === "deactivate"
                  ? "New registrations can no longer pick it; existing alumni keep their record."
                  : "New registrations can pick this department again."
            }
            confirmLabel={
              confirm
                ? `${
                    confirm.kind === "delete"
                      ? "Delete"
                      : confirm.kind === "deactivate"
                        ? "Deactivate"
                        : "Activate"
                  } ${confirm.dept.name}`
                : "Confirm"
            }
            destructive={confirm?.kind !== "activate"}
            pending={pending}
            onConfirm={runConfirm}
          />
        </>
      ) : null}
    </div>
  );
}

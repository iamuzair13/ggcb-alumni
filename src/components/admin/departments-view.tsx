"use client";

/**
 * Departments view — /admin/departments (blueprint §2 anatomy).
 * Viewer gets `readOnly` — controls absent client-side AND server-enforced
 * (the actions reject non-STAFF_OPS roles).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  RowActions,
  type RowActionItem,
} from "@/components/shared/row-actions";

import { formatDate } from "@/lib/utils/format";
import {
  createDepartmentAction,
  updateDepartmentAction,
  setDepartmentActiveAction,
  deleteDepartmentAction,
} from "@/lib/actions/departments";
import type { ActionResult } from "@/lib/result";
import type { ServiceResult } from "@/lib/result";

/** Message from any action result, narrowed safely. */
function actionMessage(
  r: ActionResult<ServiceResult | { status: "in_use"; alumniCount: number }>,
): string {
  if (!r.ok) return r.message;
  return r.data.status === "error" ? r.data.message : "Something went wrong";
}

export interface DepartmentViewRow {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  alumniCount: number;
  updatedAt: string;
}

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

export function DepartmentsView({
  rows,
  readOnly = false,
}: {
  rows: DepartmentViewRow[];
  /** viewer persona — action controls are removed entirely. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editDept, setEditDept] = useState<DepartmentViewRow | null>(null);
  const [confirm, setConfirm] = useState<{
    dept: DepartmentViewRow;
    kind: "deactivate" | "activate" | "delete";
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [inUseError, setInUseError] = useState<{
    dept: DepartmentViewRow;
    count: number;
  } | null>(null);

  const refresh = () => startTransition(() => router.refresh());

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

  // Plain derivation — cheap descriptors, no memo needed.
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
          },
        ]),
  ];

  return (
    <div className="space-y-4">
      <ListToolbar searchPlaceholder="Search name or code…" />

      <DataTable
        columns={columns}
        rows={rows}
        caption="Departments"
        empty={
          <EmptyState
            icon={Building2}
            title="No departments yet"
            description="Create the college's first department so registrations can pick one."
            action={
              !readOnly ? (
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
          <DepartmentFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            title="Create department"
            submitLabel="Create"
            action={createDepartmentAction}
            onDone={refresh}
          />
          {editDept ? (
            <DepartmentFormDialog
              open
              onOpenChange={(o) => !o && setEditDept(null)}
              title={`Edit ${editDept.name}`}
              submitLabel="Save changes"
              action={updateDepartmentAction}
              initial={{
                id: editDept.id,
                name: editDept.name,
                code: editDept.code,
              }}
              onDone={refresh}
            />
          ) : null}
          {confirm ? (
            <ConfirmDialog
              open
              onOpenChange={(o) => !o && setConfirm(null)}
              title={
                confirm.kind === "delete"
                  ? `Delete ${confirm.dept.name}?`
                  : confirm.kind === "deactivate"
                    ? `Deactivate ${confirm.dept.name}?`
                    : `Activate ${confirm.dept.name}?`
              }
              description={
                confirm.kind === "delete"
                  ? "This permanently removes the department. Only unused departments can be deleted."
                  : confirm.kind === "deactivate"
                    ? "New registrations can no longer pick it; existing alumni keep their record."
                    : "New registrations can pick this department again."
              }
              confirmLabel={
                confirm.kind === "delete"
                  ? `Delete ${confirm.dept.name}`
                  : confirm.kind === "deactivate"
                    ? `Deactivate ${confirm.dept.name}`
                    : `Activate ${confirm.dept.name}`
              }
              destructive={confirm.kind !== "activate"}
              pending={pending}
              onConfirm={async () => {
                setPending(true);
                if (confirm.kind === "delete") {
                  const r = await deleteDepartmentAction({
                    id: confirm.dept.id,
                  });
                  setPending(false);
                  if (r.ok && r.data.status === "ok") {
                    toast.success("Department deleted");
                    setConfirm(null);
                    refresh();
                  } else if (r.ok && r.data.status === "in_use") {
                    setConfirm(null);
                    setInUseError({
                      dept: confirm.dept,
                      count: r.data.alumniCount,
                    });
                  } else {
                    toast.error(actionMessage(r));
                    setConfirm(null);
                  }
                } else {
                  const r = await setDepartmentActiveAction({
                    id: confirm.dept.id,
                    active: confirm.kind === "activate",
                  });
                  setPending(false);
                  if (r.ok && r.data.status === "ok") {
                    toast.success(
                      confirm.kind === "activate" ? "Activated" : "Deactivated",
                    );
                    setConfirm(null);
                    refresh();
                  } else {
                    toast.error(actionMessage(r));
                  }
                }
              }}
            />
          ) : null}
          {inUseError ? (
            <ConfirmDialog
              open
              onOpenChange={(o) => !o && setInUseError(null)}
              title={`${inUseError.dept.name} cannot be deleted`}
              description={`${inUseError.count} alumni record${inUseError.count === 1 ? "" : "s"} reference this department. Deactivate it instead — registrations stop showing it but alumni records stay intact.`}
              confirmLabel={`Deactivate ${inUseError.dept.name}`}
              pending={pending}
              onConfirm={async () => {
                setPending(true);
                const r = await setDepartmentActiveAction({
                  id: inUseError.dept.id,
                  active: false,
                });
                setPending(false);
                if (r.ok && r.data.status === "ok") {
                  toast.success("Deactivated");
                  setInUseError(null);
                  refresh();
                } else {
                  toast.error(actionMessage(r));
                }
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Primary action for the page header — button + create dialog. */
export function CreateDepartmentButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" aria-hidden="true" />
        Create department
      </Button>
      <DepartmentFormDialog
        open={open}
        onOpenChange={setOpen}
        title="Create department"
        submitLabel="Create"
        action={createDepartmentAction}
        onDone={() => router.refresh()}
      />
    </>
  );
}

/** Name + code form dialog (create and edit). */
function DepartmentFormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  action,
  initial,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  submitLabel: string;
  action: (input: unknown) => Promise<ActionResult<ServiceResult>>;
  initial?: { id: string; name: string; code: string };
  onDone?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o && !initial) {
          setName("");
          setCode("");
        }
      }}
      title={title}
      description="Departments appear in the registration form and the alumni directory."
      submitLabel={submitLabel}
      pendingLabel="Saving…"
      action={action}
      buildInput={() =>
        initial ? { id: initial.id, name, code } : { name, code }
      }
      onSuccess={onDone}
    >
      {(errors, clearError) => (
        <>
          <FormField label="Name" required error={errors.name}>
            {(id, describedBy) => (
              <Input
                id={id}
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
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
                  clearError("code");
                }}
                aria-describedby={describedBy}
                aria-invalid={errors.code ? true : undefined}
              />
            )}
          </FormField>
        </>
      )}
    </FormDialog>
  );
}

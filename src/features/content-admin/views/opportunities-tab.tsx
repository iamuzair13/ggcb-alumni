"use client";

/** Opportunities tab — /admin/content: list + dialog CRUD. */
import { useState } from "react";
import { toast } from "sonner";
import { Briefcase, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  RowActions,
  type RowActionItem,
} from "@/components/shared/row-actions";
import { DeadlineBadge } from "@/components/shared/deadline-badge";
import { useDemo } from "@/components/demo/demo-provider";
import { cn } from "@/lib/utils";

import {
  OPPORTUNITY_TYPES,
  type OpportunityType,
} from "@/lib/constants/statuses";
import {
  opportunitySchema,
  type OpportunityInput,
} from "@/features/opportunities/schemas";
import { isExpired, type Opportunity } from "@/features/opportunities/types";
import { useDemoAction } from "./demo-action";

const TYPE_LABELS: Record<OpportunityType, string> = {
  job: "Job",
  internship: "Internship",
  scholarship: "Scholarship",
  other: "Other",
};

export function OpportunitiesTab({
  rows,
  setRows,
  readOnly,
}: {
  rows: Opportunity[];
  setRows: React.Dispatch<React.SetStateAction<Opportunity[]>>;
  readOnly: boolean;
}) {
  const { simulate } = useDemo();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<Opportunity | null>(null);
  const [deleteRow, setDeleteRow] = useState<Opportunity | null>(null);
  const [pending, setPending] = useState(false);

  function togglePublished(row: Opportunity, value: boolean) {
    setRows((rs) =>
      rs.map((r) => (r.id === row.id ? { ...r, isPublished: value } : r)),
    );
    void simulate(null, 450).then(() =>
      toast.success(
        value ? "Opportunity published" : "Opportunity unpublished",
      ),
    );
  }

  function rowItems(row: Opportunity): RowActionItem[] {
    return [
      { key: "edit", label: "Edit…", onSelect: () => setEditRow(row) },
      {
        key: "delete",
        label: "Delete…",
        destructive: true,
        onSelect: () => setDeleteRow(row),
      },
    ];
  }

  const columns: DataTableColumn<Opportunity>[] = [
    {
      key: "type",
      header: "Type",
      cell: (o) => <Badge variant="outline">{TYPE_LABELS[o.type]}</Badge>,
    },
    {
      key: "title",
      header: "Title",
      cell: (o) => (
        <span
          className={cn("font-medium", isExpired(o) && "text-muted-foreground")}
        >
          {o.title}
        </span>
      ),
    },
    {
      key: "organization",
      header: "Organisation",
      cell: (o) => (
        <span className={cn(isExpired(o) && "text-muted-foreground")}>
          {o.organization}
        </span>
      ),
    },
    {
      key: "deadline",
      header: "Deadline",
      cell: (o) => <DeadlineBadge deadline={o.deadline} />,
    },
    {
      key: "published",
      header: "Status",
      cell: (o) =>
        readOnly ? (
          <Badge
            variant="outline"
            className={
              o.isPublished
                ? "border-transparent bg-success text-success-foreground"
                : "border-transparent bg-muted text-muted-foreground"
            }
          >
            {o.isPublished ? "Published" : "Draft"}
          </Badge>
        ) : (
          <Switch
            checked={o.isPublished}
            onCheckedChange={(v) => togglePublished(o, v === true)}
            aria-label={`Published — ${o.title}`}
          />
        ),
    },
    ...(readOnly
      ? []
      : [
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            className: "text-right",
            cell: (o: Opportunity) => (
              <RowActions
                label={`Actions for ${o.title}`}
                items={rowItems(o)}
              />
            ),
          },
        ]),
  ];

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            New opportunity
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        caption="Opportunities"
        empty={
          <EmptyState
            icon={Briefcase}
            title="No opportunities yet"
            description="Post the first job, internship or scholarship for alumni."
            action={
              !readOnly ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  New opportunity
                </Button>
              ) : undefined
            }
          />
        }
      />

      {!readOnly ? (
        <>
          <OpportunityFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onDone={(input) =>
              setRows((rs) => [
                ...rs,
                {
                  id: `op-new-${rs.length + 1}`,
                  type: input.type,
                  title: input.title,
                  organization: input.organization,
                  description: input.description,
                  applyUrl: input.applyUrl || null,
                  contact: null,
                  deadline: input.deadline,
                  isPublished: input.isPublished,
                },
              ])
            }
          />
          {editRow ? (
            <OpportunityFormDialog
              open
              onOpenChange={(o) => !o && setEditRow(null)}
              initial={editRow}
              onDone={(input) =>
                setRows((rs) =>
                  rs.map((r) =>
                    r.id === editRow.id
                      ? {
                          ...r,
                          type: input.type,
                          title: input.title,
                          organization: input.organization,
                          applyUrl: input.applyUrl || null,
                          deadline: input.deadline,
                          isPublished: input.isPublished,
                        }
                      : r,
                  ),
                )
              }
            />
          ) : null}
          {deleteRow ? (
            <ConfirmDialog
              open
              onOpenChange={(o) => !o && setDeleteRow(null)}
              title={`Delete ${deleteRow.title}?`}
              description="This removes the opportunity from the alumni pages. This cannot be undone."
              confirmLabel={`Delete ${deleteRow.title}`}
              destructive
              pending={pending}
              onConfirm={async () => {
                setPending(true);
                await simulate(null, 550);
                setRows((rs) => rs.filter((r) => r.id !== deleteRow.id));
                setPending(false);
                setDeleteRow(null);
                toast.success("Opportunity deleted");
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Create/edit dialog — type, title, organisation, deadline, link, published. */
function OpportunityFormDialog({
  open,
  onOpenChange,
  initial,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Opportunity;
  onDone: (input: OpportunityInput) => void;
}) {
  const [type, setType] = useState<OpportunityType>(initial?.type ?? "job");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [organization, setOrganization] = useState(initial?.organization ?? "");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [applyUrl, setApplyUrl] = useState(initial?.applyUrl ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);

  const action = useDemoAction(opportunitySchema, onDone);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? `Edit ${initial.title}` : "New opportunity"}
      description="Opportunities appear on the alumni opportunities page until the deadline passes."
      submitLabel={initial ? "Save changes" : "Create opportunity"}
      pendingLabel="Saving…"
      action={action}
      buildInput={() => ({
        type,
        title,
        organization,
        description: initial?.description ?? "",
        applyUrl: applyUrl || "",
        deadline,
        isPublished,
      })}
    >
      {(errors, clearError) => (
        <>
          <FormField label="Type" required error={errors.type}>
            {(id) => (
              <Select
                value={type}
                onValueChange={(v) => setType(v as OpportunityType)}
              >
                <SelectTrigger id={id} className="w-full">
                  <span className="flex-1 text-left">{TYPE_LABELS[type]}</span>
                </SelectTrigger>
                <SelectContent>
                  {OPPORTUNITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField label="Title" required error={errors.title}>
            {(id, describedBy) => (
              <Input
                id={id}
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  clearError("title");
                }}
                aria-describedby={describedBy}
                aria-invalid={errors.title ? true : undefined}
              />
            )}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Organisation"
              required
              error={errors.organization}
            >
              {(id, describedBy) => (
                <Input
                  id={id}
                  required
                  value={organization}
                  onChange={(e) => {
                    setOrganization(e.target.value);
                    clearError("organization");
                  }}
                  aria-describedby={describedBy}
                  aria-invalid={errors.organization ? true : undefined}
                />
              )}
            </FormField>
            <FormField label="Deadline" required error={errors.deadline}>
              {(id, describedBy) => (
                <Input
                  id={id}
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => {
                    setDeadline(e.target.value);
                    clearError("deadline");
                  }}
                  aria-describedby={describedBy}
                  aria-invalid={errors.deadline ? true : undefined}
                />
              )}
            </FormField>
          </div>
          <FormField
            label="Apply link"
            error={errors.applyUrl}
            hint="Optional — a full https:// link to the application page."
          >
            {(id, describedBy) => (
              <Input
                id={id}
                type="url"
                placeholder="https://…"
                value={applyUrl}
                onChange={(e) => {
                  setApplyUrl(e.target.value);
                  clearError("applyUrl");
                }}
                aria-describedby={describedBy}
                aria-invalid={errors.applyUrl ? true : undefined}
              />
            )}
          </FormField>
          <div className="flex items-center gap-3">
            <Switch
              id="opportunity-published"
              checked={isPublished}
              onCheckedChange={(v) => setIsPublished(v === true)}
              aria-labelledby="opportunity-published-label"
            />
            <span id="opportunity-published-label" className="text-sm">
              Published — visible to alumni
            </span>
          </div>
        </>
      )}
    </FormDialog>
  );
}

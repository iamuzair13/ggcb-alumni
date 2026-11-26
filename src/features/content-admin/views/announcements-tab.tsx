"use client";

/** Announcements tab — /admin/content: pinned-first list + dialog CRUD. */
import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Pin, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  RowActions,
  type RowActionItem,
} from "@/components/shared/row-actions";
import { useDemo } from "@/components/demo/demo-provider";
import { formatDate } from "@/lib/utils/format";

import {
  announcementSchema,
  type AnnouncementInput,
} from "@/features/announcements/schemas";
import type { Announcement } from "@/features/announcements/types";
import { useDemoAction } from "./demo-action";

export function AnnouncementsTab({
  rows,
  setRows,
  readOnly,
}: {
  rows: Announcement[];
  setRows: React.Dispatch<React.SetStateAction<Announcement[]>>;
  readOnly: boolean;
}) {
  const { simulate } = useDemo();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<Announcement | null>(null);
  const [deleteRow, setDeleteRow] = useState<Announcement | null>(null);
  const [pending, setPending] = useState(false);

  // Pinned announcements stay on top — same ordering alumni see.
  const sorted = [...rows].sort(
    (a, b) => Number(b.isPinned) - Number(a.isPinned),
  );

  function togglePublished(row: Announcement, value: boolean) {
    setRows((rs) =>
      rs.map((r) => (r.id === row.id ? { ...r, isPublished: value } : r)),
    );
    void simulate(null, 450).then(() =>
      toast.success(
        value ? "Announcement published" : "Announcement unpublished",
      ),
    );
  }

  function rowItems(row: Announcement): RowActionItem[] {
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

  const columns: DataTableColumn<Announcement>[] = [
    {
      key: "title",
      header: "Title",
      cell: (a) => (
        <span className="inline-flex items-center gap-2 font-medium">
          {a.title}
          {a.isPinned ? (
            <Badge variant="secondary" className="gap-1">
              <Pin className="size-3" aria-hidden="true" />
              Pinned
            </Badge>
          ) : null}
        </span>
      ),
    },
    {
      key: "publishAt",
      header: "Publishes",
      cell: (a) => <span className="tnum">{formatDate(a.publishAt)}</span>,
    },
    {
      key: "expiresAt",
      header: "Expires",
      cell: (a) =>
        a.expiresAt ? (
          <span className="tnum">{formatDate(a.expiresAt)}</span>
        ) : (
          <span className="text-muted-foreground">Never</span>
        ),
    },
    {
      key: "published",
      header: "Status",
      cell: (a) =>
        readOnly ? (
          <Badge
            variant="outline"
            className={
              a.isPublished
                ? "border-transparent bg-success text-success-foreground"
                : "border-transparent bg-muted text-muted-foreground"
            }
          >
            {a.isPublished ? "Published" : "Draft"}
          </Badge>
        ) : (
          <Switch
            checked={a.isPublished}
            onCheckedChange={(v) => togglePublished(a, v === true)}
            aria-label={`Published — ${a.title}`}
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
            cell: (a: Announcement) => (
              <RowActions
                label={`Actions for ${a.title}`}
                items={rowItems(a)}
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
            New announcement
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={sorted}
        caption="Announcements"
        empty={
          <EmptyState
            icon={Megaphone}
            title="No announcements yet"
            description="Post the first announcement for alumni — pinned items stay on top."
            action={
              !readOnly ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  New announcement
                </Button>
              ) : undefined
            }
          />
        }
      />

      {!readOnly ? (
        <>
          <AnnouncementFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onDone={(input) =>
              setRows((rs) => [
                ...rs,
                {
                  id: `an-new-${rs.length + 1}`,
                  title: input.title,
                  body: input.body,
                  attachmentPath: null,
                  publishAt: input.publishAt,
                  expiresAt: input.expiresAt || null,
                  isPinned: input.isPinned,
                  isPublished: input.isPublished,
                },
              ])
            }
          />
          {editRow ? (
            <AnnouncementFormDialog
              open
              onOpenChange={(o) => !o && setEditRow(null)}
              initial={editRow}
              onDone={(input) =>
                setRows((rs) =>
                  rs.map((r) =>
                    r.id === editRow.id
                      ? {
                          ...r,
                          title: input.title,
                          body: input.body,
                          publishAt: input.publishAt,
                          expiresAt: input.expiresAt || null,
                          isPinned: input.isPinned,
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
              description="This removes the announcement from the alumni pages. This cannot be undone."
              confirmLabel={`Delete ${deleteRow.title}`}
              destructive
              pending={pending}
              onConfirm={async () => {
                setPending(true);
                await simulate(null, 550);
                setRows((rs) => rs.filter((r) => r.id !== deleteRow.id));
                setPending(false);
                setDeleteRow(null);
                toast.success("Announcement deleted");
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Create/edit dialog — title, body, publish/expire dates, pinned, published. */
function AnnouncementFormDialog({
  open,
  onOpenChange,
  initial,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Announcement;
  onDone: (input: AnnouncementInput) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [publishAt, setPublishAt] = useState(initial?.publishAt ?? "");
  const [expiresAt, setExpiresAt] = useState(initial?.expiresAt ?? "");
  const [isPinned, setIsPinned] = useState(initial?.isPinned ?? false);
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);

  const action = useDemoAction(announcementSchema, onDone);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? `Edit ${initial.title}` : "New announcement"}
      description="Announcements appear on the alumni announcements page while published."
      submitLabel={initial ? "Save changes" : "Create announcement"}
      pendingLabel="Saving…"
      action={action}
      buildInput={() => ({
        title,
        body,
        publishAt,
        expiresAt: expiresAt || undefined,
        isPinned,
        isPublished,
      })}
    >
      {(errors, clearError) => (
        <>
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
          <FormField label="Body" required error={errors.body}>
            {(id, describedBy) => (
              <Textarea
                id={id}
                rows={4}
                required
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  clearError("body");
                }}
                aria-describedby={describedBy}
                aria-invalid={errors.body ? true : undefined}
              />
            )}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Publish date" required error={errors.publishAt}>
              {(id, describedBy) => (
                <Input
                  id={id}
                  type="date"
                  required
                  value={publishAt}
                  onChange={(e) => {
                    setPublishAt(e.target.value);
                    clearError("publishAt");
                  }}
                  aria-describedby={describedBy}
                  aria-invalid={errors.publishAt ? true : undefined}
                />
              )}
            </FormField>
            <FormField
              label="Expiry date"
              error={errors.expiresAt}
              hint="Optional — leave empty to keep it up."
            >
              {(id, describedBy) => (
                <Input
                  id={id}
                  type="date"
                  value={expiresAt}
                  onChange={(e) => {
                    setExpiresAt(e.target.value);
                    clearError("expiresAt");
                  }}
                  aria-describedby={describedBy}
                  aria-invalid={errors.expiresAt ? true : undefined}
                />
              )}
            </FormField>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="announcement-pinned"
              checked={isPinned}
              onCheckedChange={(v) => setIsPinned(v === true)}
              aria-labelledby="announcement-pinned-label"
            />
            <span id="announcement-pinned-label" className="text-sm">
              Pinned — keep at the top of the list
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="announcement-published"
              checked={isPublished}
              onCheckedChange={(v) => setIsPublished(v === true)}
              aria-labelledby="announcement-published-label"
            />
            <span id="announcement-published-label" className="text-sm">
              Published — visible to alumni
            </span>
          </div>
        </>
      )}
    </FormDialog>
  );
}

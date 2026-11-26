"use client";

/** Events tab — /admin/content (blueprint §3.3): list + dialog CRUD. */
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { DateBlock } from "@/components/shared/date-block";
import { useDemo } from "@/components/demo/demo-provider";

import { EVENT_TYPES, type EventType } from "@/lib/constants/statuses";
import { eventSchema, type EventInput } from "@/features/events/schemas";
import type { AdminEvent } from "@/features/events/types";
import { useDemoAction } from "./demo-action";

const TYPE_LABELS: Record<EventType, string> = {
  reunion: "Reunion",
  seminar: "Seminar",
  talk: "Talk",
  other: "Other",
};

export function EventsTab({
  rows,
  setRows,
  readOnly,
}: {
  rows: AdminEvent[];
  setRows: React.Dispatch<React.SetStateAction<AdminEvent[]>>;
  readOnly: boolean;
}) {
  const { simulate } = useDemo();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<AdminEvent | null>(null);
  const [deleteRow, setDeleteRow] = useState<AdminEvent | null>(null);
  const [pending, setPending] = useState(false);

  function togglePublished(row: AdminEvent, value: boolean) {
    setRows((rs) =>
      rs.map((r) => (r.id === row.id ? { ...r, isPublished: value } : r)),
    );
    void simulate(null, 450).then(() =>
      toast.success(value ? "Event published" : "Event unpublished"),
    );
  }

  function rowItems(row: AdminEvent): RowActionItem[] {
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

  const columns: DataTableColumn<AdminEvent>[] = [
    {
      key: "date",
      header: "Date",
      cell: (e) => <DateBlock iso={e.startsAt} />,
    },
    {
      key: "title",
      header: "Title",
      cell: (e) => <span className="font-medium">{e.title}</span>,
    },
    {
      key: "type",
      header: "Type",
      cell: (e) => <Badge variant="outline">{TYPE_LABELS[e.type]}</Badge>,
    },
    { key: "venue", header: "Venue", cell: (e) => e.venue },
    {
      key: "published",
      header: "Status",
      cell: (e) =>
        readOnly ? (
          <Badge
            variant="outline"
            className={
              e.isPublished
                ? "border-transparent bg-success text-success-foreground"
                : "border-transparent bg-muted text-muted-foreground"
            }
          >
            {e.isPublished ? "Published" : "Draft"}
          </Badge>
        ) : (
          <Switch
            checked={e.isPublished}
            onCheckedChange={(v) => togglePublished(e, v === true)}
            aria-label={`Published — ${e.title}`}
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
            cell: (e: AdminEvent) => (
              <RowActions
                label={`Actions for ${e.title}`}
                items={rowItems(e)}
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
            New event
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        caption="Events"
        empty={
          <EmptyState
            icon={CalendarDays}
            title="No events yet"
            description="Create the first event so alumni can see what is coming up."
            action={
              !readOnly ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  New event
                </Button>
              ) : undefined
            }
          />
        }
      />

      {!readOnly ? (
        <>
          <EventFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onDone={(input) =>
              setRows((rs) => [
                ...rs,
                {
                  id: `ev-new-${rs.length + 1}`,
                  type: input.type,
                  title: input.title,
                  description: input.description,
                  startsAt: input.startsAt,
                  endsAt: input.endsAt || null,
                  venue: input.venue,
                  imagePath: null,
                  isPublished: input.isPublished,
                },
              ])
            }
          />
          {editRow ? (
            <EventFormDialog
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
                          description: input.description,
                          startsAt: input.startsAt,
                          endsAt: input.endsAt || null,
                          venue: input.venue,
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
              description="This removes the event from the alumni pages. This cannot be undone."
              confirmLabel={`Delete ${deleteRow.title}`}
              destructive
              pending={pending}
              onConfirm={async () => {
                setPending(true);
                await simulate(null, 550);
                setRows((rs) => rs.filter((r) => r.id !== deleteRow.id));
                setPending(false);
                setDeleteRow(null);
                toast.success("Event deleted");
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Create/edit dialog — title, type, date, venue, description, published. */
function EventFormDialog({
  open,
  onOpenChange,
  initial,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: AdminEvent;
  onDone: (input: EventInput) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<EventType>(initial?.type ?? "reunion");
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? "");
  const [venue, setVenue] = useState(initial?.venue ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);

  const action = useDemoAction(eventSchema, onDone);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? `Edit ${initial.title}` : "New event"}
      description="Events appear on the alumni events page when published."
      submitLabel={initial ? "Save changes" : "Create event"}
      pendingLabel="Saving…"
      action={action}
      buildInput={() => ({
        type,
        title,
        description,
        startsAt,
        venue,
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
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Type" required error={errors.type}>
              {(id) => (
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as EventType)}
                >
                  <SelectTrigger id={id} className="w-full">
                    <span className="flex-1 text-left">
                      {TYPE_LABELS[type]}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField label="Date" required error={errors.startsAt}>
              {(id, describedBy) => (
                <Input
                  id={id}
                  type="date"
                  required
                  value={startsAt}
                  onChange={(e) => {
                    setStartsAt(e.target.value);
                    clearError("startsAt");
                  }}
                  aria-describedby={describedBy}
                  aria-invalid={errors.startsAt ? true : undefined}
                />
              )}
            </FormField>
          </div>
          <FormField label="Venue" error={errors.venue}>
            {(id, describedBy) => (
              <Input
                id={id}
                value={venue}
                onChange={(e) => {
                  setVenue(e.target.value);
                  clearError("venue");
                }}
                aria-describedby={describedBy}
                aria-invalid={errors.venue ? true : undefined}
              />
            )}
          </FormField>
          <FormField label="Description" error={errors.description}>
            {(id, describedBy) => (
              <Textarea
                id={id}
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  clearError("description");
                }}
                aria-describedby={describedBy}
                aria-invalid={errors.description ? true : undefined}
              />
            )}
          </FormField>
          {/* Base UI choice controls render a non-labellable element —
              name the switch with aria-labelledby pointing at its text. */}
          <div className="flex items-center gap-3">
            <Switch
              id="event-published"
              checked={isPublished}
              onCheckedChange={(v) => setIsPublished(v === true)}
              aria-labelledby="event-published-label"
            />
            <span id="event-published-label" className="text-sm">
              Published — visible to alumni
            </span>
          </div>
        </>
      )}
    </FormDialog>
  );
}

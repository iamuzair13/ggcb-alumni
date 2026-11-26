"use client";

/**
 * Stories review tab — /admin/content. Pending-first list; a row opens the
 * review sheet with the full story, approve/reject (note required) and an
 * optional light edit.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Check, Newspaper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineAlert } from "@/components/shared/inline-alert";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/ui/form-field";
import { ParagraphText } from "@/components/shared/paragraph-text";
import { useDemo } from "@/components/demo/demo-provider";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

import { storySchema, type StoryInput } from "@/features/stories/schemas";
import type { Story, StoryStatus } from "@/features/stories/types";
import { useDemoAction } from "./demo-action";

const STATUS_STYLES: Record<StoryStatus, string> = {
  pending: "border-transparent bg-warning text-warning-foreground",
  approved: "border-transparent bg-success text-success-foreground",
  rejected: "border-transparent bg-destructive/10 text-destructive",
};
const STATUS_LABELS: Record<StoryStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

function StoryChip({ status }: { status: StoryStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function StoriesTab({
  rows,
  setRows,
  readOnly,
}: {
  rows: Story[];
  setRows: React.Dispatch<React.SetStateAction<Story[]>>;
  readOnly: boolean;
}) {
  const { simulate } = useDemo();
  const [selected, setSelected] = useState<Story | null>(null);
  const [editRow, setEditRow] = useState<Story | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);

  // Pending first, then newest submissions.
  const sorted = [...rows].sort(
    (a, b) =>
      Number(b.status === "pending") - Number(a.status === "pending") ||
      b.createdAt.localeCompare(a.createdAt),
  );

  const openStory = (s: Story) => {
    setSelected(s);
    setRejectNote("");
    setRejectError(null);
  };

  async function approve(story: Story) {
    setPending("approve");
    await simulate(null, 550);
    setRows((rs) =>
      rs.map((r) =>
        r.id === story.id ? { ...r, status: "approved", reviewNote: null } : r,
      ),
    );
    setPending(null);
    setSelected(null);
    toast.success(`“${story.title}” approved`);
  }

  async function reject(story: Story) {
    if (rejectNote.trim().length < 5) {
      setRejectError("Write a short note so the alumnus knows what to fix.");
      return;
    }
    setPending("reject");
    await simulate(null, 550);
    setRows((rs) =>
      rs.map((r) =>
        r.id === story.id
          ? { ...r, status: "rejected", reviewNote: rejectNote.trim() }
          : r,
      ),
    );
    setPending(null);
    setSelected(null);
    toast.success(`“${story.title}” rejected`);
  }

  const columns: DataTableColumn<Story>[] = [
    {
      key: "title",
      header: "Title",
      cell: (s) => <span className="font-medium">{s.title}</span>,
    },
    { key: "author", header: "Author", cell: (s) => s.alumniName },
    {
      key: "submitted",
      header: "Submitted",
      cell: (s) => <span className="tnum">{formatDate(s.createdAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (s) => <StoryChip status={s.status} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (s) => (
        <Button variant="outline" size="sm" onClick={() => openStory(s)}>
          {readOnly ? "View" : "Review"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={sorted}
        caption="Alumni stories pending and reviewed"
        empty={
          <EmptyState
            icon={Newspaper}
            title="No stories yet"
            description="Stories submitted by verified alumni appear here for review."
          />
        }
      />

      {/* Review sheet — full body + approve/reject */}
      <Sheet
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        {selected ? (
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{selected.title}</SheetTitle>
              <SheetDescription>
                {selected.alumniName} · submitted{" "}
                {formatDate(selected.createdAt)}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
              <StoryChip status={selected.status} />
              <ParagraphText
                text={selected.content}
                className="text-sm text-foreground"
              />
              {selected.status === "rejected" && selected.reviewNote ? (
                <InlineAlert variant="warning" title="Rejection note">
                  {selected.reviewNote}
                </InlineAlert>
              ) : null}
            </div>
            {!readOnly ? (
              <SheetFooter className="border-t">
                {selected.status === "pending" ? (
                  <div className="w-full space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        loading={pending === "approve"}
                        disabled={pending !== null}
                        onClick={() => approve(selected)}
                      >
                        <Check data-icon="inline-start" aria-hidden="true" />
                        Approve story
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Close the sheet first — two stacked focus-trapped
                          // overlays fight over focus.
                          setSelected(null);
                          setEditRow(selected);
                        }}
                      >
                        Edit story…
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reject-note">Rejection note</Label>
                      <Textarea
                        id="reject-note"
                        rows={2}
                        value={rejectNote}
                        onChange={(e) => {
                          setRejectNote(e.target.value);
                          setRejectError(null);
                        }}
                        placeholder="Tell the alumnus what to fix…"
                        aria-invalid={rejectError ? true : undefined}
                      />
                      {rejectError ? (
                        <p className="text-sm text-destructive" role="alert">
                          {rejectError}
                        </p>
                      ) : null}
                      <Button
                        variant="destructive"
                        size="sm"
                        loading={pending === "reject"}
                        disabled={pending !== null}
                        onClick={() => reject(selected)}
                      >
                        Reject story
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p
                    className={cn(
                      "text-sm",
                      selected.status === "approved"
                        ? "text-success-foreground"
                        : "text-destructive",
                    )}
                  >
                    This story is {STATUS_LABELS[selected.status].toLowerCase()}
                    .
                  </p>
                )}
              </SheetFooter>
            ) : null}
          </SheetContent>
        ) : null}
      </Sheet>

      {editRow && !readOnly ? (
        <StoryEditDialog
          story={editRow}
          onOpenChange={(o) => !o && setEditRow(null)}
          onDone={(input) =>
            setRows((rs) =>
              rs.map((r) =>
                r.id === editRow.id
                  ? { ...r, title: input.title, content: input.content }
                  : r,
              ),
            )
          }
        />
      ) : null}
    </div>
  );
}

/** Optional light edit — staff can fix a title/typo before approving. */
function StoryEditDialog({
  story,
  onOpenChange,
  onDone,
}: {
  story: Story;
  onOpenChange: (o: boolean) => void;
  onDone: (input: StoryInput) => void;
}) {
  const [title, setTitle] = useState(story.title);
  const [content, setContent] = useState(story.content);
  const action = useDemoAction(storySchema, onDone);

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={`Edit ${story.title}`}
      description="Edits are attributed to staff in the audit log."
      submitLabel="Save changes"
      pendingLabel="Saving…"
      action={action}
      buildInput={() => ({ title, content })}
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
          <FormField
            label="Story"
            required
            error={errors.content}
            hint="Plain text — blank lines become paragraphs."
          >
            {(id, describedBy) => (
              <Textarea
                id={id}
                rows={6}
                required
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  clearError("content");
                }}
                aria-describedby={describedBy}
                aria-invalid={errors.content ? true : undefined}
              />
            )}
          </FormField>
        </>
      )}
    </FormDialog>
  );
}

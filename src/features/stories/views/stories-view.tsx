"use client";

/**
 * Alumni stories — approved gallery, "My submissions" with review status,
 * and the submit dialog. Story bodies are plain text only, rendered via
 * ParagraphText (never HTML). Image upload is disabled until the real
 * storage slice exists.
 */
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, Newspaper, PenLine, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ParagraphText } from "@/components/shared/paragraph-text";
import { useDemo } from "@/components/demo/demo-provider";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { storySchema } from "../schemas";
import type { Story, StoryStatus } from "../types";

function StatusChip({ status }: { status: StoryStatus }) {
  const map = {
    pending: {
      icon: Clock,
      label: "Pending review",
      cls: "bg-warning text-warning-foreground",
    },
    approved: {
      icon: CheckCircle2,
      label: "Approved",
      cls: "bg-success text-success-foreground",
    },
    rejected: {
      icon: XCircle,
      label: "Rejected",
      cls: "bg-destructive/10 text-destructive",
    },
  } as const;
  const s = map[status];
  return (
    <Badge variant="outline" className={cn("border-transparent", s.cls)}>
      <s.icon className="size-3" aria-hidden="true" />
      {s.label}
    </Badge>
  );
}

export function StoriesView({
  stories,
  mine,
  myName,
}: {
  stories: Story[]; // approved gallery items
  mine: Story[]; // this alumnus' submissions (any status)
  myName: string;
}) {
  const { simulate } = useDemo();
  const [myStories, setMyStories] = useState<Story[]>(mine);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = storySchema.safeParse({ title, content });
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const f = String(issue.path[0] ?? "");
        if (f && !errs[f]) errs[f] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setPending(true);
    await simulate(null, 500);
    setPending(false);
    setMyStories((s) => [
      {
        id: `local-${Date.now()}`,
        alumniId: "me",
        alumniName: myName,
        title: result.data.title,
        content: result.data.content,
        imagePath: null,
        status: "pending",
        reviewNote: null,
        createdAt: new Date().toISOString().slice(0, 10),
      },
      ...s,
    ]);
    setOpen(false);
    setTitle("");
    setContent("");
    setErrors({});
    toast.success("Story submitted for review.");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Stories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Where alumni ended up — in their own words.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <PenLine data-icon="inline-start" aria-hidden="true" />
          Submit your story
        </Button>
      </div>

      {/* Gallery */}
      {stories.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No stories yet"
          description="Yours could be the first — tell the college what you've been up to."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {stories.map((s) => (
            <li key={s.id}>
              <Card className="h-full p-5">
                <p className="font-heading text-base font-semibold">
                  {s.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.alumniName}
                </p>
                <ParagraphText
                  text={s.content}
                  className="mt-2 line-clamp-4 text-sm text-muted-foreground"
                />
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* My submissions */}
      <section aria-labelledby="my-stories">
        <h2 id="my-stories" className="font-heading text-lg font-semibold">
          My submissions
        </h2>
        {myStories.length === 0 ? (
          <Card className="mt-3 p-4 text-sm text-muted-foreground">
            Nothing submitted yet — use “Submit your story” above.
          </Card>
        ) : (
          <ul className="mt-3 space-y-3">
            {myStories.map((s) => (
              <li key={s.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{s.title}</p>
                  <StatusChip status={s.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Submitted {formatDate(s.createdAt)}
                </p>
                {s.status === "rejected" && s.reviewNote ? (
                  <p className="mt-2 rounded-md bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    <span className="font-medium">Review note:</span>{" "}
                    {s.reviewNote}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Submit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit your story</DialogTitle>
            <DialogDescription>
              Plain text only — the college reviews every story before it
              appears.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Title" required error={errors.title}>
              {(id, describedBy) => (
                <Input
                  id={id}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setErrors((er) => {
                      const n = { ...er };
                      delete n.title;
                      return n;
                    });
                  }}
                  placeholder="Give your story a title…"
                  aria-describedby={describedBy}
                  aria-invalid={errors.title ? true : undefined}
                  maxLength={140}
                />
              )}
            </FormField>
            <FormField
              label="Your story"
              required
              error={errors.content}
              hint="At least 50 characters."
            >
              {(id, describedBy) => (
                <>
                  <Textarea
                    id={id}
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      setErrors((er) => {
                        const n = { ...er };
                        delete n.content;
                        return n;
                      });
                    }}
                    rows={8}
                    placeholder="What did GGCB set in motion for you…"
                    aria-describedby={describedBy}
                    aria-invalid={errors.content ? true : undefined}
                    maxLength={5000}
                  />
                  <p
                    className={cn(
                      "text-right text-xs",
                      content.length > 5000
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                    aria-live="polite"
                  >
                    {content.length.toLocaleString()} / 5,000
                  </p>
                </>
              )}
            </FormField>
            <FormField
              label="Photo (optional)"
              hint="Image upload arrives with the real storage slice."
            >
              {(id) => (
                <Input id={id} type="file" disabled aria-disabled="true" />
              )}
            </FormField>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Submit story
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

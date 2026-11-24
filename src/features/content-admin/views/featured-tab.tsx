"use client";

/**
 * Featured alumni tab — /admin/content. Ordered featured list with
 * up/down reorder + remove, and a searchable picker dialog that promotes
 * a verified alumnus (achievement note required). Candidates are derived:
 * every verified alumnus not currently featured.
 */
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Search, Star, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import { useDemo } from "@/components/demo/demo-provider";
import { cn } from "@/lib/utils";

import type { Alumnus } from "@/features/alumni-directory/types";
import { featureSchema } from "../schemas";
import type { FeaturedEntry } from "../types";
import { useDemoAction } from "./demo-action";

export function FeaturedTab({
  featured,
  setFeatured,
  alumni,
  readOnly,
}: {
  featured: FeaturedEntry[];
  setFeatured: React.Dispatch<React.SetStateAction<FeaturedEntry[]>>;
  /** Verified alumni — featured ones are filtered out to get candidates. */
  alumni: Alumnus[];
  readOnly: boolean;
}) {
  const { simulate } = useDemo();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeRow, setRemoveRow] = useState<FeaturedEntry | null>(null);
  const [pending, setPending] = useState(false);

  const featuredIds = new Set(featured.map((f) => f.alumniId));
  const candidates = alumni.filter((a) => !featuredIds.has(a.id));

  function move(index: number, dir: -1 | 1) {
    const next = [...featured];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setFeatured(next.map((f, i) => ({ ...f, order: i + 1 })));
    void simulate(null, 450).then(() => toast.success("Order saved"));
  }

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => setPickerOpen(true)}
            disabled={candidates.length === 0}
          >
            <Star data-icon="inline-start" aria-hidden="true" />
            Add featured
          </Button>
        </div>
      ) : null}

      {featured.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No featured alumni"
          description="Feature a verified alumnus so their achievement appears on the public pages."
          action={
            !readOnly && candidates.length > 0 ? (
              <Button onClick={() => setPickerOpen(true)}>
                <Star data-icon="inline-start" aria-hidden="true" />
                Add featured
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ol className="space-y-2">
          {featured.map((f, i) => (
            <li
              key={f.alumniId}
              className="flex items-start gap-3 rounded-lg border bg-card p-3"
            >
              <span className="tnum w-6 shrink-0 pt-0.5 text-center font-mono text-sm text-muted-foreground">
                {f.order}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {f.name}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {f.department}
                  </span>
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {f.achievement}
                </p>
              </div>
              {!readOnly ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={`Move ${f.name} up`}
                  >
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === featured.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`Move ${f.name} down`}
                  >
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setRemoveRow(f)}
                  >
                    Remove
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {!readOnly ? (
        <>
          <FeaturePickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            candidates={candidates}
            onDone={(alumnus, achievement) =>
              setFeatured((fs) => [
                ...fs,
                {
                  alumniId: alumnus.id,
                  name: alumnus.fullName,
                  department: alumnus.departmentName,
                  achievement,
                  order: fs.length + 1,
                },
              ])
            }
          />
          {removeRow ? (
            <ConfirmDialog
              open
              onOpenChange={(o) => !o && setRemoveRow(null)}
              title={`Remove ${removeRow.name} from featured?`}
              description="They stay verified and in the directory — only the featured highlight is removed."
              confirmLabel={`Remove ${removeRow.name}`}
              pending={pending}
              onConfirm={async () => {
                setPending(true);
                await simulate(null, 500);
                setFeatured((fs) =>
                  fs
                    .filter((f) => f.alumniId !== removeRow.alumniId)
                    .map((f, i) => ({ ...f, order: i + 1 })),
                );
                setPending(false);
                setRemoveRow(null);
                toast.success("Removed from featured");
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/**
 * Picker dialog — search verified, non-featured alumni; pick one; the
 * achievement note is required (min 10 chars, featureSchema).
 */
function FeaturePickerDialog({
  open,
  onOpenChange,
  candidates,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  candidates: Alumnus[];
  onDone: (alumnus: Alumnus, achievement: string) => void;
}) {
  const [q, setQ] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [achievement, setAchievement] = useState("");

  const picked = candidates.find((c) => c.id === pickedId) ?? null;
  const query = q.trim().toLowerCase();
  const shown = query
    ? candidates.filter(
        (c) =>
          c.fullName.toLowerCase().includes(query) ||
          c.rollNumber.toLowerCase().includes(query) ||
          c.departmentName.toLowerCase().includes(query),
      )
    : candidates;

  const action = useDemoAction(featureSchema, (data) => {
    if (picked) onDone(picked, data.achievement);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setQ("");
          setPickedId(null);
          setAchievement("");
        }
      }}
      title="Feature an alumnus"
      description="Pick a verified alumnus and write a one-line achievement."
      submitLabel="Feature alumnus"
      pendingLabel="Saving…"
      action={action}
      buildInput={() => ({ alumniId: pickedId ?? "", achievement })}
    >
      {(errors, clearError) => (
        <>
          <FormField
            label="Alumnus"
            required
            error={
              errors.alumniId ? "Pick an alumnus from the list." : undefined
            }
          >
            {(id) => (
              <div id={id} className="space-y-2">
                <div className="relative">
                  <Search
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search name, roll number or department…"
                    aria-label="Search alumni"
                    className="pl-9"
                  />
                </div>
                <ul
                  role="listbox"
                  aria-label="Verified alumni"
                  className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-1"
                >
                  {shown.length === 0 ? (
                    <li className="px-2 py-3 text-center text-sm text-muted-foreground">
                      No verified alumni match “{q.trim()}”.
                    </li>
                  ) : (
                    shown.slice(0, 12).map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={pickedId === c.id}
                          onClick={() => {
                            setPickedId(c.id);
                            clearError("alumniId");
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                            pickedId === c.id && "bg-secondary",
                          )}
                        >
                          <UserRound
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {c.fullName}
                          </span>
                          <span className="shrink-0 font-mono text-xs text-muted-foreground">
                            {c.rollNumber}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Showing {Math.min(shown.length, 12)} of {candidates.length}{" "}
                  verified alumni not yet featured.
                </p>
              </div>
            )}
          </FormField>
          <FormField
            label="Achievement"
            required
            error={errors.achievement}
            hint="One line shown on the public page — at least 10 characters."
          >
            {(id, describedBy) => (
              <Textarea
                id={id}
                rows={2}
                value={achievement}
                onChange={(e) => {
                  setAchievement(e.target.value);
                  clearError("achievement");
                }}
                aria-describedby={describedBy}
                aria-invalid={errors.achievement ? true : undefined}
              />
            )}
          </FormField>
        </>
      )}
    </FormDialog>
  );
}

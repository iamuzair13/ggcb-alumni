"use client";

/**
 * My change requests — the list an alumnus sees for restricted-field
 * corrections (blueprint §3.2). Rows open a detail sheet with the diff;
 * pending requests can be withdrawn (local state only in the demo).
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  FileEdit,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DiffTable } from "@/components/shared/diff-table";
import { EmptyState } from "@/components/shared/empty-state";
import { useDemo } from "@/components/demo/demo-provider";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { AlumniChangeRequest } from "../types";

type Status = AlumniChangeRequest["status"];

const STATUS: Record<
  Status,
  { icon: typeof Clock; label: string; cls: string }
> = {
  pending: {
    icon: Clock,
    label: "Pending",
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
};

function StatusChip({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <Badge variant="outline" className={cn("border-transparent", s.cls)}>
      <s.icon className="size-3" aria-hidden="true" />
      {s.label}
    </Badge>
  );
}

function summary(r: AlumniChangeRequest): string {
  const labels = r.changes.map((c) => c.label);
  return labels.length === 1
    ? `Change to ${labels[0].toLowerCase()}`
    : `${labels.length} field changes`;
}

export function RequestsView({
  requests,
}: {
  requests: AlumniChangeRequest[];
}) {
  const { simulate } = useDemo();
  const [rows, setRows] = useState(requests);
  const [selected, setSelected] = useState<AlumniChangeRequest | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sorted = [...rows].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          My change requests
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Corrections to college-held fields — staff review each one.
        </p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={FileEdit}
          title="No change requests"
          description="Ask for a correction from your profile's academic section."
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelected(r)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {summary(r)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Submitted {formatDate(r.createdAt)}
                    {r.reviewedAt
                      ? ` · Reviewed ${formatDate(r.reviewedAt)}`
                      : ""}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <StatusChip status={r.status} />
                  <ChevronRight
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <SheetContent side="right" className="w-full overflow-y-auto">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{summary(selected)}</SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  <StatusChip status={selected.status} />
                  Submitted {formatDate(selected.createdAt)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
                <DiffTable changes={selected.changes} />
                {selected.status === "rejected" && selected.reviewNote ? (
                  <p className="rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <span className="font-medium">Review note:</span>{" "}
                    {selected.reviewNote}
                  </p>
                ) : null}
                {selected.reviewedBy ? (
                  <p className="text-xs text-muted-foreground">
                    Reviewed by {selected.reviewedBy}
                    {selected.reviewedAt
                      ? ` on ${formatDate(selected.reviewedAt)}`
                      : ""}
                    .
                  </p>
                ) : null}
              </div>
              {selected.status === "pending" ? (
                <SheetFooter>
                  <Button
                    variant="destructive"
                    onClick={() => setConfirmOpen(true)}
                  >
                    Withdraw request
                  </Button>
                </SheetFooter>
              ) : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Withdraw this change request?"
        description="The request is removed before staff review it. You can submit a new one from your profile at any time."
        confirmLabel="Withdraw request"
        destructive
        pending={withdrawing}
        onConfirm={async () => {
          setWithdrawing(true);
          await simulate(null, 500);
          setWithdrawing(false);
          if (selected) {
            setRows((rs) => rs.filter((r) => r.id !== selected.id));
          }
          setConfirmOpen(false);
          setSelected(null);
          toast.success("Request withdrawn.");
        }}
      />
    </div>
  );
}

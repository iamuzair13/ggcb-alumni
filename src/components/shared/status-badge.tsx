import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VerifyStatus } from "@/lib/constants/statuses";

const statusStyles: Record<VerifyStatus, string> = {
  verified: "bg-success text-success-foreground",
  under_approval: "bg-warning text-warning-foreground",
  rejected: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<VerifyStatus, string> = {
  verified: "Verified",
  under_approval: "Under approval",
  rejected: "Rejected",
};

/** Status chip for alumni verification states. */
export function StatusBadge({
  status,
  className,
}: {
  status: VerifyStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", statusStyles[status], className)}
    >
      {statusLabels[status]}
    </Badge>
  );
}

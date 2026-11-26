import { BadgeCheck, MailPlus, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserStatus } from "@/lib/result";

const STYLES: Record<
  UserStatus,
  { icon: typeof BadgeCheck; label: string; classes: string }
> = {
  active: {
    icon: BadgeCheck,
    label: "Active",
    classes: "bg-success text-success-foreground",
  },
  invited: {
    icon: MailPlus,
    label: "Invited",
    classes: "bg-info text-info-foreground",
  },
  inactive: {
    icon: UserX,
    label: "Inactive",
    classes: "bg-muted text-muted-foreground",
  },
};

/** Staff-user status chip — icon + text + colour (never colour alone). */
export function UserStatusBadge({
  status,
  className,
}: {
  status: UserStatus;
  className?: string;
}) {
  const { icon: Icon, label, classes } = STYLES[status];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 border-transparent", classes, className)}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </Badge>
  );
}

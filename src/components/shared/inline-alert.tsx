import { CheckCircle2, Info, ShieldAlert, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const VARIANTS = {
  info: { icon: Info, classes: "border-info/40 bg-info/10 text-foreground" },
  success: {
    icon: CheckCircle2,
    classes: "border-success/40 bg-success/10 text-foreground",
  },
  warning: {
    icon: TriangleAlert,
    classes: "border-warning/40 bg-warning/10 text-foreground",
  },
  destructive: {
    icon: ShieldAlert,
    classes: "border-destructive/40 bg-destructive/10 text-foreground",
  },
} as const;

export type InlineAlertVariant = keyof typeof VARIANTS;

/**
 * Inline alert for errors and notices that need action (design system).
 * Toasts are for non-blocking confirmation only.
 */
export function InlineAlert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: InlineAlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, classes } = VARIANTS[variant];
  return (
    <Alert
      role={variant === "destructive" ? "alert" : "status"}
      className={cn(classes, className)}
    >
      <Icon className="size-4" aria-hidden="true" />
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

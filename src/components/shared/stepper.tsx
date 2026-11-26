"use client";

/** Stepper — wizard header for the import flow; hand-built. */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number; // 0-based
  className?: string;
}) {
  return (
    <ol
      className={cn("flex flex-wrap items-center gap-1", className)}
      aria-label="Progress"
    >
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={label} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="mx-1 h-px w-4 bg-border" aria-hidden="true" />
            )}
            <span
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium",
                state === "current" && "bg-primary text-primary-foreground",
                state === "done" && "text-success-foreground",
                state === "todo" && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full text-[9px] font-bold",
                  state === "done" && "bg-success text-success-foreground",
                  state === "current" && "bg-primary-foreground/20",
                  state === "todo" && "bg-muted",
                )}
              >
                {state === "done" ? (
                  <Check className="size-2.5" aria-hidden="true" />
                ) : (
                  i + 1
                )}
              </span>
              <span className={cn(state === "todo" && "hidden sm:inline")}>
                {label}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

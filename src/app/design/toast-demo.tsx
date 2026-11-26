"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => toast.success("Changes saved")}>
        Success toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.error("Could not save changes", {
            description: "Check your connection and try again.",
          })
        }
      >
        Error toast
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.info("Import queued for review")}
      >
        Info toast
      </Button>
    </div>
  );
}

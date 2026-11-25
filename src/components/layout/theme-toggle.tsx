"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

function useDark() {
  return useSyncExternalStore(
    (onChange) => {
      const obs = new MutationObserver(onChange);
      obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => obs.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}

/** Floating light/dark toggle — writes the class + localStorage that the
    pre-paint bootstrap script reads. Fixed bottom-right, above content. */
export function ThemeFab() {
  const dark = useDark();
  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      onClick={() => {
        const next = !dark;
        document.documentElement.classList.toggle("dark", next);
        try {
          localStorage.setItem("ggcb-theme", next ? "dark" : "light");
        } catch {
          /* private mode — theme just won't persist */
        }
      }}
      className={cn(
        "fixed right-5 bottom-5 z-50 flex size-11 items-center justify-center",
        "rounded-full border bg-card text-foreground shadow-md",
        "transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
    >
      {dark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}

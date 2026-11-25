"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

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

/** Light/dark toggle — writes the class + localStorage the inline
    bootstrap script reads pre-paint. */
export function ThemeToggle() {
  const dark = useDark();
  return (
    <Button
      variant="ghost"
      size="icon"
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
    >
      {dark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </Button>
  );
}

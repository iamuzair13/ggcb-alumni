"use client";

/**
 * Removes the raw token from the visible URL after mount (spec §4.1) —
 * history, referrers, and screenshots never retain it. The token itself
 * travels to the action as a hidden field.
 */
import { useEffect } from "react";

export function TokenStrip({ param = "token" }: { param?: string }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      window.history.replaceState(null, "", url.toString());
    }
  }, [param]);
  return null;
}

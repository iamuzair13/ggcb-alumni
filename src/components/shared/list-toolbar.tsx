"use client";

/**
 * ListToolbar — search + select filters + active-filter chips + clear all,
 * bound to URL search params (blueprint §2). State never lives in React
 * alone: every control writes the URL, the server renders the result.
 */
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export interface ToolbarFilter {
  /** search-param key, e.g. "role". */
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

const ANY = "__any__";

export function ListToolbar({
  searchPlaceholder,
  filters = [],
}: {
  searchPlaceholder?: string;
  filters?: ToolbarFilter[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  // Keep the box in sync when the URL changes elsewhere (back button) —
  // "adjust state during render" pattern (no effect → no extra render).
  const urlQ = params.get("q") ?? "";
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setQ(urlQ);
  }

  function push(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page"); // any filter change returns to page 1
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const activeFilters = [
    ...(q.trim() ? [{ key: "q", label: `“${q.trim()}”` }] : []),
    ...(filters
      .map((f) => {
        const v = params.get(f.key);
        const opt = f.options.find((o) => o.value === v);
        return v && opt
          ? { key: f.key, label: `${f.label}: ${opt.label}` }
          : null;
      })
      .filter(Boolean) as { key: string; label: string }[]),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {searchPlaceholder ? (
          <form
            role="search"
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              push({ q: q.trim() || undefined });
            }}
          >
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Search"
              className="pl-9"
            />
          </form>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => {
            const value = params.get(f.key) ?? ANY;
            // The trigger must show a LABEL even for the "any" sentinel —
            // Select.Value resolves item text only while the popup exists,
            // so the label is computed here instead.
            const currentLabel =
              value === ANY
                ? `All ${f.label.toLowerCase()}`
                : (f.options.find((o) => o.value === value)?.label ?? f.label);
            return (
              <Select
                key={f.key}
                value={value}
                onValueChange={(v) =>
                  push({ [f.key]: v === ANY ? undefined : String(v) })
                }
              >
                <SelectTrigger
                  className="min-w-36"
                  aria-label={`Filter by ${f.label.toLowerCase()}`}
                >
                  <span className="flex-1 text-left">{currentLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value={ANY}
                  >{`All ${f.label.toLowerCase()}`}</SelectItem>
                  {f.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })}
        </div>
      </div>
      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <Badge key={f.key} variant="secondary" className="gap-1.5 pr-1">
              {f.label}
              <button
                type="button"
                aria-label={`Clear ${f.label} filter`}
                onClick={() => push({ [f.key]: undefined })}
                className="rounded-full p-0.5 outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setQ("");
              const next = new URLSearchParams(params.toString());
              next.delete("q");
              for (const f of filters) next.delete(f.key);
              next.delete("page");
              const qs = next.toString();
              router.replace(qs ? `${pathname}?${qs}` : pathname);
            }}
          >
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );
}

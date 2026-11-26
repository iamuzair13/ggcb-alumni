"use client";

/**
 * RowActions — the labelled "More actions" menu for list rows
 * (blueprint §2). Items can be disabled with a reason (shown as a
 * non-interactive line — tooltips inside menus are unreliable).
 */
import { MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface RowActionItem {
  key: string;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  /** Shown as a muted line when disabled (e.g. "You cannot act on yourself"). */
  disabledReason?: string;
  onSelect: () => void;
}

export function RowActions({
  label,
  items,
}: {
  label: string;
  items: RowActionItem[];
}) {
  const enabled = items.filter((i) => !i.disabled);
  const disabled = items.filter((i) => i.disabled);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} />}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {enabled.map((item) => (
            <DropdownMenuItem
              key={item.key}
              onClick={item.onSelect}
              className={item.destructive ? "text-destructive" : undefined}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
          {disabled.map((item) => (
            <DropdownMenuItem key={item.key} disabled>
              {item.label}
              {item.disabledReason ? (
                <span className="ml-auto pl-3 text-xs text-muted-foreground">
                  {item.disabledReason}
                </span>
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

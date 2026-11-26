"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ALUMNI_NAV_ITEMS, type NavItem } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

/**
 * Alumni navigation. Only /dashboard exists this phase — upcoming sections
 * render as disabled entries with a "Soon" badge (no broken links).
 */
const EXISTING = new Set(["/dashboard"]);

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const exists = EXISTING.has(item.href);
  const active = exists && pathname.startsWith(item.href);
  const Icon = item.icon;

  if (!exists) {
    return (
      <span
        aria-disabled="true"
        className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/70"
      >
        <Icon className="size-4" aria-hidden="true" />
        {item.title}
        <Badge variant="outline" className="ml-auto text-[0.625rem]">
          Soon
        </Badge>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {item.title}
    </Link>
  );
}

export function AlumniDesktopNav() {
  return (
    <nav
      aria-label="Alumni sections"
      className="hidden items-center gap-1 md:flex"
    >
      {ALUMNI_NAV_ITEMS.map((item) => (
        <NavLink key={item.href} item={item} />
      ))}
    </nav>
  );
}

export function AlumniMobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Open navigation menu">
            <Menu aria-hidden="true" />
          </Button>
        }
        className="md:hidden"
      />
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>Alumni Portal</SheetTitle>
          <SheetDescription className="sr-only">
            Alumni section navigation
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Alumni sections" className="flex flex-col gap-1 px-2">
          {ALUMNI_NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ADMIN_NAV_ITEMS } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

function AdminNavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-1">
      {ADMIN_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-sidebar-primary/10 text-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}

/** Fixed desktop sidebar (≥ md). */
export function AdminSidebar() {
  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 overflow-y-auto border-r bg-sidebar px-3 py-4 md:block">
      <AdminNavList />
    </aside>
  );
}

/** Collapsible sidebar for mobile — lives inside the admin topbar. */
export function AdminMobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Open admin menu">
            <Menu aria-hidden="true" />
          </Button>
        }
        className="md:hidden"
      />
      <SheetContent side="left" className="w-72 bg-sidebar">
        <SheetHeader>
          <SheetTitle>Admin</SheetTitle>
          <SheetDescription className="sr-only">
            Admin section navigation
          </SheetDescription>
        </SheetHeader>
        <AdminNavList />
      </SheetContent>
    </Sheet>
  );
}

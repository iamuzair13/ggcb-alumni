"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ADMIN_NAV_ITEMS, type NavItem } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

/** Server passes serializable hrefs; icons/items resolve client-side. */
function resolveItems(hrefs?: string[]): NavItem[] {
  if (!hrefs) return ADMIN_NAV_ITEMS;
  return ADMIN_NAV_ITEMS.filter((i) => hrefs.includes(i.href));
}

const RAIL_KEY = "ggcb-admin-nav-rail";
/** Same-tab localStorage doesn't fire "storage" — a tiny pub/sub does. */
const railListeners = new Set<() => void>();

function useRailPref() {
  return useSyncExternalStore(
    (onChange) => {
      railListeners.add(onChange);
      window.addEventListener("storage", onChange);
      return () => {
        railListeners.delete(onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    () => {
      try {
        return localStorage.getItem(RAIL_KEY) === "1";
      } catch {
        return false;
      }
    },
    () => false, // server: expanded — hydration matches first paint
  );
}

function writeRailPref(v: boolean) {
  try {
    localStorage.setItem(RAIL_KEY, v ? "1" : "0");
  } catch {
    /* private mode — rail just won't persist */
  }
  railListeners.forEach((l) => l());
}

function NavLink({
  item,
  rail,
  onNavigate,
}: {
  item: NavItem;
  rail?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const Icon = item.icon;
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={rail ? item.title : undefined}
      aria-label={rail ? item.title : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        rail && "justify-center px-0",
        active
          ? "bg-sidebar-primary/10 text-sidebar-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {rail ? null : item.title}
    </Link>
  );
}

function AdminNavList({
  items,
  rail,
  onNavigate,
}: {
  items: NavItem[];
  /** Icon-only rail — labels become tooltips. */
  rail?: boolean;
  onNavigate?: () => void;
}) {
  const loose = items.filter((i) => !i.group);
  const groups = [...new Set(items.map((i) => i.group).filter(Boolean))];

  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-1">
      {loose.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          rail={rail}
          onNavigate={onNavigate}
        />
      ))}
      {groups.map((g) => (
        <div key={g} className={cn(rail ? "mt-2 border-t pt-2" : "mt-3")}>
          {!rail && (
            <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">
              {g}
            </p>
          )}
          {items
            .filter((i) => i.group === g)
            .map((item) => (
              <NavLink
                key={item.href}
                item={item}
                rail={rail}
                onNavigate={onNavigate}
              />
            ))}
        </div>
      ))}
    </nav>
  );
}

/** Fixed desktop sidebar (≥ md) — collapses to an icon rail. */
export function AdminSidebar({ hrefs }: { hrefs?: string[] }) {
  const rail = useRailPref();
  const toggle = () => writeRailPref(!rail);

  return (
    <aside
      className={cn(
        "sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 overflow-y-auto border-r bg-sidebar px-3 py-4 md:flex md:flex-col",
        rail ? "w-14" : "w-60",
      )}
    >
      <AdminNavList items={resolveItems(hrefs)} rail={rail} />
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={rail}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            rail && "justify-center px-0",
          )}
        >
          {rail ? (
            <PanelLeftOpen className="size-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="size-4" aria-hidden="true" />
          )}
          {rail ? null : "Collapse"}
        </button>
      </div>
    </aside>
  );
}

/** Collapsible sidebar for mobile — lives inside the admin topbar. */
export function AdminMobileNav({ hrefs }: { hrefs?: string[] }) {
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
        <AdminNavList items={resolveItems(hrefs)} />
      </SheetContent>
    </Sheet>
  );
}

import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  FileText,
  IdCard,
  LayoutDashboard,
  Newspaper,
  ScrollText,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Sidebar grouping — ungrouped items render flat at the top. */
  group?: "Manage" | "System";
}

/** Alumni-area IA. Only Dashboard exists this phase; the rest ship later. */
export const ALUMNI_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Profile", href: "/profile", icon: UserRound },
  { title: "E-Card", href: "/e-card", icon: IdCard },
  { title: "Stories", href: "/stories", icon: Newspaper },
];

/** Admin-area IA — the register merged into Dashboard; remaining
    placeholder sections still have their own items (context.md §4). */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  {
    title: "Departments",
    href: "/admin/departments",
    icon: Building2,
    group: "Manage",
  },
  {
    title: "Content",
    href: "/admin/content",
    icon: FileText,
    group: "Manage",
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    group: "Manage",
  },
  {
    title: "Import/Export",
    href: "/admin/import-export",
    icon: ArrowLeftRight,
    group: "System",
  },
  { title: "Users", href: "/admin/users", icon: UsersRound, group: "System" },
  {
    title: "Audit Logs",
    href: "/admin/audit-logs",
    icon: ScrollText,
    group: "System",
  },
];

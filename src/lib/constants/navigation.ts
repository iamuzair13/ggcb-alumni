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
  Users,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

/** Alumni-area IA. Only Dashboard exists this phase; the rest ship later. */
export const ALUMNI_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Profile", href: "/profile", icon: UserRound },
  { title: "E-Card", href: "/e-card", icon: IdCard },
  { title: "Stories", href: "/stories", icon: Newspaper },
];

/** Admin-area IA — all eight placeholder sections (context.md §4). */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Alumni", href: "/admin/alumni", icon: Users },
  { title: "Departments", href: "/admin/departments", icon: Building2 },
  { title: "Content", href: "/admin/content", icon: FileText },
  {
    title: "Import/Export",
    href: "/admin/import-export",
    icon: ArrowLeftRight,
  },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { title: "Users", href: "/admin/users", icon: UsersRound },
  { title: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
];

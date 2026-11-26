"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ADMIN_NAV_ITEMS } from "@/lib/constants/navigation";

const titles = new Map(ADMIN_NAV_ITEMS.map((i) => [i.href, i.title]));

/** Breadcrumb derived from the current admin path (e.g. Admin / Alumni). */
export function AdminBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; title: string }[] = [];

  let acc = "";
  for (const segment of segments) {
    acc += `/${segment}`;
    const title =
      titles.get(acc) ??
      segment.charAt(0).toUpperCase() + segment.slice(1).replaceAll("-", " ");
    crumbs.push({ href: acc, title });
  }

  if (crumbs.length <= 1) {
    return <p className="text-sm text-muted-foreground">Dashboard</p>;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {index === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={crumb.href} />}>
                  {crumb.title}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

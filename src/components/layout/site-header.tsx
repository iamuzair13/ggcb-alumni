import Link from "next/link";
import { Logo } from "@/components/shared/logo";

/** Public site chrome — name placeholder per context.md §13-D1. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <div className="flex flex-col items-end text-right">
          <span className="text-sm leading-tight font-semibold">
            Government Postgraduate College Burewala
          </span>
          <span className="text-xs text-muted-foreground">Alumni Portal</span>
        </div>
      </div>
    </header>
  );
}

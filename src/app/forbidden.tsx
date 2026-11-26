import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Explicit 403 — wrong-role access to a protected area. Rendered by
 * `forbidden()` thrown from the route guards (server-side, status 403).
 * Deliberately NOT a 404 — spec requires an explicit Forbidden surface.
 */
export default function Forbidden() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-heading text-6xl font-bold tracking-tight text-muted-foreground/40">
        403
      </p>
      <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight">
        You don&apos;t have access to this page
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Your account doesn&apos;t have permission to view this section. If you
        believe this is a mistake, contact the college administration.
      </p>
      <Button className="mt-6" render={<Link href="/" />}>
        Back to home
      </Button>
    </main>
  );
}

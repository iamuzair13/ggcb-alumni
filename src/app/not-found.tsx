import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="font-mono text-sm font-medium text-muted-foreground">404</p>
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">
        Page not found
      </h1>
      <p className="max-w-prose text-sm text-pretty text-muted-foreground">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Button render={<Link href="/" />}>Back to home</Button>
    </main>
  );
}

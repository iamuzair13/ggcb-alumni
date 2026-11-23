"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    // Phase: surface to console now; wire to error monitoring later (context.md §11).
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">
        Something went wrong
      </h1>
      <p className="max-w-prose text-sm text-pretty text-muted-foreground">
        An unexpected error occurred. Try again — if the problem persists,
        contact the college administration.
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}

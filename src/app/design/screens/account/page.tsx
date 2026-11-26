import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AccountPreviewBody } from "./preview-body";

export const metadata: Metadata = {
  title: "Preview — account screens",
  robots: { index: false, follow: false },
};

/** Dev-only preview of every account screen state (blueprint §2). */
export default function AccountScreensPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <AccountPreviewBody />
    </Suspense>
  );
}

import { redirect } from "next/navigation";

import { getSession } from "@/server/auth/session";

/**
 * Guest-only gate: a signed-in user never sees /login, /register or
 * /forgot-password — they are bounced to their role's home.
 * Server component; must render inside a Suspense boundary (reads session).
 */
export async function GuestRedirect({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session?.user) {
    redirect(session.user.role === "alumni" ? "/dashboard" : "/admin");
  }
  return <>{children}</>;
}

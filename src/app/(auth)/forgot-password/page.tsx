import type { Metadata } from "next";

import { ForgotPasswordView } from "@/components/auth/forgot-password-view";
import { requestPasswordResetAction } from "@/lib/actions/account";

export const metadata: Metadata = { title: "Reset password" };

/** Neutral request flow — the view always shows the same confirmation. */
export default function ForgotPasswordPage() {
  return <ForgotPasswordView action={requestPasswordResetAction} />;
}

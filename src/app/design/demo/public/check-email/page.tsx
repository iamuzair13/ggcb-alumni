import { notFound } from "next/navigation";
import { PublicDemoShell } from "@/components/demo/public-demo-shell";
import { CheckEmailView } from "@/features/register/views/check-email-view";

export default function DemoPublicCheckEmail() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PublicDemoShell
      title="Check your email"
      description="One more step before your account is active."
    >
      <CheckEmailView email="you@example.invalid" />
    </PublicDemoShell>
  );
}

import { notFound } from "next/navigation";
import { PublicDemoShell } from "@/components/demo/public-demo-shell";
import { RegisterView } from "@/features/register/views/register-view";
import { world } from "@/features/_shared/fixtures/world";

export default function DemoPublicRegister() {
  if (process.env.NODE_ENV === "production") notFound();

  const departments = world.departments
    .filter((d) => d.isActive)
    .map((d) => ({ id: d.id, name: d.name }));

  return (
    <PublicDemoShell
      title="Register as alumni"
      description="For graduates of GGCB BS programs. Registration is reviewed by the college before activation."
    >
      <RegisterView departments={departments} />
    </PublicDemoShell>
  );
}

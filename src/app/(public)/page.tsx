import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IdCard, Newspaper, Users } from "lucide-react";

export const metadata = {
  title: "Home",
};

const pillars = [
  {
    icon: Users,
    title: "Alumni network",
    body: "Register, keep your profile current, and stay connected with fellow GGCB graduates.",
  },
  {
    icon: IdCard,
    title: "Digital E-card",
    body: "Verified alumni receive an electronic alumni card with public verification.",
  },
  {
    icon: Newspaper,
    title: "College updates",
    body: "Events, announcements, and opportunities for the alumni community — all in one place.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      {/* Hero — quiet, institutional. One accent action. */}
      <section className="py-16 sm:py-24">
        <div className="max-w-2xl space-y-6">
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            The alumni portal of Government Postgraduate College Burewala
          </h1>
          <p className="max-w-prose text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            A single place for GGCB graduates to register, maintain their
            profile, and receive their alumni E-card. The portal is under
            development — registration opens soon.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" render={<Link href="/register" />}>
              Register as alumni
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/login" />}>
              Sign in
            </Button>
          </div>
        </div>
      </section>

      {/* Coming-soon pillars */}
      <section aria-labelledby="what-to-expect" className="pb-16 sm:pb-24">
        <h2 id="what-to-expect" className="sr-only">
          What to expect
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

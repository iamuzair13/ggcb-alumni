"use client";

/**
 * Alumni dashboard — the expressive register. Three variants by
 * verify_status (blueprint §3.2): under-approval → what happens next;
 * verified → the full ledger; rejected → reason + next step.
 */
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  IdCard,
  Newspaper,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateBlock } from "@/components/shared/date-block";
import { CompletenessMeter } from "@/components/shared/completeness-meter";
import { EcardArtifact } from "@/components/shared/ecard-artifact";
import { ParagraphText } from "@/components/shared/paragraph-text";
import { DeadlineBadge } from "@/components/shared/deadline-badge";
import { useDemo } from "@/components/demo/demo-provider";
import type { AlumniDashboardData } from "../types";

function SectionTitle({
  icon: Icon,
  children,
  href,
}: {
  icon: typeof CalendarDays;
  children: React.ReactNode;
  href: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        {children}
      </h2>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        See all <ArrowRight className="size-3" aria-hidden="true" />
      </Link>
    </div>
  );
}

function UnderApproval({ data }: { data: AlumniDashboardData }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="border-warning-foreground/30 bg-warning/40 p-6">
        <div className="flex items-start gap-3">
          <Clock
            className="mt-0.5 size-6 shrink-0 text-warning-foreground"
            aria-hidden="true"
          />
          <div>
            <h1 className="font-heading text-xl font-semibold">
              The college is checking your record
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {data.me.fullName} — roll number{" "}
              <span className="font-mono">{data.me.rollNumber}</span> ·{" "}
              {data.me.departmentName} · {data.me.passingYear}
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              Staff compare your registration against the college register —
              usually a few working days. You will get an email when it is
              decided.
            </p>
          </div>
        </div>
      </Card>
      <Card className="mt-4 p-6">
        <h2 className="text-sm font-semibold">Meanwhile you can</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            Check the details you submitted are right — ask for a correction if
            not.
          </li>
          <li>Keep your email accessible — the decision arrives there.</li>
          <li>Update your account settings.</li>
        </ul>
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/design/demo/alumni/account" />}
          >
            Account settings
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Rejected({ data }: { data: AlumniDashboardData }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 size-6 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div>
            <h1 className="font-heading text-xl font-semibold">
              Your registration was not approved
            </h1>
            <p className="mt-2 text-sm leading-relaxed">
              <span className="font-medium">Reason:</span>{" "}
              {data.me.rejectReason ?? "No reason was recorded."}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              If you believe this is a mistake, contact the college alumni
              office with your roll number and a copy of your result card.{" "}
              <span className="text-foreground/70">
                [Placeholder: alumni office contact — the college will supply
                it.]
              </span>
            </p>
          </div>
        </div>
      </Card>
      <div className="mt-4 flex gap-3">
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/design/demo/alumni/account" />}
        >
          Account settings
        </Button>
      </div>
    </div>
  );
}

function Verified({ data }: { data: AlumniDashboardData }) {
  return (
    <div className="space-y-8">
      {/* Status header — the roll number is the design element */}
      <div className="relative overflow-hidden rounded-xl border bg-card p-6">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-5 -right-4 font-mono text-[7rem] leading-none font-bold text-primary/5 select-none"
        >
          {data.me.rollNumber.slice(-4)}
        </span>
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold">
              {data.me.fullName}
            </h1>
            <Badge className="bg-success text-success-foreground">
              <CheckCircle2 className="mr-1 size-3" aria-hidden="true" />
              Verified
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.me.departmentName} · Session {data.me.sessionStartYear}–
            {data.me.sessionEndYear} · Class of {data.me.passingYear}
          </p>
          <CompletenessMeter
            percent={data.completeness.percent}
            missing={data.completeness.missing}
            className="mt-5 max-w-md"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* E-card tile */}
        <section aria-labelledby="ecard-t" className="min-w-0">
          <SectionTitle icon={IdCard} href="/design/demo/alumni/e-card">
            Your E-card
          </SectionTitle>
          {data.ecard ? (
            <EcardArtifact
              name={data.me.fullName}
              department={data.me.departmentName}
              session={`${data.me.sessionStartYear}–${data.me.sessionEndYear}`}
              cardNo={data.ecard.cardNo}
              rollNumber={data.me.rollNumber}
              status={data.ecard.status}
            />
          ) : (
            <Card className="p-6 text-sm text-muted-foreground">
              Your E-card is being prepared — it appears here when issued.
            </Card>
          )}
        </section>

        {/* Upcoming events */}
        <section aria-labelledby="events-t" className="min-w-0">
          <SectionTitle icon={CalendarDays} href="/design/demo/alumni/events">
            Coming up
          </SectionTitle>
          <ul className="space-y-3">
            {data.upcomingEvents.slice(0, 3).map((e) => (
              <li key={e.id} className="flex gap-3">
                <DateBlock iso={e.startsAt} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.venue}</p>
                </div>
              </li>
            ))}
            {data.upcomingEvents.length === 0 && (
              <Card className="p-4 text-sm text-muted-foreground">
                Nothing scheduled yet — the college posts events here first.
              </Card>
            )}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Announcements */}
        <section aria-labelledby="ann-t" className="min-w-0">
          <SectionTitle
            icon={Newspaper}
            href="/design/demo/alumni/announcements"
          >
            From the college
          </SectionTitle>
          <ul className="space-y-3">
            {data.latestAnnouncements.slice(0, 3).map((a) => (
              <li key={a.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2">
                  {a.isPinned && (
                    <Badge variant="secondary" className="text-[10px]">
                      Pinned
                    </Badge>
                  )}
                  <p className="text-sm font-medium">{a.title}</p>
                </div>
                <ParagraphText
                  text={a.body}
                  className="mt-1.5 line-clamp-2 text-xs text-muted-foreground"
                />
              </li>
            ))}
          </ul>
        </section>

        {/* Opportunities + featured story */}
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="opp-t">
            <SectionTitle
              icon={UserRound}
              href="/design/demo/alumni/opportunities"
            >
              Opportunities
            </SectionTitle>
            <ul className="space-y-2">
              {data.openOpportunities.slice(0, 3).map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.organization}
                    </p>
                  </div>
                  <DeadlineBadge deadline={o.deadline} />
                </li>
              ))}
            </ul>
          </section>
          {data.featuredStory && (
            <section aria-labelledby="story-t">
              <SectionTitle icon={Newspaper} href="/design/demo/alumni/stories">
                Featured story
              </SectionTitle>
              <Card className="p-5">
                <p className="font-heading text-base font-semibold">
                  {data.featuredStory.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data.featuredStory.alumniName}
                </p>
                <ParagraphText
                  text={data.featuredStory.content}
                  className="mt-2 line-clamp-3 text-sm text-muted-foreground"
                />
              </Card>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function AlumniDashboardView({
  data,
}: {
  data: AlumniDashboardData & {
    mePending?: AlumniDashboardData["me"];
    meRejected?: AlumniDashboardData["me"];
  };
}) {
  const { persona } = useDemo();
  if (persona.verifyStatus === "under_approval") {
    return <UnderApproval data={{ ...data, me: data.mePending ?? data.me }} />;
  }
  if (persona.verifyStatus === "rejected") {
    return <Rejected data={{ ...data, me: data.meRejected ?? data.me }} />;
  }
  return <Verified data={data} />;
}

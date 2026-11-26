import Link from "next/link";
import { CalendarDays, IdCard, Newspaper, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LedgerPattern, LedgerRule } from "@/components/shared/ledger-rule";
import { EcardArtifact } from "@/components/shared/ecard-artifact";
import { COLLEGE } from "@/lib/college";

export const metadata = {
  title: "Home",
};

/**
 * What-you-can-do rows — the ledger list, not an icon grid. Each row is a
 * "record line": a ruled row, a ledger icon, a plain-language promise.
 */
const REGISTER_LINES = [
  {
    icon: UserRound,
    title: "Keep your record current",
    body: "Update where you live and work, and ask for corrections to your academic details whenever you need them.",
  },
  {
    icon: IdCard,
    title: "Carry your alumni E-card",
    body: "Verified alumni receive an electronic card — proof of your time at the college, verifiable by anyone you share it with.",
  },
  {
    icon: CalendarDays,
    title: "Know what is happening",
    body: "Reunions, seminars and alumni talks — published by the college, all in one place.",
  },
  {
    icon: Newspaper,
    title: "Read and share stories",
    body: "Announcements, opportunities and success stories from the alumni community.",
  },
];

const STEPS = [
  {
    title: "Register",
    body: "Tell us your name, roll number and department, then confirm your email.",
  },
  {
    title: "The college verifies",
    body: "Staff check your details against college records. This usually takes a few working days.",
  },
  {
    title: "You are in",
    body: "Your E-card is issued and the full alumni area opens — profile, stories, events and more.",
  },
];

const FAQS = [
  {
    q: "Who can register?",
    a: "Anyone who completed a BS programme at Government Postgraduate College Burewala. You register with your roll number, and the college verifies the record before access opens.",
  },
  {
    q: "What is the alumni E-card?",
    a: "An electronic card issued to verified alumni. It carries your name, department and a card number, and anyone you show it to can check it is genuine on the public verification page — it replaces the old physical card.",
  },
  {
    q: "I finished my degree but cannot find my roll number. What do I do?",
    a: "Contact the college office — they can confirm your roll number from the register. [Placeholder: office contact details to be supplied by the college.]",
  },
  {
    q: "Does it cost anything?",
    a: "No. The alumni portal and the E-card are provided by the college at no charge.",
  },
  {
    q: "What happens to my information?",
    a: "Only what is needed to maintain your alumni record is kept, and you control what is visible to other alumni. See the privacy notice for the detail.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* ── Hero — the ledger, orchestrated once ─────────────────────── */}
      <section className="relative overflow-hidden">
        <LedgerPattern className="opacity-30" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
            <div className="max-w-2xl">
              <p
                className="animate-reveal text-sm font-medium text-primary"
                style={{ animationDelay: "0ms" }}
              >
                The alumni portal of {COLLEGE.name}
              </p>
              <h1
                className="animate-reveal mt-3 font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
                style={{ animationDelay: "90ms" }}
              >
                The alumni record, kept properly.
              </h1>
              <p
                className="animate-reveal mt-4 max-w-prose text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
                style={{ animationDelay: "180ms" }}
              >
                Register once, keep your record current, and carry your alumni
                E-card — the college verifies every entry, the way a register
                should be kept.
              </p>
              <div
                className="animate-reveal mt-7 flex flex-wrap items-center gap-3"
                style={{ animationDelay: "270ms" }}
              >
                <Button size="lg" render={<Link href="/register" />}>
                  Register as an alumnus
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  render={<Link href="/login" />}
                >
                  Sign in
                </Button>
                {/* Signed-in visitors are sent through the role-aware
                    redirect that already exists. */}
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  Already registered? Go to your dashboard
                </Link>
              </div>
            </div>

            {/* Ghost of the artifact — the object alumni will hold */}
            <div
              className="animate-reveal hidden lg:block"
              style={{ animationDelay: "360ms" }}
            >
              <div className="rotate-[-2deg]">
                <EcardArtifact
                  name="[Your name]"
                  department="[Your department]"
                  session="2019–2023"
                  cardNo="GGCB-EC-000001"
                  rollNumber="GG-2019-0001"
                  photoAlt="Your photograph"
                />
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Your card, once the college verifies you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What you can do — ledger lines, not an icon grid ─────────── */}
      <section
        className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8"
        aria-labelledby="you-can"
      >
        <LedgerRule />
        <h2
          id="you-can"
          className="mt-8 font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          What you can do here
        </h2>
        <div className="mt-6 divide-y divide-border border-y border-border">
          {REGISTER_LINES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="grid gap-2 py-5 sm:grid-cols-[2rem_18rem_1fr] sm:items-baseline sm:gap-6"
            >
              <Icon
                className="size-5 translate-y-0.5 text-primary"
                aria-hidden="true"
              />
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works — a real sequence, so numbers are honest ────── */}
      <section className="border-y bg-secondary/40" aria-labelledby="how">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2
            id="how"
            className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            How it works
          </h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <span
                  aria-hidden="true"
                  className="font-heading text-4xl font-semibold text-primary/70"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-base font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── FAQ — native details, no dependency ──────────────────────── */}
      <section
        className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        aria-labelledby="faq"
      >
        <h2
          id="faq"
          className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Questions, answered
        </h2>
        <div className="mt-6 divide-y divide-border border-y border-border">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md text-sm font-semibold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M10 4v12M4 10h12" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

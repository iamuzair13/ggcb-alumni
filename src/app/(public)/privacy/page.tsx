import Link from "next/link";
import { LedgerRule } from "@/components/shared/ledger-rule";
import { COLLEGE } from "@/lib/college";

export const metadata = {
  title: "Privacy notice",
  description:
    "What information the GGCB Alumni Portal collects, why, who can see it, and the choices you have.",
};

const SECTIONS = [
  {
    id: "what",
    title: "What we collect",
    body: "When you register we ask for your name, roll number, department, session and passing year (the academic record), plus your email address, phone number and a password (the account). Once verified you may also add work and location details, a biography, social links and a photograph — all optional.",
  },
  {
    id: "why",
    title: "Why we collect it",
    body: "The information maintains your alumni record: it lets the college verify you, issue your E-card, and show you alumni-only content. Staff use it to manage approvals, change requests and the alumni directory. [Placeholder: the college's formal statement of purposes will be added here — D11.]",
  },
  {
    id: "who-sees",
    title: "Who can see it",
    body: "College staff can see the alumni directory. Other alumni never see your email or phone number unless you choose to show them (per-field privacy switches in your profile). The public E-card verification page shows only your name, department, passing year and card status — nothing else.",
  },
  {
    id: "retention",
    title: "How long it is kept",
    body: "Your record is kept while the alumni portal exists. If you ask for your record to be removed, staff will review the request — some academic details may be retained as part of the college's alumni register. [Placeholder: retention schedule supplied by the college — D11.]",
  },
  {
    id: "choices",
    title: "Your choices",
    body: "You can update editable fields (contact, work, location, biography, photo) yourself at any time. Academic fields change through a request that staff approve — the same way the paper register worked. You can withdraw a pending request, hide your profile from the peer directory, or ask the alumni office to review removal.",
  },
  {
    id: "security",
    title: "How it is protected",
    body: "Passwords are stored only as strong hashes (argon2id), sessions expire, staff actions on your record are audit-logged, and every page is served over HTTPS. Email addresses and token values are never written to logs.",
  },
  {
    id: "contact",
    title: "Questions and requests",
    body: `[Placeholder: alumni office contact — D1/D11] ${COLLEGE.contact.office}, ${COLLEGE.name}. Email: ${COLLEGE.contact.email}.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <p className="text-sm font-medium text-primary">Privacy notice</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        What happens to your information
      </h1>
      <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">
        Plain-language notice for the {COLLEGE.name} alumni portal. Sections
        marked [Placeholder] are flagged for the college to confirm — nothing
        here is a legal commitment yet.
      </p>

      <nav aria-label="Sections" className="mt-8">
        <ol className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`}>
            <LedgerRule className="mb-4" />
            <h2
              id={`${s.id}-title`}
              className="font-heading text-xl font-semibold"
            >
              {s.title}
            </h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
              {s.body}
            </p>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t pt-6 text-sm text-muted-foreground">
        <Link
          href="/"
          className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Back to the portal home
        </Link>
      </p>
    </div>
  );
}

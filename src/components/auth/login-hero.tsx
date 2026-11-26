import { BadgeCheck, IdCard, PencilLine, CalendarDays } from "lucide-react";

/**
 * The other side of the desk — for returning alumni. Same dark forest
 * panel as /register, but the payoff flips: not "join the register" but
 * "your card is already in it". The mock is the dashboard view of that
 * card, tilted the other way.
 */
export function LoginHero() {
  return (
    <aside className="relative overflow-hidden bg-[#052e16] text-[#f0fdf4]">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full bg-[#10b981]/25 blur-3xl"
      />
      <div className="relative mx-auto flex h-full max-w-md flex-col justify-center gap-7 px-6 py-10 lg:px-10">
        <header>
          <h2 className="font-heading text-2xl leading-tight sm:text-3xl">
            Your line is already in the register.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#86efac]">
            Sign in and your E-card, directory entry, and the college&apos;s
            announcements are right there on your dashboard.
          </p>
        </header>

        {/* The card as it sits on the dashboard — tilted the other way. */}
        <div aria-hidden className="hidden rotate-2 sm:block">
          <div className="w-64 rounded-xl border border-white/20 bg-gradient-to-br from-white to-[#f0fdf4] p-4 text-[#052e16] shadow-xl shadow-black/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wide">
                YOUR E-CARD
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1f6a3c]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1f6a3c]">
                <BadgeCheck className="size-3" />
                Verified
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="size-11 shrink-0 rounded-md bg-[#10b981]/15" />
              <div className="min-w-0 flex-1">
                <div className="h-2.5 w-24 rounded bg-[#052e16]/80" />
                <div className="mt-1.5 h-2 w-16 rounded bg-[#052e16]/35" />
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-[#052e16]/10 pt-2.5">
              <span className="font-mono text-[10px] text-[#052e16]/70">
                BS-CS-2019-042
              </span>
              <span className="text-[10px] font-medium text-[#16a34a]">
                Ready to show
              </span>
            </div>
          </div>
        </div>

        {/* What signing in gets you — a sequence, so numbered honestly. */}
        <ol className="flex items-center gap-2 text-[13px] text-[#86efac]">
          {["Sign in", "Open dashboard", "Show your card"].map((t, i) => (
            <li key={t} className="flex items-center gap-2">
              {i > 0 ? (
                <span aria-hidden className="text-[#10b981]">
                  →
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <span className="flex size-5 items-center justify-center rounded-full border border-[#86efac]/40 font-mono text-[10px]">
                  {i + 1}
                </span>
                {t}
              </span>
            </li>
          ))}
        </ol>

        <ul className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-5 text-[13px]">
          <li className="flex items-start gap-2">
            <IdCard className="mt-0.5 size-4 shrink-0 text-[#86efac]" />
            <span className="leading-snug">E-card, ready to show</span>
          </li>
          <li className="flex items-start gap-2">
            <PencilLine className="mt-0.5 size-4 shrink-0 text-[#86efac]" />
            <span className="leading-snug">Update your directory entry</span>
          </li>
          <li className="flex items-start gap-2">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[#86efac]" />
            <span className="leading-snug">Track verification status</span>
          </li>
          <li className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-[#86efac]" />
            <span className="leading-snug">College events and jobs</span>
          </li>
        </ul>
      </div>
    </aside>
  );
}

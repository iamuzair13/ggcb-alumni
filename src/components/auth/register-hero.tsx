import {
  IdCard,
  Users,
  HeartHandshake,
  CalendarDays,
  BadgeCheck,
} from "lucide-react";

/**
 * The registrar's side of the desk — what joining the register actually
 * gets you. Dark indigo panel: the payoff (E-card) first, the real flow
 * (register → verified → card issued), then what membership includes.
 * Server-renderable; the attraction is content, not motion.
 */
export function RegisterHero() {
  return (
    <aside className="relative overflow-hidden bg-[#052e16] text-[#f0fdf4]">
      {/* quiet vignette — depth without a gradient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-[#10b981]/25 blur-3xl"
      />
      <div className="relative mx-auto flex h-full max-w-md flex-col justify-center gap-7 px-6 py-10 lg:px-10">
        <header>
          <h2 className="font-heading text-2xl leading-tight sm:text-3xl">
            Your line in the college register.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#86efac]">
            Register once — the college checks your record, and your alumni
            E-card is issued to you. That card is the proof everywhere else.
          </p>
        </header>

        {/* The payoff — the card they actually receive. */}
        <div aria-hidden className="hidden -rotate-2 sm:block">
          <div className="w-64 rounded-xl border border-white/20 bg-gradient-to-br from-white to-[#f0fdf4] p-4 text-[#052e16] shadow-xl shadow-black/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wide">
                GGCB ALUMNI
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1f6a3c]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1f6a3c]">
                <BadgeCheck className="size-3" />
                Verified
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="size-11 shrink-0 rounded-md bg-[#10b981]/15" />
              <div className="min-w-0">
                <div className="h-2.5 w-24 rounded bg-[#052e16]/80" />
                <div className="mt-1.5 h-2 w-16 rounded bg-[#052e16]/35 font-mono" />
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-[#052e16]/10 pt-2.5">
              <span className="font-mono text-[10px] text-[#052e16]/70">
                BS-CS-2019-042
              </span>
              <div className="flex gap-0.5" aria-hidden>
                {[3, 5, 2, 6, 3, 4].map((w, i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-[#052e16]/70"
                    style={{ height: `${w * 3}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* The real sequence — numbered because it is one. */}
        <ol className="flex items-center gap-2 text-[13px] text-[#86efac]">
          {["Fill the form", "College verifies", "E-card issued"].map(
            (t, i) => (
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
            ),
          )}
        </ol>

        <ul className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-5 text-[13px]">
          <li className="flex items-start gap-2">
            <IdCard className="mt-0.5 size-4 shrink-0 text-[#86efac]" />
            <span className="leading-snug">
              Verified E-card, publicly checkable
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Users className="mt-0.5 size-4 shrink-0 text-[#86efac]" />
            <span className="leading-snug">Directory of your batchmates</span>
          </li>
          <li className="flex items-start gap-2">
            <HeartHandshake className="mt-0.5 size-4 shrink-0 text-[#86efac]" />
            <span className="leading-snug">Mentor current students</span>
          </li>
          <li className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-[#86efac]" />
            <span className="leading-snug">Events, jobs and announcements</span>
          </li>
        </ul>
      </div>
    </aside>
  );
}

import Link from "next/link";
import { availability, cues, doors, hero } from "@/lib/landingCopy";

/*
  THE INTRO — wordmark and Log in are in the bar above; here: the badge, the
  headline, the kicker, the body, the primary button, then the THREE DOORS
  (Student · Varsity athlete · Coach — each jumps to its own section), the
  invite note for the rower holding a link, and the one-line availability.
  No drawn phone any more: the real screenshots below replace it.
*/
function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden>
      <path d="M3 7H11M11 7L7 3M11 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LandingHero() {
  return (
    <section
      id="top"
      className="l-glow-accent relative z-[1] mx-auto flex max-w-[1160px] flex-col items-center justify-center px-6 pt-14 pb-8 text-center sm:px-8"
    >
      <div className="l-fade-up flex flex-col items-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-l-accent-soft bg-l-accent-dim px-3 py-1.5 font-mono text-[11px] font-medium tracking-wider uppercase text-l-accent">
          <span className="l-pulse h-1.5 w-1.5 rounded-full bg-l-accent shadow-[0_0_8px_var(--color-l-accent)]" />
          {hero.badge}
        </div>

        <h1 className="mb-4 max-w-[12ch] font-display text-[clamp(46px,7.6vw,92px)] font-normal leading-[0.98] tracking-[-0.02em] text-balance text-l-text">
          {hero.headline[0]} {hero.headline[1]} <em className="italic text-l-accent">{hero.headline[2]}</em>
        </h1>

        <p className="mb-5 font-mono text-xs tracking-wider uppercase text-l-text-3">
          {hero.kicker.lead} <span className="text-l-text-2">{hero.kicker.tail}</span>
        </p>

        <p className="mb-8 max-w-[46ch] text-[clamp(16px,2vw,18px)] leading-relaxed tracking-tight text-balance text-l-text-2">
          {hero.body}
        </p>

        <Link
          href="/login"
          className="group inline-flex items-center justify-center gap-2 rounded-full bg-l-accent px-7 py-4 text-[15px] font-medium tracking-tight text-l-text transition-transform hover:-translate-y-0.5"
        >
          {hero.primaryCta}
          <Arrow className="transition-transform group-hover:translate-x-1" />
        </Link>

        {/* The three doors */}
        <div className="mt-9 grid w-full max-w-[860px] grid-cols-1 gap-3 sm:grid-cols-3">
          {doors.map((d, i) => (
            <a
              key={d.label}
              href={d.href}
              className={`group flex flex-col items-start gap-1.5 rounded-2xl border px-5 py-4 text-left transition-colors ${
                i === 1
                  ? "border-l-varsity-soft hover:border-l-varsity hover:bg-l-varsity-dim"
                  : "border-l-line hover:border-l-line-hover hover:bg-l-bg-elevated"
              }`}
            >
              <span
                className={`flex w-full items-center justify-between font-display text-[22px] tracking-tight ${
                  i === 1 ? "text-l-varsity" : "text-l-text"
                }`}
              >
                {d.label}
                <Arrow className="text-l-text-3 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="text-[13px] leading-snug text-l-text-2">{d.sub}</span>
            </a>
          ))}
        </div>

        {/* The other way in. A rower usually arrives holding a link from their
            captain, and shouldn't have to scroll to find where it goes. */}
        <p className="mt-6 text-[14px] text-l-text-3">
          {hero.inviteNote}{" "}
          <Link href="/join" className="font-medium text-l-varsity underline-offset-4 transition-colors hover:underline">
            {hero.inviteCta} →
          </Link>
        </p>

        <p className="mt-8 max-w-[60ch] border-t border-l-line pt-6 font-mono text-[11px] leading-relaxed tracking-wide text-l-text-3">
          {availability}
        </p>

        <div className="l-cue mt-8">{cues.hero}</div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { availability, cues, doors, hero } from "@/lib/landingCopy";

/*
  THE INTRO — wordmark and Log in are in the bar above; here: the "live at"
  pill, the headline, the kicker, one line of body, the primary button with
  the availability line right under it, then the THREE DOORS (Student ·
  Varsity athlete · Coach — each jumps to its own section) and the invite
  note for the rower holding a link. No drawn phone: the real screenshots
  below replace it.

  Contrast (2026-08-18 review): the primary button is dark-on-blue (7.2:1),
  the same button as the final CTA — it was light-on-blue at 2.5:1. Nothing a
  visitor is meant to read sits in text-3 (#555 is 2.7:1 on this ground);
  text-3 is for the decorative arrows only.
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

        <p className="mb-5 font-mono text-xs tracking-wider uppercase text-l-text-2">
          {hero.kicker.lead} <span className="text-l-text">{hero.kicker.tail}</span>
        </p>

        <p className="mb-8 max-w-[46ch] text-[clamp(16px,2vw,18px)] leading-relaxed tracking-tight text-balance text-l-text-2">
          {hero.body}
        </p>

        <Link
          href="/login"
          className="group inline-flex items-center justify-center gap-2 rounded-full bg-l-accent px-7 py-4 text-[15px] font-semibold tracking-tight text-l-bg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text"
        >
          {hero.primaryCta}
          <Arrow className="transition-transform group-hover:translate-x-1" />
        </Link>

        {/* The availability line, where the eye lands after the button. */}
        <p className="mt-4 max-w-[46ch] text-[14px] leading-relaxed text-l-text-2">{availability}</p>

        {/* The three doors — blue for the student, gold for the varsity athlete,
            a gold outline for the coach (their section wears the same gold). */}
        <div className="mt-9 grid w-full max-w-[860px] grid-cols-1 gap-3 sm:grid-cols-3">
          {doors.map((d, i) => (
            <a
              key={d.label}
              href={d.href}
              className={`group flex flex-col items-start gap-1.5 rounded-2xl border px-5 py-4 text-left transition-colors ${
                i === 0
                  ? "border-l-accent-soft hover:border-(--color-l-accent) hover:bg-l-accent-dim"
                  : "border-l-varsity-soft hover:border-l-varsity hover:bg-l-varsity-dim"
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
        <p className="mt-6 text-[14px] text-l-text-2">
          {hero.inviteNote}{" "}
          <Link href="/join" className="font-medium text-l-varsity underline-offset-4 transition-colors hover:underline">
            {hero.inviteCta} →
          </Link>
        </p>

        <div className="l-cue mt-8">{cues.hero}</div>
      </div>
    </section>
  );
}

import Link from "next/link";
import HeroFade from "@/components/landing/HeroFade";
import Wordmark from "@/components/landing/Wordmark";
import { availability, brandLine, cues, doors, hero } from "@/lib/landingCopy";

/*
  THE INTRO — one screen that introduces the app and then hands over to the
  story below it.

  It opens on the MARK, the way the link card does: the wordmark and the brand
  line, then the "live at" pill, the headline, one line of body, the primary
  button with the availability line under it, the THREE DOORS (Student ·
  Varsity athlete · Coach — each jumps to its own section), the invite note for
  the rower holding a link, and the scroll cue pinned to the bottom of the
  screen. No drawn phone: the real screenshots below replace it.

  Three things were wrong with it before (owner, 2026-08-23 — "missing
  something, some flow"):

  1. NO MARK. The page's own name was only in the 24px bar, so the intro never
     introduced anything. It now opens on the mark at full size; the bar's copy
     of it is not drawn while this one is on screen (HeroFade → .l-nav-mark),
     so there are never two 40px apart.
  2. IT WAS A WALL OF SMALL TEXT — nine blocks, no hierarchy, and the kicker
     repeated the doors' two subtitles word for word on the same screen. The
     kicker is gone where the doors are drawn, the headline is a size smaller
     and the rhythm tighter, so more of the doors is in front of a laptop
     visitor than before. (The cue is still under the fold on a 800px-tall
     window; the doors peeking above it are the honest scroll cue there.)
  3. IT ARRIVED ALL AT ONCE and left all at once. The blocks now come in on a
     short stagger (l-in-1…4), and the whole thing fades and lags as you scroll
     so the story rises over it instead of replacing it.

  Contrast (2026-08-18 review): the primary button is dark-on-blue (7.2:1), the
  same button as the final CTA. Nothing a visitor is meant to read sits in
  text-3 (2.7:1 on this ground); text-3 is for the decorative arrows only.
*/
function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden>
      <path d="M3 7H11M11 7L7 3M11 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** `doors`: false on a view already chosen from the top bar (/for/…), where
    the three doors would only repeat the tab the visitor just pressed. */
export default function LandingHero({ doors: showDoors = true }: { doors?: boolean }) {
  return (
    <section
      id="top"
      className="l-glow-accent relative z-[1] mx-auto flex min-h-[100svh] max-w-[1160px] flex-col items-center justify-center px-6 pt-10 pb-10 text-center sm:px-8"
    >
      <HeroFade>
        {/* 1 · The mark. The page says who it is before it says anything else. */}
        <div className="l-in-1 mb-6 flex flex-col items-center gap-2">
          <Wordmark className="text-[clamp(30px,4vw,40px)]" />
          <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-l-text-2">
            {brandLine}
          </span>
        </div>

        {/* 2 · The one fact, and the headline. */}
        <div className="l-in-2 flex flex-col items-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-l-accent-soft bg-l-accent-dim px-3 py-1.5 font-mono text-[11px] font-medium tracking-wider uppercase text-l-accent">
            <span className="l-pulse h-1.5 w-1.5 rounded-full bg-l-accent shadow-[0_0_8px_var(--color-l-accent)]" />
            {hero.badge}
          </div>

          <h1 className="mb-4 max-w-[12ch] font-display text-[clamp(40px,6vw,70px)] font-normal leading-[0.98] tracking-[-0.02em] text-balance text-l-text">
            {hero.headline[0]} {hero.headline[1]} <em className="italic text-l-accent">{hero.headline[2]}</em>
          </h1>

          {/* The kicker is the doors' two subtitles, word for word. Where the
              doors are drawn it is the same sentence twice on one screen, so
              it is only kept on the views that have no doors. */}
          {!showDoors && (
            <p className="mb-5 font-mono text-xs tracking-wider uppercase text-l-text-2">
              {hero.kicker.lead} <span className="text-l-text">{hero.kicker.tail}</span>
            </p>
          )}

          <p className="max-w-[46ch] text-[clamp(16px,2vw,18px)] leading-relaxed tracking-tight text-balance text-l-text-2">
            {hero.body}
          </p>
        </div>

        {/* 3 · The way in. */}
        <div className="l-in-3 mt-6 flex flex-col items-center">
          <Link
            href="/login"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-l-accent px-7 py-4 text-[15px] font-semibold tracking-tight text-l-bg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text"
          >
            {hero.primaryCta}
            <Arrow className="transition-transform group-hover:translate-x-1" />
          </Link>

          {/* The availability line, where the eye lands after the button. */}
          <p className="mt-3 max-w-[46ch] text-[14px] leading-relaxed text-l-text-2">{availability}</p>
        </div>

        {/* 4 · The three doors — blue for the student, gold for the varsity
            athlete, a gold outline for the coach (their section wears the same
            gold). Each opens that audience's own view — the same page as its
            tab. */}
        <div className="l-in-4 flex w-full flex-col items-center">
          {showDoors && (
            <div className="mt-6 grid w-full max-w-[860px] grid-cols-1 gap-3 sm:grid-cols-3">
              {doors.map((d, i) => (
                <Link
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
                </Link>
              ))}
            </div>
          )}

          {/* The other way in. A rower usually arrives holding a link from their
              captain, and shouldn't have to scroll to find where it goes. */}
          <p className="mt-6 text-[14px] text-l-text-2">
            {hero.inviteNote}{" "}
            <Link href="/join" className="font-medium text-l-varsity underline-offset-4 transition-colors hover:underline">
              {hero.inviteCta} →
            </Link>
          </p>

          <div className="l-cue mt-7">{cues.hero}</div>
        </div>
      </HeroFade>
    </section>
  );
}

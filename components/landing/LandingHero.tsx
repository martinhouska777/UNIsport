"use client";

import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import HeroFade from "@/components/landing/HeroFade";
import HeroPhones from "@/components/landing/HeroPhones";
import SchoolCrest from "@/components/SchoolCrest";
import Wordmark from "@/components/landing/Wordmark";
import { useSchoolCycle } from "@/components/landing/useSchoolCycle";
import { crestFor } from "@/lib/crests";
import { accent, HERO_CYCLE_MS } from "@/lib/landingSchools";
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

  IT IS ONE SCREEN, AND IT MEASURES ITSELF (owner, 2026-08-23: "ideally I
  wanted this to be one section; now I have to scroll to see it"). Every
  vertical size here — the padding, the gaps, the headline, the mark, and the
  phones beside it — is a clamp with a vh term, so the intro shrinks to fit the
  window it is in instead of running past the fold on a short laptop. The
  scroll cue is pinned to the bottom of the section rather than queued at the
  end of the column, so it costs the column nothing.

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

  IT TAKES THE SCHOOL'S COLOUR. The backdrop cycles the eight schools, and the
  owner's note (2026-08-23) was that everything blue up here should cycle with
  them: the wordmark's second half, "Your people", and the button. So the
  intro owns the cycle (useSchoolCycle) and publishes the school's colour as
  --sc, with --sc-ink for whatever sits ON it. Two things deliberately do not
  follow it:
    • the "Live now at Harvard" pill, which states a fact about Harvard and is
      the one place a colour could actually mislead (the owner's call);
    • everything outside the intro, which is still the page's own blue.

  Contrast: accent() in lib/landingSchools.ts guarantees the button's label
  clears 4.5:1 against whichever school is showing — the promise the blue
  button already made (dark-on-blue, 7.2:1) held for all eight. Nothing a
  visitor is meant to read sits in text-3 (2.7:1 on this ground); text-3 is for
  the decorative arrows only.
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
  const section = useRef<HTMLElement>(null);
  const { i, count, school } = useSchoolCycle(section, HERO_CYCLE_MS);
  const { color, ink } = accent(school.color);

  return (
    <section
      id="top"
      ref={section}
      style={{ "--sc": color, "--sc-ink": `var(--color-${ink})` } as CSSProperties}
      className="l-glow-accent relative z-[1] mx-auto flex min-h-[calc(100svh-var(--l-bar,0px))] max-w-[1160px] flex-col items-center justify-center px-6 pt-[clamp(14px,2.4vh,40px)] pb-[clamp(76px,10vh,100px)] text-center sm:px-8"
    >
      <HeroFade>
        {/* 0 · The backdrop: two app screens in the margins of a wide screen,
            which were empty. Behind everything, and only from xl up. */}
        <HeroPhones i={i} count={count} />

        {/* 1 · The mark. The page says who it is before it says anything else. */}
        <div className="l-in-1 mb-[clamp(10px,2.2vh,24px)] flex flex-col items-center gap-[clamp(2px,0.6vh,8px)]">
          <Wordmark
            className="text-[clamp(26px,min(4.4vw,4.6vh),44px)]"
            accentClassName="text-(--sc) transition-colors duration-700 ease-in-out motion-reduce:transition-none"
          />
          <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-l-text-2">
            {brandLine}
          </span>
        </div>

        {/* 2 · The one fact, and the headline. */}
        <div className="l-in-2 flex flex-col items-center">
          <div className="mb-[clamp(8px,1.6vh,16px)] inline-flex items-center gap-2 rounded-full border border-l-accent-soft bg-l-accent-dim px-3 py-1.5 font-mono text-[11px] font-medium tracking-wider uppercase text-l-accent">
            <span className="l-pulse h-1.5 w-1.5 rounded-full bg-l-accent shadow-[0_0_8px_var(--color-l-accent)]" />
            {hero.badge}
          </div>

          <h1 className="mb-[clamp(6px,1.4vh,16px)] max-w-[12ch] font-display text-[clamp(34px,min(6.4vw,6.6vh),76px)] font-normal leading-[0.98] tracking-[-0.02em] text-balance text-l-text">
            {hero.headline[0]} {hero.headline[1]} <em className="italic text-(--sc) transition-colors duration-700 ease-in-out motion-reduce:transition-none">
              {hero.headline[2]}
            </em>
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
        <div className="l-in-3 mt-[clamp(12px,2.4vh,24px)] flex flex-col items-center">
          <Link
            href="/login"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-(--sc) py-4 pr-7 pl-5 text-[15px] font-semibold tracking-tight text-(--sc-ink) transition-[transform,background-color,color] duration-700 ease-in-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text motion-reduce:transition-none"
          >
            {/* The school showing, as its crest. The intro wears eight
                universities' colours; this is where it says whose — the owner's
                "you see your own university right there". Decorative: the
                button's words are the button. */}
            <SchoolCrest crest={crestFor(school.key)} className="l-cta-mark" />
            {hero.primaryCta}
            <Arrow className="transition-transform group-hover:translate-x-1" />
          </Link>

          {/* The availability line, where the eye lands after the button. */}
          <p className="mt-[clamp(6px,1.2vh,12px)] max-w-[46ch] text-[14px] leading-relaxed text-l-text-2">{availability}</p>
        </div>

        {/* 4 · The three doors — blue for the student, gold for the varsity
            athlete, a gold outline for the coach (their section wears the same
            gold). Each opens that audience's own view — the same page as its
            tab. */}
        <div className="l-in-4 flex w-full flex-col items-center">
          {showDoors && (
            <div className="mt-[clamp(12px,2.4vh,24px)] grid w-full max-w-[860px] grid-cols-1 gap-3 sm:grid-cols-3">
              {doors.map((d, i) => (
                <Link
                  key={d.label}
                  href={d.href}
                  className={`group flex flex-col items-start gap-[clamp(2px,0.6vh,6px)] rounded-2xl border px-5 py-[clamp(9px,1.6vh,16px)] text-left transition-colors ${
                    i === 0
                      ? "border-l-accent-soft hover:border-(--color-l-accent) hover:bg-l-accent-dim"
                      : "border-l-varsity-soft hover:border-l-varsity hover:bg-l-varsity-dim"
                  }`}
                >
                  <span
                    className={`flex w-full items-center justify-between font-display text-[clamp(17px,2.4vh,22px)] tracking-tight ${
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
          <p className="mt-[clamp(10px,2vh,24px)] text-[14px] text-l-text-2">
            {hero.inviteNote}{" "}
            <Link href="/join" className="font-medium text-l-varsity underline-offset-4 transition-colors hover:underline">
              {hero.inviteCta} →
            </Link>
          </p>

        </div>
      </HeroFade>

      {/* Pinned to the foot of the section, not queued at the end of the
          column: the cue is the one thing that costs the intro a whole block
          of height for one word. */}
      <div className="l-cue l-in-5 pointer-events-none absolute inset-x-0 bottom-[clamp(8px,1.6vh,20px)]">{cues.hero}</div>
    </section>
  );
}

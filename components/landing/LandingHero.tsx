"use client";

import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import HeroPhones from "@/components/landing/HeroPhones";
import SchoolCrest from "@/components/SchoolCrest";
import { useSchoolCycle } from "@/components/landing/useSchoolCycle";
import { crestFor } from "@/lib/crests";
import { accent, HERO_CYCLE_MS } from "@/lib/landingSchools";
import { about, doors, hero } from "@/lib/landingCopy";

/*
  THE INTRO — one screen that introduces the app and then hands over to the
  story below it.

  SPLIT, LIKE HEVY'S FRONT PAGE (owner, 2026-09-27: "ok udelej to tak jak
  doporucujes a udelej to visually pleasing a ten text pod tim at se da dobre
  cist jako u hevy"). The words on the left, the two phones on the right, the
  three doors across the whole width underneath:

      FREE FOR STUDENTS                ┌───────┐
      Your campus.               ┌─────┤       │
      Your gym.                  │Gyms │ Match │
      Your people.               │     │       │
      Find every gym on campus…  └─────┤       │
      ( Get started with .edu → )      └───────┘
      [ Student ]      [ Varsity athlete ]      [ Coach ]

  • NO WORDMARK HERE. The name lives in the top bar, top left, the way Hevy's
    does, so the bar draws its lockup from the first frame. (The intro opened
    on the wordmark at full size from 2026-08-23 — "the page says its own name
    first" — and the bar's copy stood down while it was up; both went.)
  • The headline is the product's three lines, one per line. The promise,
    "Never train alone again.", stays on the student card one screen down
    (StudentIntro). Swapping the two was previewed the same day and dropped:
    "Never train alone" is the category's stock line — Tribe carries it in its
    app name, GymMate sits on nevertrainalone.co.uk — so as the FIRST sentence
    a stranger reads, it filed the app with theirs. "Your campus" is the line
    none of them can say.
  • The body is set to be READ, not glanced at: ink rather than grey, left-
    aligned, about sixty characters a line, 1.55 leading. Hevy's own: 17px,
    1.5, near-black, a 490px column. Centred and balanced, ours read as a
    ragged block of grey.
  • Below lg there is no room beside the words: the phones are not drawn and
    the column centres itself, as Hevy's does on a phone.

  IT IS ONE SCREEN, AND IT MEASURES ITSELF (owner, 2026-08-23: "ideally I
  wanted this to be one section; now I have to scroll to see it"). Every
  vertical size here — the padding, the gaps, the headline — is a clamp with a
  vh term, so the intro shrinks to fit the window it is in instead of running
  past the fold on a short laptop. The phones go one further: they take the
  height the words and the doors leave them (.l-hero-split, app/globals.css).
  At 34vh alone they pushed the intro 5–40px past the bottom of every window
  under 860px tall (owner, 2026-09-27: "it doesn't fit on bottom").

  The line that stood under the button — "Customized for each campus, with
  its own gyms, houses and colours. Yours can be next." — is CUT here, on the
  owner's call the same evening ("cut this part so it fits better"). The
  colours changing behind the phones say it without words. /for/students
  still carries it under its own button (StudentIntro).

  IT ARRIVES rather than pops: the blocks come in on a short stagger
  (l-in-1…4) while the phones rise into place (app/globals.css).

  IT TAKES THE SCHOOL'S COLOUR — IN THREE PLACES. The phones cycle the eight
  schools, and the intro owns the cycle (useSchoolCycle) and publishes the
  school's colour as --sc, with --sc-ink for whatever sits ON it. "Your
  people." and the "Get started with .edu" button wear it, and so does the
  glow behind the phones (HeroPhones). The launch audit (2026-09-27, item 13)
  had cut it down from five things at once on this one screen — the top bar's
  button, "sport" in the name, those two, and the glow — to two; the owner
  put the glow back the same evening ("make sure it changes the background
  color"). The pill never followed it: it states a fact, and a fact in a
  school's colour could read as that school's.

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

/* The three doors' tints, in `doors` order: Student · Varsity athlete · Coach.
   Opaque grounds (see-through ones went olive and grey over the page's cyan);
   hovering draws the border in the door's full colour. */
const DOOR_TONE = [
  { card: "border-l-accent-soft bg-l-bg-student hover:border-(--color-l-accent)", label: "text-l-text" },
  { card: "border-l-varsity-soft bg-l-surface-varsity hover:border-l-varsity", label: "text-l-varsity" },
  { card: "border-l-coach-soft bg-l-surface-coach hover:border-l-coach", label: "text-l-coach" },
];

/* The intro belongs to "/" alone (2026-08-30): it introduces the whole
   product and hands the visitor three doors, and a view reached THROUGH one of
   those doors opens on its own statement instead — see LandingPage. */
export default function LandingHero() {
  const section = useRef<HTMLElement>(null);
  const { i, count, school } = useSchoolCycle(section, HERO_CYCLE_MS);
  const { color, ink } = accent(school.color);

  /* The pair stays on this section. It used to be published on <html> too, so
     the top bar's button could cycle with it (owner, 2026-09-19); the launch
     audit (2026-09-27, items 13 and 38) put that button back in the page's
     plain ink, so this button is the one school-coloured way in on the screen.

     The same 1280px column as the top bar's, so the words start under the
     logo and the phones end under the bar's last button. */
  return (
    <section
      id="top"
      ref={section}
      style={{ "--sc": color, "--sc-ink": `var(--color-${ink})` } as CSSProperties}
      className="l-glow-accent relative z-[1] mx-auto flex min-h-[calc(100svh-var(--l-bar,0px))] w-full max-w-[1280px] flex-col justify-center px-6 pt-[clamp(18px,3.2vh,48px)] pb-[clamp(30px,4.4vh,60px)] sm:px-8"
    >
      <div className="l-hero-split grid items-center gap-x-10 lg:grid-cols-2">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          {/* 1 · The one fact, and the headline — one line of it per line. */}
          <div className="l-in-1 mb-[clamp(12px,2.2vh,22px)] inline-flex items-center gap-2 rounded-full border border-l-accent-soft bg-l-accent-dim px-3 py-1.5 font-mono text-[12.5px] font-medium tracking-wider uppercase text-l-accent">
            <span className="l-pulse h-1.5 w-1.5 rounded-full bg-l-accent shadow-[0_0_8px_var(--color-l-accent)]" />
            {hero.badge}
          </div>

          <h1 className="l-in-1 font-display text-[clamp(46px,min(6.4vw,8.8vh),90px)] font-normal leading-[0.98] tracking-[-0.02em] text-l-text">
            <span className="block">{hero.headline[0]}</span>{" "}
            <span className="block">{hero.headline[1]}</span>{" "}
            <em className="block italic text-(--sc) transition-colors duration-700 ease-in-out motion-reduce:transition-none">
              {hero.headline[2]}
            </em>
          </h1>

          {/* 2 · The body, set to be read (see the note at the top). */}
          <p className="l-in-2 mt-[clamp(16px,2.8vh,28px)] max-w-[30em] text-[clamp(16px,1.25vw,18px)] leading-[1.55] tracking-[-0.005em] text-pretty text-l-text">
            {hero.body}
          </p>

          {/* 3 · The way in. */}
          <div className="l-in-3 mt-[clamp(20px,3.6vh,36px)] flex flex-col items-center lg:items-start">
            <Link
              href={hero.primaryHref}
              className="group l-lift inline-flex items-center justify-center gap-2 rounded-full bg-(--sc) py-4 pr-7 pl-5 text-[15px] font-semibold tracking-tight text-(--sc-ink) transition-[transform,background-color,color] duration-700 ease-in-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text motion-reduce:transition-none"
            >
              {/* The school showing, as its crest. The intro wears eight
                  universities' colours; this is where it says whose — the owner's
                  "you see your own university right there". Decorative: the
                  button's words are the button. */}
              <SchoolCrest crest={crestFor(school.key)} className="l-cta-mark" />
              {hero.primaryCta}
              <Arrow className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* 0 · The two phones — the right half, from lg up. */}
        <HeroPhones i={i} count={count} />
      </div>

      {/* 4 · The three doors, each with its own tint (owner, 2026-09-15) —
          blue for the student, gold for the varsity athlete, red for the
          coach, whose title is written in that red the way Varsity athlete
          is written in gold. Each opens that audience's own view — the same
          page as its tab. Across the whole column now, under both halves. */}
      <div className="l-in-4 mt-[clamp(20px,4vh,44px)] flex w-full flex-col">
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          {doors.map((d, i) => (
            <Link
              key={d.label}
              href={d.href}
              className={`group flex flex-col items-start gap-[clamp(2px,0.6vh,6px)] rounded-2xl border px-5 py-[clamp(9px,1.6vh,16px)] text-left transition-[color,background-color,border-color,translate] hover:-translate-y-0.5 ${DOOR_TONE[i].card}`}
            >
              <span
                className={`flex w-full items-center justify-between font-display text-[clamp(22px,3.2vh,30px)] tracking-tight ${DOOR_TONE[i].label}`}
              >
                {d.label}
                <Arrow className="text-l-text-3 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="text-[13px] leading-snug text-l-text-2">{d.sub}</span>
            </Link>
          ))}
        </div>

        {/* Two small ways on, on one line so the screen keeps its height.

            The WHY (owner, 2026-09-04) points down this same page, where the
            first paragraph of it now stands: the story behind the app is the
            piece a student is most likely to be moved by, and until now it
            was two clicks away.

            The INVITE is the rower's: they usually arrive holding a link from
            their captain, and shouldn't have to scroll to find where it goes.
            It keeps the varsity gold; the Why wears the page's link blue,
            underlined — the same as on Contact, since it was ink here and
            blue there (launch audit 2026-09-27, item 45). */}
        <div className="mt-[clamp(10px,2vh,24px)] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[14px] text-l-text-2 lg:justify-start">
          <Link
            href={hero.whyHref}
            className="tap44 inline-block font-medium text-l-accent underline underline-offset-4 transition-colors"
          >
            {about.readWhy} →
          </Link>
          <span aria-hidden="true" className="text-l-text-3 max-sm:hidden">
            ·
          </span>
          <p>
            {hero.inviteNote}{" "}
            <Link
              href="/join"
              className="tap44 inline-block font-medium text-l-varsity underline-offset-4 transition-colors hover:underline"
            >
              {hero.inviteCta} →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import OpeningSteps from "@/components/landing/OpeningSteps";
import SchoolCrest from "@/components/SchoolCrest";
import { useSchoolCycle } from "@/components/landing/useSchoolCycle";
import { useReveal } from "@/components/landing/useReveal";
import { crestFor } from "@/lib/crests";
import { accent, HERO_CYCLE_MS } from "@/lib/landingSchools";
import { availability, cues, hero, studentIntro } from "@/lib/landingCopy";

/*
  BEFORE THE STUDENT STORY — a title card, and nothing more than that.

  It is a plain section that scrolls past, the way the varsity interlude
  always was. It briefly lived INSIDE the story's sticky stage, handing over
  to the phone with a movement; the owner's verdict on 2026-08-30 was
  "nelibi se mi tam ta animace, nejak nesedi — proste to nech staticke jak
  byla ta varsity predtim", so the handover is gone and the story arrives on
  its own the way it always did (.ls-enter).

  STRIPPED 2026-09-01: the product name and the lead-in are gone, and the
  card opens on the page's own line instead. The steps, the overview link and
  the cue were cut with them and PUT BACK the same day — two lines on a
  min-h-svh section read as an empty screen ("to vyplni ten screen"). The
  reasoning is on `studentIntro` in lib/landingCopy.ts.

  IT ARRIVES, AND IT HAS A GROUND (owner, 2026-09-04: "do some animation for
  the never train alone and the 7 features and better background"). The card
  is .l-titlecard — the page's grid and one soft glow behind the words, in
  --tg — and every part of it fades up in turn once the card is on screen,
  the seven chips one after another. The clock is the hero's; the delays are
  the --d below, and the CSS is in app/globals.css. NOT the handover the
  owner rejected in August: nothing here moves the story, the card simply
  arrives instead of being there already.

  IT TAKES THE SCHOOL'S COLOUR — BUT ONLY WHEN IT IS THE FRONT DOOR
  (2026-09-01, the owner, in two steps: "u toho the app bych udelal to stejne
  jako landing ze se to meni podle univerzity", then "kdyz jedu pres home tak
  by se to nemenilo, a kdyz kliknu na the app tak tam jo").

  So the cycle is tied to `solo`, not to the card:
    • On "/" the intro is one screen above and is already cycling the eight
      schools. A second cycle right under it is not a second idea, it is the
      same idea twice — so here the card is the page's own blue and holds
      still while the reader scrolls through.
    • On /for/students nothing comes before it. The card IS the front door, so
      it does the job the intro does on "/": "alone again." — this card's
      "Your people" — and the .edu button take the showing school's colour,
      the button carrying that school's crest and its contrast-checked ink.
      The glow behind the words follows the same colour.

  The cycle hook is called either way (it must be), but `cycle` only points at
  the element in solo, so on "/" it finds nothing, returns early and starts no
  timer. The reveal ref is attached either way — every card arrives.

  Deliberately NOT cycling even in solo: the steps and the overview link, which
  stay the page's own blue. The intro draws the same line — its pill and its
  doors keep their colours while the headline and the button change — and a
  card where every element turns crimson at once is a different page.

  `solo`: on /for/students this card opens the page, so it also carries the
  way in — the .edu button and the availability line, which the hero carries
  on "/".
*/
export default function StudentIntro({ solo = false }: { solo?: boolean }) {
  const card = useRef<HTMLElement>(null);
  const cycle = useRef<HTMLElement>(null);
  const { school } = useSchoolCycle(cycle, HERO_CYCLE_MS);
  const shown = useReveal(card);
  const { color, ink } = accent(school.color);

  return (
    <section
      id="student-intro"
      ref={(el) => {
        card.current = el;
        cycle.current = solo ? el : null;
      }}
      style={
        {
          ...(solo ? { "--sc": color, "--sc-ink": `var(--color-${ink})` } : null),
          // The glow behind the words: the school's own colour where the card
          // is the front door, the page's blue where it is not.
          "--tg": solo
            ? "color-mix(in srgb, var(--sc) 26%, transparent)"
            : "color-mix(in srgb, var(--color-l-accent) 20%, transparent)",
        } as CSSProperties
      }
      className={`l-titlecard relative z-[1] flex min-h-svh flex-col items-center justify-center gap-[clamp(10px,1.8vh,18px)] border-t border-l-line bg-l-surface px-6 pt-14 pb-8 text-center ${
        shown ? "is-in" : ""
      }`}
    >
      <h2 className="max-w-[13ch] font-display text-[clamp(40px,8vw,76px)] font-normal leading-[0.98] tracking-[-0.02em] text-balance text-l-text">
        {/* The two halves arrive one after the other, so the promise finishes
            itself. inline-block: a transform does nothing to a plain inline. */}
        <span className="l-tc inline-block">{studentIntro.headline}</span>{" "}
        <em
          className={`l-tc inline-block ${
            solo
              ? "italic text-(--sc) transition-colors duration-700 ease-in-out motion-reduce:transition-none"
              : "italic text-l-accent"
          }`}
          style={{ "--d": "110ms" } as CSSProperties}
        >
          {studentIntro.headlineEm}
        </em>
      </h2>

      <p
        className="l-tc max-w-[38ch] text-[clamp(15px,2.2vw,18px)] leading-[1.55] tracking-[-0.01em] text-balance text-l-text-2"
        style={{ "--d": "200ms" } as CSSProperties}
      >
        {studentIntro.sub}
      </p>

      <OpeningSteps steps={studentIntro.steps} accent="accent" storyId="story1" delay={280} />

      {solo && (
        <div className="l-tc mt-2 flex flex-col items-center gap-3" style={{ "--d": "690ms" } as CSSProperties}>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-(--sc) py-4 pr-7 pl-5 text-[15px] font-semibold tracking-tight text-(--sc-ink) transition-[transform,background-color,color] duration-700 ease-in-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text motion-reduce:transition-none"
          >
            <SchoolCrest crest={crestFor(school.key)} className="l-cta-mark" />
            {hero.primaryCta} →
          </Link>
          <p className="max-w-[46ch] text-[14px] leading-relaxed text-l-text-2">{availability}</p>
        </div>
      )}

      <a
        href={studentIntro.overview.href}
        className="l-tc mt-1 inline-flex items-center gap-2 rounded-full border border-l-accent-soft px-6 py-3 text-[14px] font-medium tracking-tight text-l-text transition-colors hover:border-l-accent hover:bg-l-accent-dim"
        style={{ "--d": "750ms" } as CSSProperties}
      >
        {studentIntro.overview.label} →
      </a>

      <div className="l-tc l-cue mt-[22px]" style={{ "--d": "830ms" } as CSSProperties}>
        {cues.hero}
      </div>
    </section>
  );
}

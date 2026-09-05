"use client";

import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import OpeningSteps from "@/components/landing/OpeningSteps";
import { useReveal } from "@/components/landing/useReveal";
import { cues, hero, interlude } from "@/lib/landingCopy";

/*
  BETWEEN THE TWO STORIES — a full stop, then a reveal. The student story has
  closed; this is the varsity story's own opening statement, full width, no
  phone, the same weight as the hero (the brief). Gold is the varsity accent.

  A plain section that scrolls past — see StudentIntro for why the handover
  into the story is not animated. Everything else the card gained stays: the
  ground a step up from the page, the six steps, the link to the overview.

  IT ARRIVES, AND IT HAS A GROUND — the same .l-titlecard as its student twin
  (owner, 2026-09-04). Same clock, same glow, in gold; the reasoning and the
  CSS are with StudentIntro and in app/globals.css. A client component only so
  it can tell when it is on screen.

  `solo`: on the Varsity view (/for/varsity) it OPENS the page — nothing above
  it but the bar. The lead-in loses its joining "And", the rower's way in
  (the team invite, which the hero carries on "/") sits under it, and the
  cue says "Scroll" like the hero's, not "Keep going".
*/
export default function Interlude({ solo = false }: { solo?: boolean }) {
  const card = useRef<HTMLElement>(null);
  const shown = useReveal(card);

  return (
    <section
      id="interlude"
      ref={card}
      style={{ "--tg": "color-mix(in srgb, var(--color-l-varsity) 18%, transparent)" } as CSSProperties}
      className={`l-titlecard relative z-[1] flex min-h-svh flex-col items-center justify-center gap-[clamp(10px,1.8vh,18px)] border-t border-l-line bg-l-surface px-6 pt-14 pb-8 text-center ${
        shown ? "is-in" : ""
      }`}
    >
      <p className="l-tc font-display text-[clamp(20px,3.4vw,30px)] tracking-[-0.01em] text-l-text-2">
        {solo ? interlude.leadInSolo : interlude.leadIn}
      </p>

      <h2 className="max-w-[12ch] font-display text-[clamp(48px,10vw,104px)] font-normal leading-[0.98] tracking-[-0.02em] text-balance text-l-text">
        {/* Two halves, one behind the other — see StudentIntro. */}
        <span className="l-tc inline-block" style={{ "--d": "90ms" } as CSSProperties}>
          {interlude.headline}
        </span>{" "}
        <em className="l-tc inline-block italic text-l-varsity" style={{ "--d": "190ms" } as CSSProperties}>
          {interlude.headlineEm}
        </em>
      </h2>

      <p
        className="l-tc max-w-[36ch] text-[clamp(16px,2.4vw,19px)] leading-[1.55] tracking-[-0.01em] text-balance text-l-text-2"
        style={{ "--d": "280ms" } as CSSProperties}
      >
        {interlude.sub}
      </p>

      {/* The sport, UNDER the sentence and above the steps (the owner's
          arrangement). The hero's pill, in gold — how this page marks a fact. */}
      <div
        className="l-tc inline-flex items-center gap-2 rounded-full border border-l-varsity-soft bg-l-varsity-dim px-3 py-1.5 font-mono text-[11px] font-medium tracking-wider uppercase text-l-varsity"
        style={{ "--d": "350ms" } as CSSProperties}
      >
        <span className="l-pulse h-1.5 w-1.5 rounded-full bg-l-varsity shadow-[0_0_8px_var(--color-l-varsity)]" />
        {interlude.availability}
      </div>

      <OpeningSteps steps={interlude.steps} accent="varsity" storyId="story2" delay={420} />

      {solo && (
        <div className="l-tc mt-2 flex flex-col items-center gap-3" style={{ "--d": "830ms" } as CSSProperties}>
          <p className="text-[14px] text-l-text-2">{hero.inviteNote}</p>
          <Link
            href="/join"
            className="inline-flex items-center gap-2 rounded-full bg-l-varsity px-7 py-4 text-[15px] font-semibold tracking-tight text-l-bg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text"
          >
            {hero.inviteCta} →
          </Link>
        </div>
      )}

      <a
        href={interlude.overview.href}
        className="l-tc mt-1 inline-flex items-center gap-2 rounded-full border border-l-varsity-soft px-6 py-3 text-[14px] font-medium tracking-tight text-l-text transition-colors hover:border-l-varsity hover:bg-l-varsity-dim"
        style={{ "--d": "890ms" } as CSSProperties}
      >
        {interlude.overview.label} →
      </a>

      <div className="l-tc l-cue mt-[22px]" style={{ "--d": "960ms" } as CSSProperties}>
        {solo ? cues.hero : cues.interlude}
      </div>
    </section>
  );
}

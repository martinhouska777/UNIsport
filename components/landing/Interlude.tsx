import Link from "next/link";
import OpeningSteps from "@/components/landing/OpeningSteps";
import { cues, hero, interlude } from "@/lib/landingCopy";

/*
  BETWEEN THE TWO STORIES — a full stop, then a reveal. The student story has
  closed; this is the varsity story's own opening statement, no phone, the
  same weight as the hero (the brief). Gold is the varsity accent.

  It is played inside the varsity story's sticky stage (ScrollStory's
  `opening`) rather than as a section above it, so the phone can rise into the
  card instead of appearing separately underneath it (owner, 2026-08-30).
  Two halves, treated differently by the stage's CSS:
    .ls-open-words  lifts and fades as the opening is scrolled through
    .ls-open-cue    does not move — the phone rises to meet it

  `solo`: on the Varsity view (/for/varsity) it OPENS the page — nothing above
  it but the bar. The lead-in loses its joining "And", the rower's way in
  (the team invite, which the hero carries on "/") sits under it, and the
  cue says "Scroll" like the hero's, not "Keep going".
*/
export default function Interlude({ solo = false }: { solo?: boolean }) {
  return (
    <>
      <div className="ls-open-words">
        <p className="font-display text-[clamp(20px,3.4vw,30px)] tracking-[-0.01em] text-l-text-2">
          {solo ? interlude.leadInSolo : interlude.leadIn}
        </p>

        <h2 className="max-w-[12ch] font-display text-[clamp(48px,10vw,104px)] font-normal leading-[0.98] tracking-[-0.02em] text-balance text-l-text">
          {interlude.headline} <em className="italic text-l-varsity">{interlude.headlineEm}</em>
        </h2>

        <p className="max-w-[36ch] text-[clamp(16px,2.4vw,19px)] leading-[1.55] tracking-[-0.01em] text-balance text-l-text-2">
          {interlude.sub}
        </p>

        <OpeningSteps steps={interlude.steps} accent="varsity" />

        {solo && (
          <div className="mt-2 flex flex-col items-center gap-3">
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
          className="mt-1 inline-flex items-center gap-2 rounded-full border border-l-varsity-soft px-6 py-3 text-[14px] font-medium tracking-tight text-l-text transition-colors hover:border-l-varsity hover:bg-l-varsity-dim"
        >
          {interlude.overview.label} →
        </a>
      </div>

      <div className="l-cue ls-open-cue">{solo ? cues.hero : cues.interlude}</div>
    </>
  );
}

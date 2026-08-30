import Link from "next/link";
import { availability, cues, hero, studentIntro } from "@/lib/landingCopy";

/*
  THE STUDENT STORY'S OPENING — a title card, played inside the story's own
  sticky stage (ScrollStory's `opening`), not in a section above it. Same job
  Interlude does for varsity, at a lower volume on purpose: "Varsity Mode." is
  a reveal, and the student app is the thing the visitor came for, so this
  announces rather than surprises. Blue is the student accent.

  It renders two halves, and the stage's CSS treats them differently:
    .ls-open-words  lifts and fades as the opening is scrolled through
    .ls-open-cue    does not move — the phone rises to meet it

  `solo`: on /for/students this opens the page, so it loses the joining
  "First," and carries the way in (the .edu button and the availability line,
  which the hero carries on "/"), exactly as Interlude does for the rower
  arriving with an invite.
*/
export default function StudentIntro({ solo = false }: { solo?: boolean }) {
  return (
    <>
      <div className="ls-open-words">
        <p className="font-display text-[clamp(18px,3vw,26px)] tracking-[-0.01em] text-l-text-2">
          {solo ? studentIntro.leadInSolo : studentIntro.leadIn}
        </p>

        <h2 className="max-w-[12ch] font-display text-[clamp(40px,8vw,76px)] font-normal leading-[0.98] tracking-[-0.02em] text-balance text-l-text">
          {studentIntro.headline}{" "}
          <em className="italic text-l-accent">{studentIntro.headlineEm}</em>
        </h2>

        <p className="max-w-[38ch] text-[clamp(15px,2.2vw,18px)] leading-[1.55] tracking-[-0.01em] text-balance text-l-text-2">
          {studentIntro.sub}
        </p>

        {solo && (
          <div className="mt-2 flex flex-col items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-l-accent px-7 py-4 text-[15px] font-semibold tracking-tight text-l-bg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text"
            >
              {hero.primaryCta} →
            </Link>
            <p className="max-w-[46ch] text-[14px] leading-relaxed text-l-text-2">{availability}</p>
          </div>
        )}
      </div>

      <div className="l-cue ls-open-cue">{cues.hero}</div>
    </>
  );
}

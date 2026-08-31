import Link from "next/link";
import { availability, hero, studentIntro } from "@/lib/landingCopy";

/*
  BEFORE THE STUDENT STORY — a title card, and nothing more than that.

  It is a plain section that scrolls past, the way the varsity interlude
  always was. It briefly lived INSIDE the story's sticky stage, handing over
  to the phone with a movement; the owner's verdict on 2026-08-30 was
  "nelibi se mi tam ta animace, nejak nesedi — proste to nech staticke jak
  byla ta varsity predtim", so the handover is gone and the story arrives on
  its own the way it always did (.ls-enter).

  STRIPPED 2026-09-01 to the quote and one instruction — the lead-in, the
  seven numbered steps, the overview link and the "Scroll" cue are all gone
  ("cutneme to ostatni"). The reasoning is on `studentIntro` in
  lib/landingCopy.ts. Interlude still carries steps; OpeningSteps is alive
  for varsity only.

  `solo`: on /for/students this card opens the page, so it also carries the
  way in — the .edu button and the availability line, which the hero carries
  on "/".
*/
export default function StudentIntro({ solo = false }: { solo?: boolean }) {
  return (
    <section
      id="student-intro"
      className="relative z-[1] flex min-h-svh flex-col items-center justify-center gap-[clamp(14px,2.4vh,24px)] border-t border-l-line bg-l-surface px-6 pt-14 pb-8 text-center"
    >
      <h2 className="max-w-[13ch] font-display text-[clamp(40px,8vw,76px)] font-normal leading-[0.98] tracking-[-0.02em] text-balance text-l-text">
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
    </section>
  );
}

import { cues, interlude } from "@/lib/landingCopy";

/*
  BETWEEN THE TWO STORIES — a full stop, then a reveal. The student story has
  closed; this is the varsity story's own opening statement, full width, no
  phone, the same weight as the hero (the brief). The ground steps one surface
  level warmer behind it. Gold is the varsity accent.
*/
/** `solo`: on the Varsity view (/for/varsity) it opens the page instead of
    following the student story — the lead-in loses its joining "And". */
export default function Interlude({ id = "interlude", solo = false }: { id?: string; solo?: boolean }) {
  return (
    <section
      id={id}
      className="relative z-[1] flex min-h-svh flex-col items-center justify-center gap-[22px] bg-l-bg-warm px-6 pt-12 pb-6 text-center"
    >
      <p className="font-display text-[clamp(20px,3.4vw,30px)] tracking-[-0.01em] text-l-text-2">
        {solo ? interlude.leadInSolo : interlude.leadIn}
      </p>
      <h2 className="max-w-[12ch] font-display text-[clamp(52px,11vw,118px)] font-normal leading-[0.98] tracking-[-0.02em] text-balance text-l-text">
        {interlude.headline} <em className="italic text-l-varsity">{interlude.headlineEm}</em>
      </h2>
      <p className="max-w-[36ch] text-[clamp(16px,2.4vw,19px)] leading-[1.55] tracking-[-0.01em] text-balance text-l-text-2">
        {interlude.sub}
      </p>
      <div className="l-cue mt-[26px]">{cues.interlude}</div>
    </section>
  );
}

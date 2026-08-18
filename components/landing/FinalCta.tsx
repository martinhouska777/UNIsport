import { about, finalCta } from "@/lib/landingCopy";

/*
  THE CLOSE — "One app per university. Yours next." The button is for a
  university, not a student: it opens a mail to the address on /privacy and
  /terms. (The prototype pointed it at /join, which is the TEAM invite — a
  different door.)
*/
export default function FinalCta() {
  return (
    <section className="relative z-[1] flex min-h-[70svh] flex-col items-center justify-center gap-5 px-6 py-24 text-center sm:px-8">
      <h2 className="max-w-[16ch] font-display text-[clamp(36px,6vw,64px)] font-normal leading-[1.05] tracking-[-0.015em] text-balance text-l-text">
        {finalCta.headline} <em className="italic text-l-accent">{finalCta.headlineEm}</em>
      </h2>
      <p className="max-w-[40ch] text-[16px] leading-[1.6] text-l-text-2">{finalCta.sub}</p>
      <a
        href={`mailto:${about.email}`}
        className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-l-accent px-[30px] py-[15px] text-[15px] font-semibold tracking-tight text-l-bg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text"
      >
        {finalCta.button}
      </a>
    </section>
  );
}

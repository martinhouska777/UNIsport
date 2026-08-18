import { about } from "@/lib/landingCopy";

/* ABOUT · CONTACT — a short paragraph and the address already published on
   /privacy and /terms. */
export default function About() {
  return (
    <section id="about" className="relative z-[1] scroll-mt-20 border-t border-l-border px-6 py-24 sm:px-8">
      <div className="mx-auto grid max-w-[1160px] gap-10 lg:grid-cols-[1fr_2fr]">
        <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-l-accent">{about.kicker}</div>
        <div>
          <h2 className="font-display text-[clamp(36px,5vw,56px)] leading-[1.02] tracking-tight text-balance text-l-text">
            {about.headline} <em className="italic text-l-accent">{about.headlineEm}</em>
          </h2>
          <p className="mt-6 max-w-[62ch] text-[clamp(16px,1.8vw,18px)] leading-[1.65] text-l-text-2">{about.body}</p>
          <p className="mt-8 font-mono text-[12px] tracking-wide text-l-text-3">
            <span className="uppercase">{about.contactLabel}</span>{" "}
            <a href={`mailto:${about.email}`} className="ml-3 text-l-text-2 underline-offset-4 transition-colors hover:text-l-text hover:underline">
              {about.email}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

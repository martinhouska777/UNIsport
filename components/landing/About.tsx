import { about } from "@/lib/landingCopy";

/* ABOUT — a short paragraph. Also its own tab (/about). The address that used
   to sit under it lives in Contact.tsx now, which has its own tab too; on the
   whole page the two sections follow each other. */
export default function About() {
  return (
    <section id="about" className="relative z-[1] scroll-mt-20 border-t border-l-line px-6 py-24 sm:px-8">
      <div className="mx-auto grid max-w-[1160px] gap-10 lg:grid-cols-[1fr_2fr]">
        <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-l-accent">{about.kicker}</div>
        <div>
          <h2 className="font-display text-[clamp(36px,5vw,56px)] leading-[1.02] tracking-tight text-balance text-l-text">
            {about.headline} <em className="italic text-l-accent">{about.headlineEm}</em>
          </h2>
          <p className="mt-6 max-w-[62ch] text-[clamp(16px,1.8vw,18px)] leading-[1.65] text-l-text-2">{about.body}</p>
        </div>
      </div>
    </section>
  );
}

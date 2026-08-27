import Link from "next/link";
import { about, aboutWhy } from "@/lib/landingCopy";

/* ABOUT — a short paragraph, and (on its own tab, `full`) WHY WE BUILT IT:
   the motivation, in a few plain paragraphs (owner, 2026-08-18). On "/" the
   section stays short — the paragraph and a link to the tab — because the
   whole page is long already. The address that used to sit under it lives in
   Contact.tsx now, which has its own tab too. */
export default function About({ full = false }: { full?: boolean }) {
  return (
    <section id="about" className="relative z-[1] scroll-mt-20 border-t border-l-line px-6 py-24 sm:px-8">
      <div className="mx-auto grid max-w-[1160px] gap-10 lg:grid-cols-[1fr_2fr]">
        <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-l-accent">{about.kicker}</div>
        <div>
          <h2 className="font-display text-[clamp(36px,5vw,56px)] leading-[1.02] tracking-tight text-balance text-l-text">
            {about.headline} <em className="italic text-l-accent">{about.headlineEm}</em>
          </h2>
          <p className="mt-6 max-w-[62ch] text-[clamp(16px,1.8vw,18px)] leading-[1.65] text-l-text-2">{about.body}</p>
          {!full && (
            <p className="mt-6 text-[15px]">
              <Link
                href="/about"
                className="tap44 inline-block font-medium text-l-text underline-offset-4 transition-colors hover:underline"
              >
                {about.readWhy} →
              </Link>
            </p>
          )}
        </div>

        {full && (
          <>
            <div className="mt-6 font-mono text-[11px] tracking-[0.14em] uppercase text-l-accent lg:mt-16">{aboutWhy.kicker}</div>
            <div className="lg:mt-16">
              <h2 className="font-display text-[clamp(36px,5vw,56px)] leading-[1.02] tracking-tight text-balance text-l-text">
                {aboutWhy.headline} <em className="italic text-l-accent">{aboutWhy.headlineEm}</em>
              </h2>
              <div className="mt-6 flex max-w-[62ch] flex-col gap-5 text-[clamp(16px,1.8vw,18px)] leading-[1.65] text-l-text-2">
                {aboutWhy.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

import Link from "next/link";
import { about, aboutWhy } from "@/lib/landingCopy";

/* ABOUT — a short paragraph, then WHY I BUILT IT: the motivation, in the
   owner's own plain paragraphs (owner, 2026-08-18).

   THE WHY IS ON BOTH NOW (owner, 2026-09-04: "in about and part on the
   bottom"). It used to be the About tab's alone, and "/" carried only a link
   to it — but the Why is the piece a student is most likely to be moved by,
   and a link is easy to scroll past. So "/" opens it: the heading and the
   first paragraph, then about.readWhy for the rest. On the tab (`full`) all
   of them are there and there is nothing left to link to.

   How many paragraphs "/" shows is DATA — aboutWhy.onHome — not a number
   written here. The address that used to sit under this lives in Contact.tsx,
   which has its own tab too. */
export default function About({ full = false }: { full?: boolean }) {
  const paragraphs = full ? aboutWhy.paragraphs : aboutWhy.paragraphs.slice(0, aboutWhy.onHome);

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

        {/* #why — what the hero's link, Contact and the bar all point at. On
            "/" it is a little way down this page; on /about it is this page. */}
        <div
          id="why"
          className="mt-6 scroll-mt-24 font-mono text-[11px] tracking-[0.14em] uppercase text-l-accent lg:mt-16"
        >
          {aboutWhy.kicker}
        </div>
        <div className="lg:mt-16">
          <h2 className="font-display text-[clamp(36px,5vw,56px)] leading-[1.02] tracking-tight text-balance text-l-text">
            {aboutWhy.headline} <em className="italic text-l-accent">{aboutWhy.headlineEm}</em>
          </h2>
          <div className="mt-6 flex max-w-[62ch] flex-col gap-5 text-[clamp(16px,1.8vw,18px)] leading-[1.65] text-l-text-2">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {!full && (
            <p className="mt-6 text-[15px]">
              <Link
                href="/about#why"
                className="tap44 inline-block font-medium text-l-text underline underline-offset-4 transition-colors"
              >
                {about.readRest} →
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

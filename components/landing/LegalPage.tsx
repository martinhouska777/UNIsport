import type { ReactNode } from "react";
import { instrumentSerif } from "@/components/landing/fonts";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

/*
  Shared chrome for the public legal pages (/privacy, /terms). Zone 1, so the
  neutral product brand only — no university colors (rule 2), all `l-*` tokens.

  These pages exist because Google's OAuth consent screen requires a reachable
  privacy policy + terms URL on the app's own verified domain, and brand
  verification checks the privacy policy is linked from the homepage.
*/
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`${instrumentSerif.variable} l-grid relative min-h-screen overflow-x-hidden bg-l-bg font-sans text-l-text`}
    >
      <LandingNav />
      <main className="relative z-[1] mx-auto max-w-[760px] px-6 pb-20 pt-12 sm:px-8">
        <h1 className="font-display text-4xl italic tracking-tight text-l-text sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 font-mono text-[11px] tracking-wide text-l-text-3">
          Last updated {updated}
        </p>
        <div className="mt-10 flex flex-col gap-8">{children}</div>
      </main>
      <LandingFooter />
    </div>
  );
}

/** One titled section of a legal page. */
export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-medium text-l-text">{heading}</h2>
      <div className="mt-2.5 flex flex-col gap-2.5 text-[14px] leading-relaxed text-l-text-2">
        {children}
      </div>
    </section>
  );
}

/** Bulleted list with the muted body treatment. */
export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-l-text-3">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

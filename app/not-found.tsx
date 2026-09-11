import type { Metadata } from "next";
import Link from "next/link";
import { instrumentSerif } from "@/components/landing/fonts";
import { notFound } from "@/lib/landingCopy";

/*
  PAGE NOT FOUND — for the whole site. Until 2026-09-10 a mistyped link showed
  Next.js's default: a white page reading "404 — This page could not be
  found.", no wordmark, no link (website review). This is the same short
  centred screen /login and /join use, in the neutral Zone 1 brand (`l-*`
  tokens only — someone can land here before signing in), with one way out.
  No top bar: a signed-in person can reach this page too, and "Log in" would
  be the wrong thing to offer them. The words are lib/landingCopy.ts's.
*/
export const metadata: Metadata = {
  title: "Page not found — UNIsport",
};

export default function NotFound() {
  return (
    <div
      className={`${instrumentSerif.variable} flex min-h-dvh flex-col items-center justify-center bg-l-bg px-6 text-center font-sans text-l-text`}
    >
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-block font-display text-2xl italic tracking-tight text-l-text">
          UNI<span className="text-l-accent">sport</span>
        </Link>
        <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-l-text-2">{notFound.kicker}</div>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-balance text-l-text">{notFound.headline}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-balance text-l-text-2">{notFound.sub}</p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-l-accent px-6 py-3 text-sm font-semibold text-l-bg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text motion-reduce:transition-none"
        >
          {notFound.cta} →
        </Link>
      </div>
    </div>
  );
}

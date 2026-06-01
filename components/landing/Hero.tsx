import Link from "next/link";
import HeroPhone from "./HeroPhone";

// Arrow used on the primary CTAs.
function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path
        d="M3 7H11M11 7L7 3M11 7L7 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Hero() {
  return (
    <section className="l-glow-accent relative z-[1] mx-auto grid min-h-[88vh] max-w-[1280px] grid-cols-1 items-center gap-14 px-6 pt-16 pb-24 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
      <div className="l-fade-up">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-l-accent-soft bg-l-accent-dim px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-l-accent">
          <span className="l-pulse h-1.5 w-1.5 rounded-full bg-l-accent shadow-[0_0_8px_var(--color-l-accent)]" />
          The universal college fitness platform
        </div>

        <h1 className="mb-5 font-display text-[clamp(44px,7.2vw,88px)] font-normal leading-[0.98] tracking-tight text-l-text">
          Your campus.
          <br />
          Your gym.
          <br />
          <em className="italic text-l-accent">Your people.</em>
        </h1>

        <p className="mb-6 font-mono text-xs uppercase tracking-wider text-l-text-3">
          For every student. <span className="text-l-text-2">With a dedicated mode for varsity athletes.</span>
        </p>

        <p className="mb-10 max-w-[500px] text-[19px] leading-relaxed tracking-tight text-l-text-2">
          Discover every gym on campus. Find a verified training partner. Log every session. Join
          the community that&apos;s already there — plus a gated mode built for varsity teams.
        </p>

        <div className="mb-12 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          <Link
            href="/login"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-l-accent px-7 py-4 text-[15px] font-medium tracking-tight text-l-text transition-transform hover:-translate-y-0.5"
          >
            Get started with .edu
            <Arrow className="transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#how"
            className="px-2 py-4 text-center text-[15px] text-l-text-2 transition-colors hover:text-l-text"
          >
            See how it works →
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-l-border pt-7 font-mono text-xs tracking-wide text-l-text-3">
          <span className="uppercase">Starting at</span>
          <span className="text-l-text-2">
            Harvard <span className="text-l-text-3">·</span> Yale{" "}
            <span className="text-l-text-3">·</span> MIT <span className="text-l-text-3">·</span>{" "}
            Princeton
          </span>
        </div>
      </div>

      <div className="flex justify-center lg:justify-end">
        <HeroPhone />
      </div>
    </section>
  );
}

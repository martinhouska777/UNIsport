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
          Discover every gym on campus. Find a verified training partner. Log every session. See
          where you rank — plus a gated mode built for varsity teams.
        </p>

        {/* Two ways to look around, because there are two apps in here. The
            mode buttons currently jump to the static sections; once the scroll
            stories land they re-point at those instead. */}
        <div className="mb-12 flex flex-col items-stretch gap-4">
          <Link
            href="/login"
            className="group inline-flex items-center justify-center gap-2 self-start rounded-full bg-l-accent px-7 py-4 text-[15px] font-medium tracking-tight text-l-text transition-transform hover:-translate-y-0.5"
          >
            Get started with .edu
            <Arrow className="transition-transform group-hover:translate-x-1" />
          </Link>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <a
              href="#platform"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-l-border px-5 py-3 text-[14px] tracking-tight text-l-text-2 transition-colors hover:border-l-border-hover hover:text-l-text"
            >
              See the student app
              <Arrow className="transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#varsity"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-l-varsity-soft px-5 py-3 text-[14px] tracking-tight text-l-varsity transition-colors hover:border-l-varsity hover:bg-l-varsity-dim"
            >
              See Varsity Mode
              <Arrow className="transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>

        {/* The other way in. A rower usually arrives here holding a link from
            their captain, and shouldn't have to scroll to find where it goes. */}
        <p className="-mt-6 mb-12 text-[14px] text-l-text-3">
          Got a link from your team?{" "}
          <Link
            href="/join"
            className="font-medium text-l-varsity underline-offset-4 transition-colors hover:underline"
          >
            Join with your invite →
          </Link>
        </p>

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

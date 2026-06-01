import Link from "next/link";
import VarsityPhone from "./VarsityPhone";

// Deep-dive on Varsity Mode — gold accent throughout, distinct from the blue
// student sections. The CTA leads to the Varsity entry (/join).
const POINTS: { lead: string; tail: string }[] = [
  { lead: "Captain-approved access to your team's hub", tail: " — one tap, then unlocked." },
  { lead: "Lineup builder and daily training plan", tail: " — published instantly to every athlete." },
  { lead: "AI session logging from a single photo", tail: " — Concept 2, RP3, or watch upload." },
  { lead: "Permanent record for PRs, seat races, and injuries", tail: " — institutional memory, finally." },
];

export default function VarsitySection() {
  return (
    <section className="relative z-[1] overflow-hidden border-y border-l-border bg-[radial-gradient(ellipse_at_top_right,var(--color-l-varsity-dim)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(224,200,150,0.04)_0%,transparent_50%)] px-6 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
        <div>
          <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-l-varsity">
            <span className="h-px w-6 bg-l-varsity" />
            For varsity athletes
          </div>
          <h2 className="mb-5 font-display text-[clamp(34px,5.5vw,60px)] font-normal leading-[1.02] tracking-tight text-l-text">
            And a mode built for <em className="italic text-l-varsity">your sport.</em>
          </h2>
          <p className="mb-8 max-w-[520px] text-[18px] leading-relaxed text-l-text-2">
            Training plans, lineup builders, and performance data — replacing WhatsApp screenshots,
            Excel files, and lost notebooks with one tool athletes use every day. Gated by your team
            captain.
          </p>

          <div className="mb-9 flex flex-col gap-3.5">
            {POINTS.map((p) => (
              <div key={p.lead} className="flex items-start gap-3 text-[15px] leading-snug text-l-text">
                <span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-l-varsity shadow-[0_0_6px_var(--color-l-varsity)]" />
                <div>
                  {p.lead}
                  <span className="text-l-text-2">{p.tail}</span>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/join"
            className="group inline-flex items-center gap-2 rounded-full border border-l-varsity-soft px-6 py-3.5 text-sm font-medium text-l-varsity transition-colors hover:border-l-varsity hover:bg-l-varsity-dim"
          >
            Learn about Varsity Mode
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-1">
              <path
                d="M3 7H11M11 7L7 3M11 7L7 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          <p className="mt-6 font-mono text-[11px] tracking-wide text-l-text-3">
            Launching with Harvard Rowing <span className="text-l-text-2">·</span> Built to scale to
            every varsity sport
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <VarsityPhone />
        </div>
      </div>
    </section>
  );
}

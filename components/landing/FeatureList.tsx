import type { CSSProperties } from "react";
import Link from "next/link";
import FeatureIcon from "@/components/landing/FeatureIcon";
import SlideInRows from "@/components/landing/SlideInRows";
import type { FeatureCta, FeatureRow } from "@/lib/landingCopy";

/*
  The feature rows beside a closer — an icon and a title per row, a "+" that
  opens the detail. Native <details>, so it is keyboard-accessible and needs
  no script; the "+" turns into a "×" when open. The accent (blue or gold) is
  the section's --sa, set by the caller. Under the rows, the section's own
  way in — the same button as the hero for students, the invite for varsity.

  COLOUR ON THE WAY IN (owner, 2026-09-15: the varsity button "changes to
  yellow and has the same colour as the background"). The button is filled in
  the section's accent and labelled in --sa-ink, the label that ground can
  carry — near-white on the ink-blue, ink on the bronze, never the page's own
  background on a colour too light to hold it. Hovering it does not brighten
  the gold, which is where it was already too close to the page: it swaps to
  the page's ink with a pale label. Gold on charcoal is the pairing the mode is
  named after, it is the biggest change of state the palette can make, and it
  is one rule for both sections — the blue darkens the same way.

  The six rows had no hover at all. They take the page's lavender-grey block
  colour, one step deeper than the icon tiles so the tiles still read, and the
  "+" darkens to ink. Deliberately NOT a gold wash: a tint that faint is the
  background again.
*/
/* `ink`: the varsity way in — bright gold with black letters, black with gold
   on hover (owner, 2026-09-17). */
export default function FeatureList({ kicker, rows, cta, ink = false }: { kicker: string; rows: FeatureRow[]; cta?: FeatureCta; ink?: boolean }) {
  return (
    <div className="w-full max-w-[520px]">
      <div className="mb-3 font-mono text-[11px] tracking-[0.14em] uppercase text-(--sa)">{kicker}</div>
      {/* The rows slide in from the left, one after another (SlideInRows). */}
      <SlideInRows className="divide-y divide-l-line border-y border-l-line">
        {rows.map((r, i) => (
          <li key={r.title} style={{ "--i": i } as CSSProperties}>
            <details className="group">
              <summary className="-mx-2 flex cursor-pointer list-none items-center gap-4 rounded-lg px-2 py-3.5 text-left transition-colors hover:bg-l-surface [&::-webkit-details-marker]:hidden">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-l-line bg-l-bg-elevated text-(--sa)">
                  <FeatureIcon name={r.icon} />
                </span>
                <span className="flex-1 font-display text-[clamp(19px,1.8vw,23px)] leading-tight tracking-tight text-l-text">
                  {r.title}
                </span>
                <span
                  aria-hidden
                  className="relative h-5 w-5 flex-none text-l-text-2 transition-[transform,color] duration-300 group-hover:text-l-text group-open:rotate-45 group-open:text-(--sa)"
                >
                  <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
                  <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current" />
                </span>
              </summary>
              <p className="max-w-[46ch] pb-4 pl-[52px] text-[14px] leading-[1.6] text-l-text-2">{r.detail}</p>
            </details>
          </li>
        ))}
      </SlideInRows>
      {cta && (
        <Link
          href={cta.href}
          className={`mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 l-lift text-[14px] font-semibold tracking-tight transition-[transform,background-color,color] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text motion-reduce:transition-none ${
            ink ? "bg-l-varsity-glow text-l-text hover:bg-l-text hover:text-l-varsity-glow" : "bg-(--sa) text-(--sa-ink) hover:bg-l-text hover:text-l-bg"
          }`}
        >
          {cta.label} →
        </Link>
      )}
    </div>
  );
}

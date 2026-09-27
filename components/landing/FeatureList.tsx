import type { CSSProperties } from "react";
import Link from "next/link";
import FeatureIcon from "@/components/landing/FeatureIcon";
import SlideInRows from "@/components/landing/SlideInRows";
import type { FeatureCta, FeatureGroup, FeatureRow } from "@/lib/landingCopy";

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
   on hover (owner, 2026-09-17).

   `coming`: what is built but not out yet, under its own kicker below the
   rows (owner, 2026-09-27: "that will be like upcoming, and there will be the
   feed there"). Same rows, same "+"; the kicker and the icon tile are drawn in
   the quiet grey with a dashed edge, so the list reads as two halves — what
   the app does today, and what is on its way.

   SHORT LAPTOPS. From 1280px wide the list shares a screen-high pinned stage
   with the phone, and the stage clips what does not fit. Nine rows plus the
   second kicker fill a 768px-high window, and a 720px one lost the top and the
   button, so on a window under 800px high every row sits a little tighter.

   ONE ROW OPEN AT A TIME, AND THE LIST ONLY GROWS DOWN (launch audit
   2026-09-27, item 37). The list used to sit centred beside the phone, so an
   open row pushed the kicker off the top of that pinned stage and the button
   off the bottom, and scrolling could not bring them back — two open rows did
   it even on a 1440x900 screen. Now the rows share one `name`, which is the
   browser's own "opening one closes the other", and CloserSplit hangs the
   list from the top of the piece, so opening a row moves nothing above it.
   The room that leaves is budgeted here: from xl up the rows' padding follows
   the window's height (about 6px at 720 high, the full 14px from 900), and the open
   detail runs the list's full width so the longest one (Leaderboards) is four
   lines, not six. Checked with the longest row open at 1280x720, 1366x768,
   1440x900 and 1536x864: the kicker and the button stay on screen. */
export default function FeatureList({
  kicker,
  rows,
  coming,
  cta,
  ink = false,
}: {
  kicker: string;
  rows: FeatureRow[];
  coming?: FeatureGroup;
  cta?: FeatureCta;
  ink?: boolean;
}) {
  /* The group every row of this list belongs to — one per list, so opening a
     varsity row never closes a student one. */
  const group = `features-${kicker.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="w-full max-w-[520px]">
      <div className="mb-3 font-mono text-[11px] tracking-[0.14em] uppercase text-(--sa)">{kicker}</div>
      {/* The rows slide in from the left, one after another (SlideInRows). */}
      <SlideInRows className="divide-y divide-l-line border-y border-l-line">
        {rows.map((r, i) => (
          <Row key={r.title} r={r} i={i} group={group} />
        ))}
      </SlideInRows>
      {coming && coming.rows.length > 0 && (
        <>
          <div className="mt-6 mb-3 font-mono text-[11px] tracking-[0.14em] uppercase text-l-text-2 xl:[@media(max-height:800px)]:mt-3">{coming.kicker}</div>
          {/* The stagger carries on from the rows above, so when both lists
              arrive together they come in as one run. */}
          <SlideInRows className="divide-y divide-l-line border-y border-l-line">
            {coming.rows.map((r, i) => (
              <Row key={r.title} r={r} i={rows.length + i} group={group} upcoming />
            ))}
          </SlideInRows>
        </>
      )}
      {cta && (
        <Link
          href={cta.href}
          className={`mt-5 xl:[@media(max-height:800px)]:mt-3 inline-flex items-center gap-2 rounded-full px-6 py-3 l-lift text-[14px] font-semibold tracking-tight transition-[transform,background-color,color] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text motion-reduce:transition-none ${
            ink ? "bg-l-varsity-glow text-l-text hover:bg-l-text hover:text-l-varsity-glow" : "bg-(--sa) text-(--sa-ink) hover:bg-l-text hover:text-l-bg"
          }`}
        >
          {cta.label} →
        </Link>
      )}
    </div>
  );
}

/* One row: the icon, the title, the "+" that opens the detail. */
function Row({ r, i, group, upcoming = false }: { r: FeatureRow; i: number; group: string; upcoming?: boolean }) {
  return (
    <li style={{ "--i": i } as CSSProperties}>
      <details name={group} className="group">
        <summary className="-mx-2 flex cursor-pointer list-none items-center gap-4 rounded-lg px-2 py-3.5 text-left xl:py-[clamp(5px,calc((100svh_-_600px)/21.4),14px)] transition-colors hover:bg-l-surface [&::-webkit-details-marker]:hidden">
          <span
            className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl border bg-l-bg-elevated ${
              upcoming ? "border-dashed border-l-text-2/50 text-l-text-2" : "border-l-line text-(--sa)"
            }`}
          >
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
        <p className="max-w-[46ch] pb-4 pl-[52px] text-[14px] leading-[1.6] text-l-text-2 xl:max-w-none xl:[@media(max-height:800px)]:pb-3 xl:[@media(max-height:800px)]:text-[13px] xl:[@media(max-height:800px)]:leading-[1.5]">{r.detail}</p>
      </details>
    </li>
  );
}

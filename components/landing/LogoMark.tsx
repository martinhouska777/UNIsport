/*
  THE MARK — the same drawing the app icon carries, as type-sized SVG.

  It is a U split down the middle so each half is one person: own leg, own
  head. That is the brand's first promise (meeting somebody), not a fitness
  symbol — deliberately no barbell, no dumbbell, no running figure.

  Every number below is COPIED from mockups/logo/_icons.mjs, which builds
  public/icons/* and app/favicon.ico from the same path data. If the mark ever
  changes, change it in BOTH places or the tab's favicon and the bar stop being
  the same logo.

  Colour follows rule 1 — tokens only, never a hex. The left person takes
  `currentColor`, so it inherits the caller's text colour; the right person
  sits in a <g> carrying the accent class. Those are the SAME two inks the
  wordmark beside it uses ("UN" in the tone, "sport" in the accent), which is
  what makes the pair read as one lockup rather than two logos.

  Sized in em so it scales with whatever font-size it is dropped into, and
  shifted so its feet sit on the type's baseline — the same trick the
  wordmark's barbell I uses (components/landing/Wordmark.tsx).
*/

/* The mark on its 100-unit box: heads at y 16 (r 8.5), legs from y 34 down to
   the join at y 82, stroke 14 with round caps. So the INK runs x 21..79 and
   y 7.5..89 — the viewBox below is cropped to the ink, not to the box, so the
   caller's gap is a real gap and not padding baked into the file. */
const X = 21, Y = 7.5, W = 58, H = 81.5;

const CAP_EM = 0.72;          // Instrument Serif italic's cap height, measured
const TALL = 1.2;             // the mark stands a touch taller than the capitals
const HEIGHT_EM = CAP_EM * TALL;
const WIDTH_EM = (HEIGHT_EM * W) / H;

export default function LogoMark({
  className = "",
  accentClassName = "text-l-accent",
}: {
  className?: string;
  accentClassName?: string;
}) {
  return (
    <svg
      viewBox={`${X} ${Y} ${W} ${H}`}
      width={`${WIDTH_EM.toFixed(4)}em`}
      height={`${HEIGHT_EM.toFixed(4)}em`}
      role="presentation"
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", verticalAlign: "baseline", overflow: "visible" }}
    >
      {/* the left person — the caller's own ink */}
      <path
        d="M28 34 V56 Q28 82 50 82 H51"
        fill="none"
        stroke="currentColor"
        strokeWidth={14}
        strokeLinecap="butt"
      />
      <circle cx={28} cy={16} r={8.5} fill="currentColor" />
      {/* the right person — the accent */}
      <g className={accentClassName}>
        <path
          d="M72 34 V56 Q72 82 50 82"
          fill="none"
          stroke="currentColor"
          strokeWidth={14}
          strokeLinecap="butt"
        />
        <circle cx={72} cy={16} r={8.5} fill="currentColor" />
      </g>
    </svg>
  );
}

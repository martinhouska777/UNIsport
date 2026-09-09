"use client";

/*
  THE MEDAL — first, second and third, drawn as the thing they are.
  ---------------------------------------------------------------------------
  The top three used to be a number in a coloured rounded square. It said the
  rank, but it said it the way row eleven says it, in a different colour. A
  medal is the one picture everybody on earth already reads without being told,
  so the number now sits on one.

  DRAWN FROM THE OWNER'S TWO REFERENCE SHEETS (2026-09-09): a flat disc with a
  darker rim and a lighter face, one diagonal gloss across it, the number
  stamped in the middle, and the ribbon hanging BELOW in two notched tails.
  The photoreal version in the other reference — laurel wreath, crown, brushed
  metal — is a poster at 2000px and mud at 28, so the shapes that survive the
  size are the ones kept: rim, face, gloss, ribbon, number.

  COLOURS are tokens (`--podium-1..3`, `--podium-ink`, `--medal-*` in
  globals.css) — gold, silver and bronze, the only colours in the app a school
  doesn't get to change (see Podium.tsx), and variables rather than hexes typed
  in here (rule 1). The rim and gloss are the metal itself darkened and lifted
  with ink and shine over it, so all three medals are one drawing.

  The number is SVG text, so it scales with the medal instead of being
  positioned on top of it, and it inherits the app's font.
*/
import { useId } from "react";

const METAL: Record<1 | 2 | 3, string> = {
  1: "text-podium-1",
  2: "text-podium-2",
  3: "text-podium-3",
};

export default function Medal({
  /** Which medal it is — gold, silver, bronze. */
  place,
  /*
    The number stamped on it. Usually the place; NOT when two are level, where
    two golds are both 1st and the next one is 3rd (see Podium.tsx).
  */
  rank,
  /** WIDTH in px. The medal is taller than it is wide — the ribbon hangs. */
  size = 28,
}: {
  place: 1 | 2 | 3;
  rank: number;
  size?: number;
}) {
  // The gloss is clipped to the face, and a page can hold a dozen medals, so
  // the clip needs an id of its own rather than a shared one.
  const clip = `medal-face-${useId().replace(/:/g, "")}`;

  return (
    <span
      className={`inline-flex flex-shrink-0 ${METAL[place]}`}
      role="img"
      aria-label={`Rank ${rank}`}
    >
      <svg
        width={size}
        height={(size * 30) / 24}
        viewBox="0 0 24 30"
        fill="none"
        aria-hidden="true"
      >
        {/* THE RIBBON, behind the disc: two tails, each notched at the foot,
            with the fold between them in the darker red. */}
        <path d="M11.4 13.5v15.6l-4.3-3.4-4.2 3.4V19z" fill="var(--medal-ribbon)" />
        <path d="M12.6 13.5v15.6l4.3-3.4 4.2 3.4V19z" fill="var(--medal-ribbon)" />
        <path d="M10.9 13.5h2.2v13.1l-1.1-1.4-1.1 1.4z" fill="var(--medal-ribbon-shade)" />

        {/*
          THE DISC, in the reference's three layers: the metal, the whole disc
          darkened so the RIM reads as a rim, then the face put back to full
          metal and lifted a little. Done this way round rather than with a
          bright outline, because the medal has to separate from a pedestal
          block painted in the very same metal.
        */}
        <circle cx="12" cy="11.3" r="9.3" fill="currentColor" />
        <circle
          cx="12"
          cy="11.3"
          r="9.3"
          fill="var(--podium-ink)"
          fillOpacity={0.22}
        />
        <circle cx="12" cy="11.3" r="7.6" fill="currentColor" />
        <circle cx="12" cy="11.3" r="7.6" fill="var(--medal-shine)" fillOpacity={0.14} />

        {/* THE GLOSS — one diagonal band across the face, as in the reference. */}
        <clipPath id={clip}>
          <circle cx="12" cy="11.3" r="7.6" />
        </clipPath>
        <g clipPath={`url(#${clip})`}>
          <path
            d="M-2 14.5L10.5 2h4.2L2.2 14.5z"
            fill="var(--medal-shine)"
            fillOpacity={0.22}
          />
          <path
            d="M4.6 20.5L23 2h2.4L7 20.5z"
            fill="var(--medal-shine)"
            fillOpacity={0.22}
          />
        </g>

        {/* THE PLACE, stamped on the face. */}
        <text
          x="12"
          y="11.6"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="10"
          fontWeight="700"
          fontFamily="inherit"
          fill="var(--podium-ink)"
          fillOpacity={0.82}
        >
          {rank}
        </text>
      </svg>
    </span>
  );
}

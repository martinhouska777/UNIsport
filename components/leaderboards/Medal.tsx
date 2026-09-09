/*
  THE MEDAL — first, second and third, drawn as the thing they are.
  ---------------------------------------------------------------------------
  The top three used to be a number in a coloured rounded square. It said the
  rank, but it said it the way row eleven says it, in a different colour. A
  medal is the one picture everybody on earth already reads without being told,
  so the number now sits inside one: ribbon, disc, and the place stamped in the
  middle.

  COLOURS are the podium tokens (`--podium-1..3`, `--podium-ink` in
  globals.css) — gold, silver and bronze, the only colours in the app a school
  doesn't get to change (see Podium.tsx), and still variables rather than three
  hexes typed in here (rule 1).

  The number is drawn as SVG text so it scales with the medal instead of being
  positioned on top of it, and it inherits the app's font.
*/
const DISC: Record<1 | 2 | 3, string> = {
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
  size = 28,
}: {
  place: 1 | 2 | 3;
  rank: number;
  size?: number;
}) {
  return (
    <span
      className={`inline-flex flex-shrink-0 ${DISC[place]}`}
      role="img"
      aria-label={`Rank ${rank}`}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {/* The ribbon, hanging off the top edge. */}
        <path
          d="M8.2 2.2l2.5 6.1M15.8 2.2l-2.5 6.1"
          stroke="currentColor"
          strokeOpacity={0.55}
          strokeWidth={2.8}
          strokeLinecap="round"
        />
        <circle cx="12" cy="15.1" r="6.8" fill="currentColor" />
        {/* A hairline rim, so a silver medal has an edge on a light page. */}
        <circle
          cx="12"
          cy="15.1"
          r="6.8"
          fill="none"
          stroke="var(--podium-ink)"
          strokeOpacity={0.25}
          strokeWidth={1}
        />
        <text
          x="12"
          y="15.1"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8.6"
          fontWeight="700"
          fontFamily="inherit"
          fill="var(--podium-ink)"
        >
          {rank}
        </text>
      </svg>
    </span>
  );
}

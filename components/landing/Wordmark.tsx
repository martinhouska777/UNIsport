/*
  THE WORDMARK — one mark, every size. Written once here so no two copies of
  it can drift apart.

  The I is an Olympic bar. It is the letter first: the plates sit exactly where
  the serifs of Instrument Serif's italic I sit — on the cap line and on the
  baseline — only thicker. What makes it a barbell is that the shaft carries on
  past each plate, the way a sleeve does.

  Every number below was MEASURED off Instrument Serif italic rather than
  guessed (see mockups/logo/round8..round10): cap height 0.720em, stem 0.068em,
  slant 13.1 degrees. The shaft is 0.90 of the letter's own stem. Because the
  mark borrows the face's numbers, it only holds in THIS face — `font-display`
  italic. A caller that sets a different family will get a bar that no longer
  matches its letters.

  Sizes are in em, so the bar scales with font-size and never has to be redrawn.

  Colour follows rule 1 — tokens only, never a hex. The shaft takes
  `currentColor`, so it inherits whatever the wordmark's text colour is
  (including reversed on a dark ground). The plates sit inside a <g> carrying
  the accent class, so `fill="currentColor"` there resolves to the accent —
  which is why the caller can hand the mark a different accent per surface
  rather than the mark deciding.

  The side bearings are measured too: the bar clears the ink either side by the
  same amount, checked in pixels by mockups/logo/_touchcheck.mjs. The contact
  was always on the N side; the right needed pulling IN, not pushing out.
*/

/* Drawing box. 140 units is the cap height, 15 above and 15 below is the
   sleeve showing past the plates. */
const BOX_H = 170, CAP_TOP = 15, BASE = 155, CAP_H = 140;
const STEM = 11.9;                 // 0.90 of the face's own stem, in box units
const STUB = 9;                    // how far the shaft shows past each plate
const PLATE_W = STEM * 3.2;        // the face's serif is 2.4x the stem; this reads as one, thickened
const PLATE_H = STEM * 1.45;
const BOX_W = PLATE_W * 1.18;      // the box is the plate's own width; the lean overflows it, as an italic does
const CX = BOX_W / 2;

const CAP_EM = 0.72;               // Instrument Serif italic, measured
const SLANT = 13.1;

const HEIGHT_EM = (CAP_EM * BOX_H) / CAP_H;
const WIDTH_EM = (HEIGHT_EM * BOX_W) / BOX_H;
const SHIFT_EM = ((BOX_H - BASE) / CAP_H) * CAP_EM;   // sit the letter's baseline on the text baseline

function BarbellI({ accentClassName }: { accentClassName: string }) {
  return (
    <svg
      viewBox={`0 0 ${BOX_W.toFixed(2)} ${BOX_H}`}
      width={`${WIDTH_EM.toFixed(4)}em`}
      height={`${HEIGHT_EM.toFixed(4)}em`}
      role="presentation"
      aria-hidden="true"
      style={{
        display: "inline-block",
        verticalAlign: "baseline",
        transform: `translateY(${SHIFT_EM.toFixed(4)}em)`,
        marginLeft: "0.05em",
        marginRight: "-0.035em",
        overflow: "visible",
      }}
    >
      <g transform={`rotate(${SLANT} ${CX.toFixed(2)} ${(CAP_TOP + BASE) / 2})`}>
        {/* the shaft, sleeve to sleeve */}
        <rect
          x={(CX - STEM / 2).toFixed(2)}
          y={CAP_TOP - STUB}
          width={STEM.toFixed(2)}
          height={CAP_H + STUB * 2}
          rx={(STEM * 0.12).toFixed(2)}
          fill="currentColor"
        />
        {/* one plate a side, where the serifs would be */}
        <g className={accentClassName}>
          <rect
            x={(CX - PLATE_W / 2).toFixed(2)}
            y={CAP_TOP}
            width={PLATE_W.toFixed(2)}
            height={PLATE_H.toFixed(2)}
            rx={(PLATE_H * 0.22).toFixed(2)}
            fill="currentColor"
          />
          <rect
            x={(CX - PLATE_W / 2).toFixed(2)}
            y={(BASE - PLATE_H).toFixed(2)}
            width={PLATE_W.toFixed(2)}
            height={PLATE_H.toFixed(2)}
            rx={(PLATE_H * 0.22).toFixed(2)}
            fill="currentColor"
          />
        </g>
      </g>
    </svg>
  );
}

export default function Wordmark({
  className = "",
  toneClassName = "text-l-text",
  accentClassName = "text-l-accent",
}: {
  className?: string;
  /* The first half's colour. Zone 1 tokens by default; the app's side rail
     hands it Zone 2's own, because two colour systems never share a token. */
  toneClassName?: string;
  accentClassName?: string;
}) {
  return (
    <span className={`font-display italic tracking-tight ${toneClassName} ${className}`}>
      {/* The name is spelled out for anything that reads the page aloud or
          indexes it; the drawn I is marked decorative above. */}
      <span className="sr-only">UNIsport</span>
      <span aria-hidden="true">
        UN
        <BarbellI accentClassName={accentClassName} />
        <span className={accentClassName}>sport</span>
      </span>
    </span>
  );
}

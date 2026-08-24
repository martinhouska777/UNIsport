"use client";

/*
  The VARSITY MODE mark: two oars crossed behind the shield.

  This is THE LAST FRAME OF THE ENTRY ANIMATION (VarsityIntro), frozen into an
  icon — not a second drawing that merely resembles it. Everything the intro
  lays out on its 320×320 stage is repeated here at the same numbers: the same
  oars (OarMark, the landing page's oar with the school's own blade), the same
  ±32° cross, the same 41×250 size, and the university shield at the same 92px
  sitting the same 86px down the stage. The only difference is the FRAME: the
  stage is cropped to the drawing so the mark has no dead margin, and the
  cropping runs far enough up the shafts to leave the shield — the H — in the
  middle of the mark. Nothing is redrawn or re-angled; the film's last frame is
  simply framed like a badge.

  The crest on its own (UniversityCrest) is the university's mark and stands for
  the normal student app; this one, with the oars, stands for Varsity Mode.

  Colours: the crest keeps its theme tokens (primary = crimson field, primary-
  contrast = the border and the letter), so the mark re-skins with the theme and
  hardcodes nothing (rule 1); the blade colours are the school's, from data.
*/
import type { CSSProperties } from "react";
import { useAppState } from "@/components/AppState";
import OarMark from "@/components/varsity/OarMark";
import SchoolCrest from "@/components/SchoolCrest";
import { crestFor } from "@/lib/crests";

/* The intro's stage and everything on it, in the intro's own pixels. Change a
   number in VarsityIntro and it has to change here too — they are one pose. */
const STAGE = 320; // the intro's h-[320px] w-[320px] box
const OAR_W = 41; // <OarMark width={41} height={250} />, centred on the stage
const OAR_H = 250;
const OAR_DEG = 32; // rotate-[±32deg], about the stage's centre
const SHIELD = 92; // <UniversityCrest size={92} />
const SHIELD_TOP = 86; // its top-[86px]; horizontally centred

/* The crop. Worked out, not eyeballed.

   SIDEWAYS it is the drawing's own bounding box, plus a hair: the oar paints
   from x 44.3 to 149.6 of OarMark's 160 box, so the painted rect turned ±32°
   about the centre reaches x 78.6 and 241.4 — both at the BLADES, up at y≈63,
   which is why cutting the bottom (below) doesn't change these two numbers.

   DOWNWARDS the drawing runs to y 275 (the handles), but the shield sits at
   89.5–174.5, so keeping all of it would hang the H high in the frame with a
   long tail of shaft under it. So the shafts are cut: the bottom edge is put
   as far below the shield as the blades reach above it, which centres the
   shield — and the H in it — in the mark. Left over is a stub of shaft under
   the shield, the same length as the blades standing over it. */
const CROP = { x: 76, y: 46, w: 168, h: 172 };

/** Width ÷ height of the mark, for anyone who needs to reserve room for it. */
export const CREST_RATIO = CROP.w / CROP.h;

/** `size` is the mark's HEIGHT; the width follows from the crop. */
export default function VarsityCrest({ size = 28 }: { size?: number }) {
  const { universityKey } = useAppState();
  // The drawn crest (lib/crests.ts) is a 100×116 box, sized by its height.
  const crestW = (SHIELD * 100) / 116;

  return (
    <svg
      width={size * CREST_RATIO}
      height={size}
      viewBox={`${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}`}
      fill="none"
      aria-hidden="true"
      style={
        {
          // The crest wears the theme's pair, like everything in Zone 2.
          "--crest-field": "var(--primary)",
          "--crest-mark": "var(--primary-contrast)",
        } as CSSProperties
      }
    >
      {[-OAR_DEG, OAR_DEG].map((deg) => (
        <g key={deg} transform={`rotate(${deg} ${STAGE / 2} ${STAGE / 2})`}>
          <OarMark
            schoolKey={universityKey}
            x={(STAGE - OAR_W) / 2}
            y={(STAGE - OAR_H) / 2}
            width={OAR_W}
            height={OAR_H}
          />
        </g>
      ))}

      {/* The crest, over the crossing — the DRAWN one (Campus Crests compact
          cut), nested at the same spot and height the intro drops it onto. */}
      <SchoolCrest
        crest={crestFor(universityKey)}
        x={(STAGE - crestW) / 2}
        y={SHIELD_TOP}
        width={crestW}
        height={SHIELD}
      />
    </svg>
  );
}

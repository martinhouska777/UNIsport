"use client";

/*
  ONE OAR, UPRIGHT — the landing page's oar (the Blade Lock closer's drawing),
  stood on end: dark handle, shaft and collar, and the school's own blade from
  lib/landingSchools.ts (Harvard's crimson with the two white wedges). Drawn
  in a 160×980 box, blade at the top.

  Used by the Varsity Mode intro (the two oars sweeping in) and by the Varsity
  Mode mark (VarsityCrest, the two crossed behind the shield), so the emblem
  and the animation are the same drawing at two sizes.

  Colours: the data file's illustration colours applied inline (rule 1's
  content exception); a school without a blade drawing gets a plain blade in
  the theme's primary. The clip-path id is per instance (useId), so several
  marks on one page never share one.

  `bold` swaps the palette for OAR_ART_BOLD — the loom in the school's colour
  with a black line round it — for the one place the oar has to read at arm's
  length on a dark ground: the Varsity intro's crossed oars. Everywhere else
  it is the real oar, dark loom and all.
*/
import { useId } from "react";
import { BLADE_PATH, OAR_ART, OAR_ART_BOLD, schools } from "@/lib/landingSchools";

export const OAR_BOX = { w: 160, h: 980 };

export default function OarMark({
  schoolKey,
  bold = false,
  ...svgProps
}: { schoolKey: string; bold?: boolean } & Omit<
  React.SVGProps<SVGSVGElement>,
  "viewBox" | "children"
>) {
  const s = schools.find((x) => x.key === schoolKey);
  const art = bold ? OAR_ART_BOLD : OAR_ART;
  // A border you can see, but still a thin one — the owner asked for SMALL
  // black borders, not an outline drawing.
  const line = bold ? 2 : 1;
  const clip = `oar-blade-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox={`0 0 ${OAR_BOX.w} ${OAR_BOX.h}`} fill="none" aria-hidden="true" {...svgProps}>
      <defs>
        <clipPath id={clip}>
          <path d={BLADE_PATH} />
        </clipPath>
      </defs>
      {/* the landing draws it lying down (handle at x=0, tip at x=980):
          (x, y) ↦ (y, 980 − x) stands it up, tip at the top */}
      <g transform="translate(0,980) rotate(-90)">
        <rect x="2" y="72" width="150" height="16" rx="6" fill={art.handle} stroke={art.line} strokeWidth={line} />
        <rect x="146" y="75" width="642" height="10" rx="4" fill={art.shaft} stroke={art.line} strokeWidth={line} />
        <rect x="784" y="67" width="22" height="26" rx="3" fill={art.collar} stroke={art.line} strokeWidth={line} />
        <g transform="translate(280,0) translate(700,95) scale(1.30) translate(-700,-95)">
          {s ? (
            <g clipPath={`url(#${clip})`}>
              <rect x="518" y="44" width="188" height="100" fill={s.blade.base} />
              {s.blade.marks.map((m, k) =>
                m.kind === "polygon" ? (
                  <polygon key={k} points={m.points} fill={m.fill} />
                ) : m.kind === "path" ? (
                  <path key={k} d={m.d} fill={m.fill} />
                ) : m.kind === "rect" ? (
                  <rect key={k} x={m.x} y={m.y} width={m.w} height={m.h} fill={m.fill} />
                ) : (
                  <circle key={k} cx={m.cx} cy={m.cy} r={m.r} fill={m.fill} />
                ),
              )}
            </g>
          ) : (
            <path d={BLADE_PATH} fill="var(--primary)" />
          )}
          <path d={BLADE_PATH} fill="none" stroke={art.outline} strokeWidth={bold ? 2.5 : 1.5} />
        </g>
      </g>
    </svg>
  );
}

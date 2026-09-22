"use client";

/*
  WHICH LINE IS WHICH.
  ---------------------------------------------------------------------------
  A graph that draws three curves at once needs their names, and a name beside
  its own colour is the whole legend. Nothing else goes here: not what the
  scale is, not what a high number means. Each check-in question already
  carries the words for its own two ends where it is answered, and a caption
  explaining a picture is the thing this app keeps cutting.

  Used by the profile's graph card and by the statistics full screen, so the
  small one and the big one can never label the same curve differently.

  The curve's data says a TONE — a word — and this maps it to a theme token
  (rule 1). The data never names a colour.
*/
import type { PlotCurve } from "@/components/varsity/profile/Plot";

const curveDot: Record<PlotCurve["tone"], string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  warn: "bg-warn",
};

export function CurveLegend({ curves }: { curves: PlotCurve[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 px-1 pt-2">
      {curves.map((c) => (
        <span key={c.key} className="flex items-center gap-1.5 text-[11px] text-text-2">
          <span className={`h-2 w-2 flex-shrink-0 rounded-full ${curveDot[c.tone]}`} />
          {c.label}
        </span>
      ))}
    </div>
  );
}

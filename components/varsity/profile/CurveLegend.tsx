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

  The curve's data says WHICH SERIES it is — first, second, third — and this
  maps that to the token. The three colours themselves (blue, yellow, green)
  live in app/globals.css and are deliberately not part of any school's theme,
  because three lines a rower has to tell apart cannot be three shades of
  whatever the crest is (rule 1). The data never names a colour.
*/
import type { PlotCurve } from "@/components/varsity/profile/Plot";

/* Exported so the day read out under the graph can put each answer beside
   the very dot its curve is drawn in. */
export const curveDot: Record<PlotCurve["tone"], string> = {
  "series-1": "bg-series-1",
  "series-2": "bg-series-2",
  "series-3": "bg-series-3",
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

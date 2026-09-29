import type { CSSProperties, ReactNode } from "react";

/*
  A closer with something beside it — the feature rows on the left, the piece
  on the right (≥1280px); the piece first and the rows under it on one column.
  Without an aside, the piece simply stands alone, centred. The aside gets the
  story's accent as --sa (blue for students, gold for varsity).

  THE SPLIT NEEDS 1280px, not the 1024 it used to have (owner, 2026-09-03 —
  "the animations broke, mainly when I have only half the screen"). The piece
  column takes its whole 720px before the rows get anything, and the piece
  cannot go below ~570px itself (phone 270 + gap 60 + the letter's 240 min).
  So at 1024 the rows were left 192px and at 1100 a measured 253px — a 520px
  list crushed to half — and they only reached their designed width around
  1370. Below xl the piece stands alone with the rows under it, the layout
  that always worked.

  StoryCloser's FLIES_MQ must stay on this same 1280: it decides both the
  flight and the pinned screen-height stage, and a pinned stage wrapped around
  one tall column clips it.

  THE ROWS HANG FROM THE TOP (launch audit 2026-09-27, item 37). Both columns
  used to be centred, so a "+" that opened a row grew the list up AND down and
  the pinned stage cut off its kicker and its button. Now both columns start
  at the top, and inside a pinned stage (.lc-pinned) the list is laid over its
  column instead of in it: the row's height is the piece's alone, so opening a
  feature row can neither move the list's top nor re-centre the whole split.
  Unpinned (reduced motion, or under 1280) the list is in the flow as before.
  The overlaid list is also given the column's bottom edge, so a list that asks
  for it (FeatureList `fill`) can stretch to the piece's full height; one that
  does not simply ignores the room.
*/
export default function CloserSplit({
  aside,
  accent,
  children,
}: {
  aside?: ReactNode;
  accent: "accent" | "varsity";
  children: ReactNode;
}) {
  if (!aside) return <>{children}</>;
  return (
    <div className="grid w-full max-w-[1280px] items-center gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,720px)] xl:items-start">
      <div
        className="order-2 flex justify-center xl:relative xl:order-1 xl:self-stretch xl:justify-start"
        style={
          {
            "--sa": `var(--color-l-${accent})`,
            "--sa-ink": `var(--color-l-${accent}-ink)`,
          } as CSSProperties
        }
      >
        <div className="flex w-full justify-center xl:justify-start xl:[.lc-pinned_&]:absolute xl:[.lc-pinned_&]:inset-x-0 xl:[.lc-pinned_&]:top-0 xl:[.lc-pinned_&]:bottom-0">
          {aside}
        </div>
      </div>
      <div className="order-1 flex flex-col items-center xl:order-2">{children}</div>
    </div>
  );
}

import type { CSSProperties, ReactNode } from "react";

/*
  A closer with something beside it — the feature rows on the left, the piece
  on the right (≥1024px); the piece first and the rows under it on one column.
  Without an aside, the piece simply stands alone, centred. The aside gets the
  story's accent as --sa (blue for students, gold for varsity).
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
    <div className="grid w-full max-w-[1280px] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,720px)]">
      <div
        className="order-2 flex justify-center lg:order-1 lg:justify-start"
        style={{ "--sa": `var(--color-l-${accent})` } as CSSProperties}
      >
        {aside}
      </div>
      <div className="order-1 flex flex-col items-center lg:order-2">{children}</div>
    </div>
  );
}

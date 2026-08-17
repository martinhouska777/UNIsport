/*
  THE SECTION LABEL.
  ------------------------------------------------------------------
  The small uppercase heading above a block — "TODAY'S SESSIONS", "TRAINING",
  "RATINGS BREAKDOWN". There were more than ten versions of it: 9px and 10px,
  medium and semibold, and letter-spacing anywhere from 0.06em to 0.16em, so the
  same kind of heading looked different on adjacent screens.

  One version now, and it sits at 11px — the legibility floor. Anything smaller
  is decoration pretending to be a heading.

  Use `sectionLabel` when the element needs its own layout classes alongside;
  use <SectionLabel> when it doesn't.
*/
export const sectionLabel =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-muted";

export default function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`${sectionLabel} ${className}`.trim()}>{children}</div>;
}

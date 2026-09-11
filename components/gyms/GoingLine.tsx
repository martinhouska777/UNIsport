"use client";

/*
  "3 going tonight · 5pm, 7pm, 8:30pm" — the Buddy Board, one line long, on the
  place where people decide where to train. Tapping it opens the board narrowed
  to this gym, so the line is a door and not a statistic.

  Renders NOTHING when nobody has posted: a row of "0 going" across fifteen
  cards reads as "nobody uses this app". Colours are theme tokens; the number
  is in the school's colour because it is the one live fact on the card.
*/
import Link from "next/link";
import type { GoingSummary } from "@/lib/buddyBoard";
import { IconUser, IconChevronRight } from "@/components/icons";

/** The board, already narrowed to one gym. */
export const boardHref = (gymName: string) => `/match?gym=${encodeURIComponent(gymName)}`;

export default function GoingLine({
  going,
  gymName,
  compact = false,
}: {
  going: GoingSummary | null;
  gymName: string;
  /** On a card: one line, inside the card's own link (so it is a span, not a link). */
  compact?: boolean;
}) {
  if (!going) return null;
  const text = (
    <>
      <span className="font-medium text-primary">{going.headline}</span>
      {going.times && <span className="text-text-2"> · {going.times}</span>}
      {going.more > 0 && <span className="text-text-3"> · +{going.more} more this week</span>}
    </>
  );

  if (compact) {
    // Inside a card that is already a link — a nested <a> is not allowed, so
    // this is text; the whole card goes to the gym page, which has the door.
    return (
      <span className="flex items-center gap-1 text-xs">
        <span className="text-primary">
          <IconUser size={13} />
        </span>
        {text}
      </span>
    );
  }

  return (
    <Link
      href={boardHref(gymName)}
      className="tap44 flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[13px]"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-primary">
          <IconUser size={15} />
        </span>
        <span className="truncate">{text}</span>
      </span>
      <span className="flex-shrink-0 text-muted">
        <IconChevronRight size={15} />
      </span>
    </Link>
  );
}

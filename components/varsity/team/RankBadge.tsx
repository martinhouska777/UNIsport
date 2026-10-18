/*
  A PLACE, AS A ROUND BADGE — the race board's own (owner, 2026-09-27: the
  board "all grey / black"), shared so the coach's rankings number people the
  same way the water board numbers crews. The winner's badge is black; `faint`
  is a place that is not quite comparable with the rest (a crew that missed a
  piece). Theme tokens only.
*/
export default function RankBadge({ rank, faint = false }: { rank: number; faint?: boolean }) {
  return (
    <span
      className={`flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${
        rank === 1 && !faint ? "bg-text text-background" : faint ? "bg-surface-2 text-muted" : "bg-surface-2 text-text"
      }`}
    >
      {rank}
    </span>
  );
}

/* Literal class names, so the stylesheet keeps them. */
const METAL_FILL: Record<number, string> = { 1: "bg-podium-1", 2: "bg-podium-2", 3: "bg-podium-3" };

/*
  A PLACE ON A COACH SCREEN: 1, 2 and 3 on gold, silver and bronze with the
  number on them, the round badge above after that. Coach screens are plain
  lists, never medals (owner, 2026-09-27: "you can do a little bit more gold,
  but still 1, 2, 3. Don't put medals and other emojis there"; NO-SLOP 23).
*/
export function MetalRankBadge({ rank }: { rank: number }) {
  const fill = METAL_FILL[rank];
  if (!fill) return <RankBadge rank={rank} />;
  return (
    <span
      className={`flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums text-podium-ink ${fill}`}
    >
      {rank}
    </span>
  );
}

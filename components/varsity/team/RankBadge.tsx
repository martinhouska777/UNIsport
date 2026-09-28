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

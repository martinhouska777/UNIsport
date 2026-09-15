"use client";

/*
  CATEGORY STATS — tap a kind of training under the calendar (Water, Erg,
  Weights, Run, Bike) to see what it added up to this month.

  THREE NUMBERS AND ONE LINE, for every kind (owner, 2026-09-14: "I just want
  to see the three tabs — sessions, time, distance — and averaging per week in
  time and sessions … do it for everything"). The colour dot, the "across N
  days" line and the per-SESSION average are gone: a week is how training is
  planned and talked about, so the average is per week.

  Everything is computed from the logs the calendar has ALREADY loaded for the
  month on screen, so opening this costs nothing and the numbers can never
  disagree with the grid above it. Distance respects the person's km/miles
  setting (lib/varsity/units); the underlying logs stay in metres. A kind with
  nothing to measure (weights has no distance) shows a dash rather than "0 km".
*/
import Sheet from "@/components/varsity/Sheet";
import { type LogEntry } from "@/lib/varsity/logStore";
import { logCategoryLabel } from "@/lib/varsity/athleteProfile";
import { formatDistance, formatDuration, type Units } from "@/lib/varsity/units";

/* One number with its caption. */
function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-surface-2 px-3 py-3 text-center">
      <div className="text-lg font-semibold leading-none text-text">{value}</div>
      <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
    </div>
  );
}

// 2 -> "2", 2.25 -> "2.3". No trailing ".0".
const oneDecimal = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

export default function CategoryStatsSheet({
  category,
  monthLabel,
  weeks,
  logs,
  units,
  onClose,
}: {
  category: string;
  monthLabel: string;
  /** How many weeks of the month have happened — the whole month in the past,
      today's date / 7 in the current one — so an average is never divided by
      days still to come. */
  weeks: number;
  logs: LogEntry[]; // the whole month; filtered here
  units: Units;
  onClose: () => void;
}) {
  const mine = logs.filter((l) => (l.category ?? "other") === category);

  const sessions = mine.length;
  const minutes = mine.reduce((sum, l) => sum + (l.minutes ?? 0), 0);
  const metres = mine.reduce((sum, l) => sum + (l.metres ?? 0), 0);

  const label = logCategoryLabel[category] ?? category;
  const perWeek = sessions / weeks;

  return (
    <Sheet title={`${label} · ${monthLabel}`} onClose={onClose}>
      <div className="flex gap-2">
        <Tile value={String(sessions)} label={sessions === 1 ? "Session" : "Sessions"} />
        <Tile value={minutes > 0 ? formatDuration(minutes) : "—"} label="Time" />
        <Tile value={metres > 0 ? formatDistance(metres, units.distance) : "—"} label="Distance" />
      </div>

      {sessions > 0 && (
        <div className="mt-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-2.5 text-[12px] text-muted">
          Averaging{" "}
          <span className="font-semibold text-text">
            {oneDecimal(perWeek)} {perWeek === 1 ? "session" : "sessions"}
          </span>
          {minutes > 0 && (
            <>
              {" "}and{" "}
              <span className="font-semibold text-text">{formatDuration(Math.round(minutes / weeks))}</span>
            </>
          )}{" "}
          a week.
        </div>
      )}
    </Sheet>
  );
}

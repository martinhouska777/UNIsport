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
  setting (lib/varsity/units); the underlying logs stay in metres.

  A KIND THAT HAS NO DISTANCE HAS NO DISTANCE TILE (owner, 2026-09-27: "for
  weights there obviously won't be a distance, so just do two tabs: sessions
  and time"). It used to show a dash there. Flex is the same kind of session.

  AND THE SESSIONS THEMSELVES, under the numbers (owner, 2026-10-04: "když to
  rozkliknu, udělej konzistentní UI"): the month's sessions of that kind,
  newest first, in the very rows of a coach's Past workouts (LogRow) — the
  name, what was done, the day on the right — and a tap opens the session.
*/
import Sheet from "@/components/varsity/Sheet";
import LogRow from "@/components/varsity/coach/athlete/LogRow";
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

/* The kinds of training that are never measured in metres. */
const NO_DISTANCE = new Set(["weights", "flex"]);

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/* "Thu 1 Oct" — the sheet's title already says the year. */
const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${WD[new Date(y, m - 1, d).getDay()]} ${d} ${MO[m - 1]}`;
};

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
  colorOf,
  timeOf,
  onOpen,
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
  /** A session's colour, by the calendar's own rule. */
  colorOf: (l: LogEntry) => string;
  /** "7:00 AM", or AM / PM, under the day. */
  timeOf: (l: LogEntry) => string;
  /** Opens the session full screen. */
  onOpen: (l: LogEntry) => void;
  onClose: () => void;
}) {
  const mine = logs.filter((l) => (l.category ?? "other") === category);
  /* Newest first, and inside a day the order they were logged in. */
  const newest = mine
    .map((l, i) => ({ l, i }))
    .sort((a, b) => b.l.logDate.localeCompare(a.l.logDate) || a.i - b.i)
    .map(({ l }) => l);

  const sessions = mine.length;
  const minutes = mine.reduce((sum, l) => sum + (l.minutes ?? 0), 0);
  const metres = mine.reduce((sum, l) => sum + (l.metres ?? 0), 0);

  const label = logCategoryLabel[category] ?? category;
  const hasDistance = !NO_DISTANCE.has(category);
  const perWeek = sessions / weeks;

  return (
    <Sheet title={`${label} · ${monthLabel}`} onClose={onClose}>
      <div className="flex gap-2">
        <Tile value={String(sessions)} label={sessions === 1 ? "Session" : "Sessions"} />
        <Tile value={minutes > 0 ? formatDuration(minutes) : "—"} label="Time" />
        {hasDistance && (
          <Tile value={metres > 0 ? formatDistance(metres, units.distance) : "—"} label="Distance" />
        )}
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

      {newest.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {newest.map((l) => (
            <LogRow
              key={l.id}
              log={l}
              day={dayLabel(l.logDate)}
              time={timeOf(l)}
              color={colorOf(l)}
              onOpen={() => onOpen(l)}
            />
          ))}
        </div>
      )}
    </Sheet>
  );
}

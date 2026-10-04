"use client";

/*
  CATEGORY STATS — tap a kind of training under the calendar (Water, Erg,
  Weights, Run, Bike) to see what it added up to this month.

  SESSIONS, TIME, DISTANCE, AND THE SAME PER WEEK (owner, 2026-09-14: "I just
  want to see the three tabs — sessions, time, distance — and averaging per
  week in time and sessions … do it for everything"). A week is how training
  is planned and talked about, so the average is per week.

  DRAWN LIKE THE REST OF THE NUMBERS IN VARSITY (owner, 2026-10-04: "jen chci
  vidět kolik sessions, time a distance a average, ale udělej to lepší UI"):
  two groups under a small heading — This month, and Average a week — each a
  row of tiles with the label on top and the figure under it, the tiles of
  the coach's squad week and of the Statistics screen. The average used to be
  a sentence in a grey box ("Averaging 1.2 sessions and 1h 22m a week"); it is
  tiles now, distance included. The list of the month's sessions that was
  under the numbers for an hour is gone ("nechci, aby tam byly ty workouts").

  A MONTH'S FIRST DAYS ARE ONE WEEK, not a fraction of one: three sessions on
  the 4th read "5.3 a week" when four days were divided out to a whole week.
  Until a week has gone by, the average is what was done so far.

  Everything is computed from the logs the calendar has ALREADY loaded for the
  month on screen, so opening this costs nothing and the numbers can never
  disagree with the grid above it. Distance respects the person's km/miles
  setting (lib/varsity/units); the underlying logs stay in metres.

  A KIND THAT HAS NO DISTANCE HAS NO DISTANCE TILE (owner, 2026-09-27: "for
  weights there obviously won't be a distance, so just do two tabs: sessions
  and time"). Flex is the same kind of session.
*/
import Sheet from "@/components/varsity/Sheet";
import { type LogEntry } from "@/lib/varsity/logStore";
import { logCategoryLabel } from "@/lib/varsity/athleteProfile";
import { formatDistance, formatDuration, type Units } from "@/lib/varsity/units";

/* One figure: its label on top, the number under it. */
function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
      <div className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</div>
      <div className="mt-1 truncate text-[22px] font-semibold leading-none tabular-nums text-text">{value}</div>
    </div>
  );
}

/* A small heading over a row of tiles. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

/* The kinds of training that are never measured in metres. */
const NO_DISTANCE = new Set(["weights", "flex"]);

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
  const hasDistance = !NO_DISTANCE.has(category);
  /* Never less than one week (see the header). */
  const per = Math.max(1, weeks);

  return (
    <Sheet title={`${label} · ${monthLabel}`} onClose={onClose}>
      <Group title="This month">
        <Tile value={String(sessions)} label={sessions === 1 ? "Session" : "Sessions"} />
        <Tile value={minutes > 0 ? formatDuration(minutes) : "—"} label="Time" />
        {hasDistance && <Tile value={metres > 0 ? formatDistance(metres, units.distance) : "—"} label="Distance" />}
      </Group>

      {sessions > 0 && (
        <div className="mt-5">
          <Group title="Average a week">
            <Tile value={oneDecimal(sessions / per)} label={sessions / per === 1 ? "Session" : "Sessions"} />
            <Tile value={minutes > 0 ? formatDuration(Math.round(minutes / per)) : "—"} label="Time" />
            {hasDistance && (
              <Tile value={metres > 0 ? formatDistance(metres / per, units.distance) : "—"} label="Distance" />
            )}
          </Group>
        </div>
      )}
    </Sheet>
  );
}

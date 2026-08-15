"use client";

/*
  CATEGORY STATS — tap a colour in the calendar legend to see what that kind of
  training added up to this month: how many sessions, how long, how far.

  Everything is computed from the logs the calendar has ALREADY loaded for the
  month on screen, so opening this costs nothing and the numbers can never
  disagree with the dots above it. Distance respects the person's km/miles
  setting (lib/varsity/units); the underlying logs stay in metres.

  Categories that aren't measured in distance (weights, flex) simply don't show
  a distance tile rather than showing a meaningless "0 km" — same for time on a
  session nobody timed.
*/
import Sheet from "@/components/varsity/Sheet";
import { type LogEntry } from "@/lib/varsity/logStore";
import { logCategoryColor, logCategoryLabel } from "@/lib/varsity/athleteProfile";
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

export default function CategoryStatsSheet({
  category,
  monthLabel,
  logs,
  units,
  onClose,
}: {
  category: string;
  monthLabel: string;
  logs: LogEntry[]; // the whole month; filtered here
  units: Units;
  onClose: () => void;
}) {
  const mine = logs.filter((l) => (l.category ?? "other") === category);

  const sessions = mine.length;
  const minutes = mine.reduce((sum, l) => sum + (l.minutes ?? 0), 0);
  const metres = mine.reduce((sum, l) => sum + (l.metres ?? 0), 0);
  const days = new Set(mine.map((l) => l.logDate)).size;

  const label = logCategoryLabel[category] ?? category;
  const color = logCategoryColor[category] ?? "var(--muted)";

  return (
    <Sheet title={`${label} · ${monthLabel}`} onClose={onClose}>
      {sessions === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-6 text-center text-[12px] text-muted">
          Nothing logged as {label.toLowerCase()} in {monthLabel}.
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            <span className="text-[11px] text-muted">
              across {days} {days === 1 ? "day" : "days"} in {monthLabel}
            </span>
          </div>

          <div className="flex gap-2">
            <Tile value={String(sessions)} label={sessions === 1 ? "Session" : "Sessions"} />
            {minutes > 0 && <Tile value={formatDuration(minutes)} label="Time" />}
            {metres > 0 && <Tile value={formatDistance(metres, units.distance)} label="Distance" />}
          </div>

          {/* An average is the number people actually compare month to month. */}
          {sessions > 1 && (minutes > 0 || metres > 0) && (
            <div className="mt-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-2.5 text-[11px] text-muted">
              Averaging{" "}
              <span className="text-text">
                {[
                  minutes > 0 ? formatDuration(Math.round(minutes / sessions)) : null,
                  metres > 0 ? formatDistance(Math.round(metres / sessions), units.distance) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>{" "}
              a session.
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

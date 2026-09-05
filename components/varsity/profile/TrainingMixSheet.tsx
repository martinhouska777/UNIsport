"use client";

/*
  TRAINING MIX — the window behind the Statistics block.

  The graph says how much you trained. This says what of: a bar per kind of
  training over the range on screen, biggest first, with the sessions, the time
  and the metres behind each one.

  It is computed from the logs the profile has ALREADY loaded, so opening it
  costs nothing and its numbers can never disagree with the graph above it.
  Colours are the calendar's own (lib/varsity/home → kindColor), applied by
  inline style — per-entity content colour from a data file, the documented
  exception to rule 1.
*/
import Sheet from "@/components/varsity/Sheet";
import { formatDistance, formatDuration, type Units } from "@/lib/varsity/units";
import type { MixRow } from "@/lib/varsity/trainingMix";

export default function TrainingMixSheet({
  rows,
  rangeLabel,
  units,
  onClose,
}: {
  rows: MixRow[];
  rangeLabel: string;
  units: Units;
  onClose: () => void;
}) {
  const sessions = rows.reduce((s, r) => s + r.sessions, 0);
  const minutes = rows.reduce((s, r) => s + r.minutes, 0);

  return (
    <Sheet title={`Training mix · ${rangeLabel}`} onClose={onClose}>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-6 text-center text-[12px] text-muted">
          Nothing logged in this range yet.
        </div>
      ) : (
        <>
          {/* The one line that says how big the whole thing is, so every bar
              below has something to be a share OF. */}
          <div className="mb-3 text-[12px] text-muted">
            {sessions} session{sessions === 1 ? "" : "s"}
            {minutes > 0 && <> · {formatDuration(Math.round(minutes))}</>}
          </div>

          <div className="flex flex-col gap-2.5">
            {rows.map((r) => (
              <div key={r.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ background: r.color }}
                    />
                    <span className="truncate text-[13px] font-medium text-text">{r.label}</span>
                  </span>
                  <span className="flex-shrink-0 text-[13px] font-semibold text-text">
                    {r.share}%
                  </span>
                </div>

                {/* The bar. A share of 0% still draws a sliver, so a kind you
                    did once doesn't look like a kind you never did. */}
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(2, r.share)}%`, background: r.color }}
                  />
                </div>

                <div className="mt-1 text-[11px] text-muted">
                  {r.sessions} session{r.sessions === 1 ? "" : "s"}
                  {r.minutes > 0 && <> · {formatDuration(Math.round(r.minutes))}</>}
                  {r.metres > 0 && <> · {formatDistance(r.metres, units.distance)}</>}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            A session takes its kind from the coach&apos;s plan for that day. Anything you logged
            outside the plan, with nothing to say how hard it was, sits in Other.
          </p>
        </>
      )}
    </Sheet>
  );
}

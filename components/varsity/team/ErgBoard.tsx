"use client";

/*
  ERG BOARD — the last erg workout ranked, with each rower's improvement vs
  their previous test (faster = green ▲, slower = red ▼). Your own row is
  highlighted. Data from lib/varsity/ergRankings (stable demo until real erg
  results land). All colors are theme tokens.
*/
import { useMemo } from "react";
import { lastErgWorkout, deltaLabel } from "@/lib/varsity/ergRankings";
import { IconChevronUp, IconChevronDown } from "@/components/icons";

const norm = (s: string) => s.trim().toLowerCase();

export default function ErgBoard({
  myName,
  onOpen,
}: {
  myName: string | null;
  onOpen: (athleteId: string) => void;
}) {
  const workout = useMemo(() => lastErgWorkout(), []);
  const me = myName ? norm(myName) : null;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-baseline justify-between px-0.5">
        <span className="text-[13px] font-semibold text-text">{workout.piece} test</span>
        <span className="text-[10px] text-muted">{workout.dateLabel} · vs previous</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {workout.results.map((r, i) => {
          const mine = !!(me && norm(r.name) === me);
          const improved = r.deltaSec > 0.05;
          const worse = r.deltaSec < -0.05;
          return (
            <button
              key={r.athleteId}
              type="button"
              onClick={() => onOpen(r.athleteId)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${
                i > 0 ? "border-t border-border" : ""
              } ${mine ? "bg-primary/10" : "active:bg-surface-2"}`}
            >
              <span
                className={`w-5 flex-shrink-0 text-center text-[12px] font-semibold ${
                  i < 3 ? "text-primary" : "text-muted"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-[10px] font-semibold text-primary">
                {r.initials}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">
                {r.name}
                {mine && (
                  <span className="ml-1.5 rounded bg-primary px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-primary-contrast">
                    You
                  </span>
                )}
              </span>
              <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-text">
                {r.currentLabel}
              </span>
              <span
                className={`flex w-14 flex-shrink-0 items-center justify-end gap-0.5 text-[11px] font-semibold tabular-nums ${
                  improved ? "text-success" : worse ? "text-danger" : "text-muted"
                }`}
              >
                {improved && <IconChevronUp size={12} />}
                {worse && <IconChevronDown size={12} />}
                {deltaLabel(r.deltaSec)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 px-0.5 text-[10px] leading-relaxed text-muted">
        Green = faster than your last 2K, red = slower. Tap a name for their profile.
      </p>
    </div>
  );
}

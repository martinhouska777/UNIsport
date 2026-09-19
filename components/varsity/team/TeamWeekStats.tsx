"use client";

/*
  THE SQUAD'S WEEK — what the whole team did, on top of the Team tab.
  ---------------------------------------------------------------------------
  A coach had no statistics of their own: every rower can open their profile and
  read their own distance and hours, and the person running the squad could read
  nobody's but one athlete at a time (owner, 2026-09-19). This is the team's
  version of that, and it sits above the roster so the screen reads the way the
  question is asked — the squad first, then the people in it, each one a tap
  from their own profile.

  Nothing here is typed. It is the BOATS added up: every crew records what it
  actually did in its SESSION tab, and that distance counts for every seat in
  the boat, coxswain included (lib/varsity/boatMileage.ts). Which is why two
  rowers who trained identically end the week on different numbers.

  FOUR NUMBERS: what the squad did in total, and what that is per person. The
  average is over THE PEOPLE WHO WERE IN A BOAT, not over the roster — a squad
  of fifty with fourteen on the water does not average a fifth of an outing
  each, and dividing by the roster would say precisely that.

  All colours are theme tokens.
*/
import { useEffect, useState } from "react";
import { useUnits } from "@/components/useUnits";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import {
  averageMetres,
  averageMinutes,
  mileageFrom,
  weekDayKeys,
  weekRangeLabel,
  weekStart,
  type Mileage,
  type PersonMileage,
} from "@/lib/varsity/boatMileage";
import { fetchLineupsFor } from "@/lib/varsity/lineupStore";
import { formatDistance, formatDuration } from "@/lib/varsity/units";

const EMPTY: Mileage = { people: [], metres: 0, minutes: 0, boats: 0, unfilled: 0 };

export type TeamWeek = {
  start: Date;
  step: (weeks: number) => void;
  isThisWeek: boolean;
  loading: boolean;
  data: Mileage;
  /** Roster id → that person's week, for the rows underneath. */
  byId: Record<string, PersonMileage>;
};

/*
  One week of boats, and the arrows to move between them. Kept as a hook so the
  roster rows below can show each person's share of the very same numbers — a
  screen that fetched twice could show a total that its own rows disagree with.
*/
export function useTeamWeek(): TeamWeek {
  const [start, setStart] = useState(() => weekStart(new Date()));
  /* The week that has been added up, and WHICH week it was. Holding the two
     together is what says "still loading" — a flag set from inside the effect
     is the cascading render the hook lint rule exists to stop, and it would
     also show last week's totals under this week's heading for a frame. */
  const [result, setResult] = useState<{ at: number; data: Mileage } | null>(null);

  useEffect(() => {
    let active = true;
    const at = start.getTime();
    fetchLineupsFor(weekDayKeys(start)).then((lineups) => {
      if (active) setResult({ at, data: mileageFrom(lineups) });
    });
    return () => {
      active = false;
    };
  }, [start]);

  const loading = result?.at !== start.getTime();
  const data = loading ? EMPTY : (result?.data ?? EMPTY);
  const byId: Record<string, PersonMileage> = {};
  for (const p of data.people) byId[p.id] = p;

  return {
    start,
    step: (weeks) =>
      setStart((s) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + weeks * 7)),
    isThisWeek: start.getTime() === weekStart(new Date()).getTime(),
    loading,
    data,
    byId,
  };
}

/* One figure. The squad's two totals are the big ones; what that comes to per
   person is the same number said the other way, and sits under them smaller. */
function Total({ value, label, small }: { value: string; label: string; small?: boolean }) {
  return (
    <div className="min-w-0 flex-1">
      <div
        className={`truncate font-semibold leading-tight text-text ${small ? "text-[18px]" : "text-[26px]"}`}
      >
        {value}
      </div>
      <div className="mt-0.5 font-mono text-[10px] font-medium tracking-[0.12em] text-muted">
        {label}
      </div>
    </div>
  );
}

export default function TeamWeekStats({ week }: { week: TeamWeek }) {
  const { units } = useUnits();
  const { data, loading, isThisWeek } = week;

  return (
    <>
      {/* THE WEEK, with an arrow either side. Forward stops at this week:
          there are no kilometres in a week nobody has rowed yet. */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2 py-1.5">
        <button
          type="button"
          onClick={() => week.step(-1)}
          aria-label="The week before"
          className="tap44 press-icon flex h-9 w-9 items-center justify-center rounded-lg text-muted"
        >
          <IconChevronLeft size={16} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-[14px] font-semibold text-text">
            {isThisWeek ? "This week" : weekRangeLabel(week.start)}
          </div>
          {isThisWeek && <div className="text-[11px] text-muted">{weekRangeLabel(week.start)}</div>}
        </div>
        <button
          type="button"
          disabled={isThisWeek}
          onClick={() => week.step(1)}
          aria-label="The week after"
          className="tap44 press-icon flex h-9 w-9 items-center justify-center rounded-lg text-muted disabled:opacity-30"
        >
          <IconChevronRight size={16} />
        </button>
      </div>

      {/* THE SQUAD'S WEEK. The distance is every person's kilometres added
          together, and the time is person-hours — eight rowers out for an hour
          is eight hours of training, which is what the week cost the squad. */}
      <div className="mt-2 rounded-xl border border-border bg-surface p-3.5">
        <div className="flex items-start gap-3">
          <Total value={formatDistance(data.metres, units.distance)} label="TEAM TOTAL" />
          <Total value={formatDuration(data.minutes)} label="TIME IN TOTAL" />
        </div>
        <div className="mt-3 flex items-start gap-3">
          <Total
            small
            value={formatDistance(averageMetres(data), units.distance)}
            label="EACH ON AVERAGE"
          />
          <Total small value={formatDuration(averageMinutes(data))} label="TIME EACH" />
        </div>
        <div className="mt-2.5 border-t border-border pt-2.5 text-[12px] text-muted">
          {loading
            ? "Adding up the boats…"
            : data.people.length
              ? `${data.people.length} ${data.people.length === 1 ? "person" : "people"} out in ${data.boats} ${data.boats === 1 ? "boat" : "boats"}`
              : "No kilometres written down for this week yet — they come from each crew's SESSION tab."}
        </div>
        {/* Said plainly, because the total is only as true as the boats it came
            from — a coach reading a thin week deserves to know why. */}
        {!loading && data.unfilled > 0 && (
          <div className="mt-1 text-[12px] text-warn">
            {data.unfilled} {data.unfilled === 1 ? "boat has" : "boats have"} no kilometres written
            on {data.unfilled === 1 ? "it" : "them"} yet.
          </div>
        )}
      </div>
    </>
  );
}

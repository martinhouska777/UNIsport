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

  TWO NUMBERS, AND THEY ARE AVERAGES: what one person covered this week, and how
  long they trained for. The squad's raw totals were here and the owner cut them
  (2026-09-19) — a total is a number that grows with the size of the squad and
  says nothing about how the week went; what a coach is actually asking is what
  a rower's week looked like.

  AND EVERY FIGURE IS READ AGAINST THE WEEK BEFORE IT (owner, 2026-09-20).
  18 km each is a hard week or an easy one depending entirely on what came
  before, so the card fetches the previous week too and writes the difference
  under each number. The week picker lives in the same card now rather than in
  a rectangle of its own on top of it, and the change is never coloured: a
  taper week is SUPPOSED to fall.

  The average is over THE PEOPLE WHO WERE IN A BOAT, not over the roster — a
  squad of fifty with fourteen on the water does not average a fifth of an
  outing each, and dividing by the roster would say precisely that. How many
  people that was is written underneath, so the average is never read alone.

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
  /**
   * The week BEFORE this one, added up the same way. A number on its own says
   * nothing — 18 km is a hard week or an easy one depending on the week that
   * came before it — so every figure on the card is shown against this
   * (owner, 2026-09-20: "make it for statistics so you can compare it to
   * previous things").
   */
  prev: Mileage;
  /** Roster id → that person's week, for the rows underneath. */
  byId: Record<string, PersonMileage>;
};

/*
  One week of boats, and the arrows to move between them. Kept as a hook so the
  roster rows below can show each person's share of the very same numbers — a
  screen that fetched twice could show a total that its own rows disagree with.
*/
export function useTeamWeek(on = true): TeamWeek {
  const [start, setStart] = useState(() => weekStart(new Date()));
  /* The week that has been added up, and WHICH week it was. Holding the two
     together is what says "still loading" — a flag set from inside the effect
     is the cascading render the hook lint rule exists to stop, and it would
     also show last week's totals under this week's heading for a frame. */
  const [result, setResult] = useState<{ at: number; data: Mileage; prev: Mileage } | null>(null);

  /* `on` is false on a rower's Team tab, where this is not shown: a screen that
     is not asking the question must not ask the database either. */
  useEffect(() => {
    if (!on) return;
    let active = true;
    const at = start.getTime();
    const before = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7);
    /* Both weeks in one go, so the comparison lands with the figure it belongs
       to — a second fetch arriving later would move the numbers twice. */
    Promise.all([
      fetchLineupsFor(weekDayKeys(start)),
      fetchLineupsFor(weekDayKeys(before)),
    ]).then(([now, prior]) => {
      if (active) setResult({ at, data: mileageFrom(now), prev: mileageFrom(prior) });
    });
    return () => {
      active = false;
    };
  }, [start, on]);

  const loading = on && result?.at !== start.getTime();
  const data = loading ? EMPTY : (result?.data ?? EMPTY);
  const prev = loading ? EMPTY : (result?.prev ?? EMPTY);
  const byId: Record<string, PersonMileage> = {};
  for (const p of data.people) byId[p.id] = p;

  return {
    start,
    step: (weeks) =>
      setStart((s) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + weeks * 7)),
    isThisWeek: start.getTime() === weekStart(new Date()).getTime(),
    loading,
    data,
    prev,
    byId,
  };
}

/*
  One figure, and what it was the week before. `against` is null when there is
  nothing to compare to — an empty week before this one is not a fall of 100%,
  it is a week nobody has written down, and saying "−18.4 km" about it would be
  a lie the coach acts on.
*/
function Total({
  value,
  label,
  against,
}: {
  value: string;
  label: string;
  against: string | null;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="truncate text-[26px] font-semibold leading-tight text-text">{value}</div>
      <div className="mt-0.5 font-mono text-[10px] font-medium tracking-[0.12em] text-muted">
        {label}
      </div>
      {against && <div className="mt-1 truncate text-[11px] text-muted">{against}</div>}
    </div>
  );
}

/*
  "+2.1 km on last week", or "same as last week". The sign is the whole point
  and it is never coloured: more kilometres is not good news and fewer is not
  bad — a taper week is supposed to fall — so the card reports the change and
  leaves the reading of it to the coach.
*/
function change(now: number, before: number, format: (v: number) => string): string | null {
  if (!before) return null;
  const diff = now - before;
  if (Math.abs(diff) < 0.5) return "same as last week";
  return `${diff > 0 ? "+" : "−"}${format(Math.abs(diff))} on last week`;
}

export default function TeamWeekStats({ week }: { week: TeamWeek }) {
  const { units } = useUnits();
  const { data, prev, loading, isThisWeek } = week;
  const distanceLabel = units.distance === "mi" ? "AVERAGE MILES ROWED" : "AVERAGE KM ROWED";

  return (
    /*
      ONE CARD (owner, 2026-09-20). The week picker used to be a rectangle of
      its own sitting on top of a second rectangle of numbers, which read as two
      things to look at rather than one. The week and what the week came to are
      the same thought, so they are in the same box, and there is no line drawn
      between them — the space does that job.
    */
    <div className="rounded-xl border border-border bg-surface px-3.5 py-2.5">
      {/* THE WEEK, with an arrow either side. Forward stops at this week:
          there are no kilometres in a week nobody has rowed yet. */}
      <div className="flex items-center gap-2">
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

      {/* THE WEEK ONE ROWER HAD, on average — how far, and how long for. Each
          one says what it is in full ("average hours trained", not "time
          each"): a coach reading a number wants to know what it counted
          without being told twice (owner, 2026-09-20). */}
      <div className="mt-3 px-0.5">
        <div className="flex items-start gap-3">
          <Total
            value={formatDistance(averageMetres(data), units.distance)}
            label={distanceLabel}
            against={change(averageMetres(data), averageMetres(prev), (m) =>
              formatDistance(m, units.distance),
            )}
          />
          <Total
            value={formatDuration(averageMinutes(data))}
            label="AVERAGE HOURS TRAINED"
            against={change(averageMinutes(data), averageMinutes(prev), formatDuration)}
          />
        </div>
        {/* How many people the average is over — never the average alone.
            The empty-week explanation and the "N boats have no kilometres
            written on them yet" warning were both cut (owner, 2026-09-19):
            a coach reading their own squad knows where the numbers come
            from, and the screen was explaining itself twice. */}
        {(loading || data.people.length > 0) && (
          <div className="mt-3 text-[12px] text-muted">
            {loading
              ? "Adding up the boats…"
              : `${data.people.length} ${data.people.length === 1 ? "person" : "people"} out in ${data.boats} ${data.boats === 1 ? "boat" : "boats"}`}
          </div>
        )}
      </div>
    </div>
  );
}

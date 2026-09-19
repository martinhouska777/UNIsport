"use client";

/*
  KILOMETRES — the second half of the console's Workouts tab.
  ---------------------------------------------------------------------------
  One week at a time: what the squad covered in total, and then every person,
  furthest first. The numbers are not typed here and are not a separate record
  — they are the boats themselves. Each boat carries what it actually did
  (the SESSION tab under a crew), and a boat's distance counts for everyone
  sitting in it, coxswain included (lib/varsity/boatMileage.ts).

  That is what makes the list worth reading: two rowers who trained exactly as
  hard finish the week on different numbers, because one of them was in the
  eight that went past the bridge. A coach can see it here instead of being
  asked about it.

  Nothing on this screen is editable. If a number looks wrong, the boat it came
  from is where it gets fixed.

  Colours: theme tokens, except the coxswain's yellow, which is the same
  per-person identity colour the lineup screens use (the rule-1 exception).
*/
import { useEffect, useState } from "react";
import { useUnits } from "@/components/useUnits";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import {
  averageMetres,
  mileageFrom,
  weekDayKeys,
  weekRangeLabel,
  weekStart,
  type Mileage,
} from "@/lib/varsity/boatMileage";
import { COX_COLOR, COX_INK, COX_LABEL } from "@/lib/varsity/coachLineup";
import { fetchLineupsFor } from "@/lib/varsity/lineupStore";
import { formatDistance, formatDuration } from "@/lib/varsity/units";

const EMPTY: Mileage = {
  people: [],
  metres: 0,
  minutes: 0,
  boats: 0,
  unfilled: 0,
};

/* One of the two big figures at the top. */
function Total({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="truncate text-[26px] font-semibold leading-tight text-text">{value}</div>
      <div className="mt-0.5 font-mono text-[10px] font-medium tracking-[0.12em] text-muted">
        {label}
      </div>
    </div>
  );
}

export default function MileageScreen() {
  const { units } = useUnits();
  /* Which week is on screen, as its Monday. */
  const [start, setStart] = useState(() => weekStart(new Date()));
  /* The week that has been added up, and WHICH week it was. Holding the week
     alongside the figures is what says "still loading" — a `loading` flag set
     from inside the effect is the cascading render the hook lint rule is there
     to stop, and it would also show last week's totals under this week's
     heading for a frame. */
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

  const step = (weeks: number) =>
    setStart((s) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + weeks * 7));

  const thisWeek = weekStart(new Date()).getTime();
  const isThisWeek = start.getTime() === thisWeek;
  const average = averageMetres(data);

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
      {/* THE WEEK, with an arrow either side. Forward stops at this week:
          there are no kilometres in a week nobody has rowed yet. */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2 py-1.5">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="The week before"
          className="tap44 press-icon flex h-9 w-9 items-center justify-center rounded-lg text-muted"
        >
          <IconChevronLeft size={16} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-[14px] font-semibold text-text">
            {isThisWeek ? "This week" : weekRangeLabel(start)}
          </div>
          {isThisWeek && <div className="text-[11px] text-muted">{weekRangeLabel(start)}</div>}
        </div>
        <button
          type="button"
          disabled={isThisWeek}
          onClick={() => step(1)}
          aria-label="The week after"
          className="tap44 press-icon flex h-9 w-9 items-center justify-center rounded-lg text-muted disabled:opacity-30"
        >
          <IconChevronRight size={16} />
        </button>
      </div>

      {loading ? (
        <p className="py-16 text-center text-[13px] text-muted">Adding up the boats…</p>
      ) : (
        <>
          {/* THE SQUAD'S WEEK. The distance is every person's kilometres added
          together, and the time is person-hours — eight rowers out for an hour
          is eight hours of training, which is the number that says what the
          week cost the squad. */}
          <div className="mt-3 rounded-xl border border-border bg-surface p-3.5">
            <div className="flex items-start gap-3">
              <Total value={formatDistance(data.metres, units.distance)} label="TEAM TOTAL" />
              <Total value={formatDuration(data.minutes)} label="TIME IN TOTAL" />
            </div>
            <div className="mt-2.5 border-t border-border pt-2.5 text-[12px] text-muted">
              {data.people.length
                ? `${data.people.length} ${data.people.length === 1 ? "person" : "people"} out in ${data.boats} ${data.boats === 1 ? "boat" : "boats"} · ${formatDistance(average, units.distance)} each on average`
                : "Nobody's kilometres are written down for this week."}
            </div>
            {/* Said plainly, because the total is only as true as the boats it came
            from — and a coach reading a low week deserves to know why. */}
            {data.unfilled > 0 && (
              <div className="mt-1 text-[12px] text-warn">
                {data.unfilled} {data.unfilled === 1 ? "boat has" : "boats have"} no kilometres
                written on {data.unfilled === 1 ? "it" : "them"} yet.
              </div>
            )}
          </div>

          {/* EVERY PERSON, FURTHEST FIRST. */}
          {data.people.length === 0 ? (
            <p className="px-6 py-10 text-center text-[13px] leading-relaxed text-muted">
              Kilometres come from the boats. Open a crew&rsquo;s SESSION tab in the Lineup and
              write down what they did — it counts for everyone in that boat.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-1.5">
              {data.people.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5"
                >
                  {/* Where they came in the week. Quiet — it is a list in order,
                  not a league table; the kilometres are the point. */}
                  <span className="w-5 flex-shrink-0 text-center font-mono text-[11px] text-muted">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="min-w-0 truncate text-[15px] font-medium text-text">
                        {p.name}
                      </span>
                      {p.cox && (
                        <span
                          className="flex h-[17px] flex-shrink-0 items-center rounded px-1.5 font-mono text-[9px] font-semibold tracking-[0.06em]"
                          style={{ background: COX_COLOR, color: COX_INK }}
                        >
                          {COX_LABEL}
                        </span>
                      )}
                    </span>
                    <span className="block text-[11px] text-muted">
                      {p.outings} {p.outings === 1 ? "outing" : "outings"}
                      {p.minutes ? ` · ${formatDuration(p.minutes)}` : ""}
                    </span>
                  </span>
                  <span className="flex-shrink-0 font-mono text-[14px] font-semibold text-text">
                    {formatDistance(p.metres, units.distance)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

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

  IT IS THE ATHLETES' OWN LOGS (audit, 2026-09-27). It used to be the BOATS
  added up — every seat credited with its crew's kilometres — while the Full
  statistics it opens are made of what each rower LOGGED, so the same week
  read "74 km per person" here and "112 km" one tap later. Logs are what the
  rowers actually did (the erg, the weights, the extra session a boat never
  sees), so both are now the same read: this week's figure IS the "This week"
  row of the full screen, made by the same function (teamStats.ts →
  bucketMetres / bucketMinutes).

  TWO NUMBERS, AND THEY ARE AVERAGES: what one person covered this week, and how
  long they trained for. The squad's raw totals were here and the owner cut them
  (2026-09-19) — a total is a number that grows with the size of the squad and
  says nothing about how the week went; what a coach is actually asking is what
  a rower's week looked like.

  THE TWO FIGURES SIT IN BOXES OF THEIR OWN, and nothing is written under them
  (owner, 2026-09-21). For a day each figure carried the week before it —
  "+2.1 km on last week" — and the owner cut it: "I was just random text, and
  I don't want to compare it to last week". Comparing is what the FULL
  STATISTICS are for: the button at the foot of the card opens the squad's
  weeks as a graph and a list (TeamStatsScreen), the same reading every rower
  has of themselves, so a week is compared against the weeks before it there,
  not squeezed under a number here.

  The average is over THE PEOPLE WHO TRAINED that week, not over the roster —
  somebody who logged nothing is an unknown, not a zero. How many people that
  was is written underneath, so the average is never read alone.

  All colours are theme tokens.
*/
import { useEffect, useState } from "react";
import { useUnits } from "@/components/useUnits";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { weekRangeLabel, weekStart } from "@/lib/varsity/boatMileage";
import { fetchSquadLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { useMembership } from "@/components/varsity/useMembership";
import { can, fetchSquad } from "@/lib/varsity/membership";
import { rosterIdForName } from "@/lib/varsity/demoAthlete";
import { rowingCategories } from "@/lib/varsity/athleteProfile";
import {
  bucketMetres,
  bucketMinutes,
  fillBuckets,
  toIso,
  type TeamRange,
} from "@/lib/varsity/teamStats";
import TeamStatsScreen from "@/components/varsity/team/TeamStatsScreen";
import { formatDistance, formatDuration } from "@/lib/varsity/units";

/** One person's week: rowed metres and minutes trained. */
export type PersonWeek = { metres: number; minutes: number };

/** The week, added up: the averages, and over how many people. */
export type WeekFigures = { metres: number; minutes: number; people: number };

const EMPTY: WeekFigures = { metres: 0, minutes: 0, people: 0 };

export type TeamWeek = {
  start: Date;
  step: (weeks: number) => void;
  isThisWeek: boolean;
  loading: boolean;
  data: WeekFigures;
  /** Roster id → that person's week, for ordering the rows underneath. */
  byId: Record<string, PersonWeek>;
};

/* A week as the full screen's own kind of window — ONE week-long bucket,
   which stops at today like every bucket there does. */
const weekWindow = (start: Date): TeamRange => {
  const sunday = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { key: "card", label: "", days: 7, bucket: "week", start: toIso(start), end: toIso(sunday) };
};

const isRowed = (l: LogEntry) => rowingCategories.has(l.category ?? "");

/*
  One week of the squad's LOGS, and the arrows to move between them. Kept as
  a hook so the roster rows below are ordered by the very same numbers — a
  screen that fetched twice could show a total its own rows disagree with.

  COACH ONLY, the same as the full screen: a squad's logs are readable by
  their coach (db/varsity_coach_reads.sql) and by nobody else, so anyone else
  gets no figures rather than a wrong zero.
*/
export function useTeamWeek(on = true): TeamWeek {
  const [start, setStart] = useState(() => weekStart(new Date()));
  const { membership } = useMembership();
  const teamId = membership?.teamId ?? null;
  const role = membership?.role ?? null;
  const canRead = on && !!teamId && !!role && can.readTraining(role);
  /* The week that has been added up, and WHICH week it was. Holding the two
     together is what says "still loading" — a flag set from inside the effect
     is the cascading render the hook lint rule exists to stop, and it would
     also show last week's totals under this week's heading for a frame. */
  const [result, setResult] = useState<{
    at: number;
    data: WeekFigures;
    byId: Record<string, PersonWeek>;
  } | null>(null);

  /* `on` is false on a rower's Team tab, where this is not shown: a screen that
     is not asking the question must not ask the database either. */
  useEffect(() => {
    if (!canRead || !teamId) return;
    let active = true;
    const at = start.getTime();
    const range = weekWindow(start);
    fetchSquad(teamId)
      .then(async (squad) => {
        const approved = squad.filter((m) => m.status === "approved");
        const logs = await fetchSquadLogsInRange(
          approved.map((m) => m.userId),
          range.start!,
          range.end!,
        );
        if (!active) return;
        const [bucket] = fillBuckets(range, new Date(), {}, logs);
        const byId: Record<string, PersonWeek> = {};
        const from = bucket ? toIso(bucket.start) : "";
        const to = bucket ? toIso(bucket.end) : "";
        for (const m of approved) {
          const rosterId = rosterIdForName(m.name);
          const mine = (logs[m.userId] ?? []).filter(
            (l) => l.category !== "off" && l.logDate >= from && l.logDate <= to,
          );
          if (!rosterId || mine.length === 0) continue;
          byId[rosterId] = {
            metres: mine.filter(isRowed).reduce((a, l) => a + (l.metres ?? 0), 0),
            minutes: mine.reduce((a, l) => a + (l.minutes ?? 0), 0),
          };
        }
        setResult({
          at,
          data: bucket
            ? { metres: bucketMetres(bucket), minutes: bucketMinutes(bucket), people: bucket.trained.length }
            : EMPTY,
          byId,
        });
      })
      .catch(() => active && setResult({ at, data: EMPTY, byId: {} }));
    return () => {
      active = false;
    };
  }, [start, canRead, teamId]);

  const loading = canRead && result?.at !== start.getTime();
  const fresh = !loading && result?.at === start.getTime() ? result : null;

  return {
    start,
    step: (weeks) =>
      setStart((s) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + weeks * 7)),
    isThisWeek: start.getTime() === weekStart(new Date()).getTime(),
    loading,
    data: fresh?.data ?? EMPTY,
    byId: fresh?.byId ?? {},
  };
}

/*
  ONE FIGURE IN ITS OWN BOX — the label on top, the number under it, the same
  cell the athlete's statistics are built from, so the coach's card and the
  rower's read as one family. Nothing under the number: the comparison with
  other weeks lives on the full screen.
*/
function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
      <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</div>
      <div className="mt-1 truncate text-[22px] font-semibold leading-none text-text">{value}</div>
    </div>
  );
}

export default function TeamWeekStats({ week }: { week: TeamWeek }) {
  const { units } = useUnits();
  const { data, loading, isThisWeek } = week;
  const [full, setFull] = useState(false);
  const distanceLabel = units.distance === "mi" ? "Average miles rowed" : "Average km rowed";

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

      {/* THE WEEK ONE ROWER HAD, on average — how far, and how long for, each
          in a box of its own (owner, 2026-09-21: "a square or rectangular
          background so it looks better"). Each one says what it is in full. */}
      <div className="mt-3 flex items-stretch gap-2">
        {/* A dash, not "0 km", for a week nobody logged: an average over
            nobody is not a zero. */}
        <Figure
          value={data.people > 0 ? formatDistance(data.metres, units.distance) : "—"}
          label={distanceLabel}
        />
        <Figure
          value={data.people > 0 ? formatDuration(Math.round(data.minutes)) : "—"}
          label="Average hours trained"
        />
      </div>

      {/* How many people the average is over — never the average alone — and
          the way to the whole reading. */}
      <div className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0 truncate text-[12px] text-muted">
          {loading
            ? "Adding up the squad…"
            : data.people > 0
              ? `${data.people} ${data.people === 1 ? "person" : "people"} trained`
              : ""}
        </div>
        <button
          type="button"
          onClick={() => setFull(true)}
          className="tap44 flex flex-shrink-0 items-center gap-1 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-text"
        >
          Full statistics <IconChevronRight size={13} />
        </button>
      </div>

      {full && <TeamStatsScreen onClose={() => setFull(false)} />}
    </div>
  );
}

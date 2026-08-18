"use client";

/*
  TEAM WORKOUTS — the Workouts half of the Team tab.
  ---------------------------------------------------------------------------
  Every session the coach flagged as a TEAM WORKOUT, newest first, each with the
  date it was done and how many of the squad have logged it. Tap one to open its
  board (WorkoutBoard.tsx).

  This is the screen that replaces the spreadsheet: nobody types results into a
  shared sheet and hunts for their own name — everyone logs their own session
  (scanning the monitor photo if they like) and the board assembles itself.

  Data: the plan comes from planStore (which is where the coach's switch lives),
  the results from resultsStore. Colors are theme tokens; the category dot is a
  content color from data, applied via inline style (rule-1 exception).
*/
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppState";
import { useMembership } from "@/components/varsity/useMembership";
import WorkoutBoard from "@/components/varsity/team/WorkoutBoard";
import { fetchPlan, fetchProfileFullName } from "@/lib/varsity/planStore";
import { demoTeamPlan, demoSquadSize } from "@/lib/varsity/demoWorkouts";
import { fetchResults, fetchSquadSize, type TeamResult } from "@/lib/varsity/resultsStore";
import { teamWorkouts, type TeamWorkout } from "@/lib/varsity/teamBoard";
import { sessionLabel, sessionColor } from "@/lib/varsity/coachPlan";
import { IconChevronRight } from "@/components/icons";

export default function TeamWorkouts() {
  const { userId } = useAppState();
  const { membership } = useMembership();
  const teamId = membership?.teamId ?? null;

  const [workouts, setWorkouts] = useState<TeamWorkout[]>([]);
  const [results, setResults] = useState<TeamResult[]>([]);
  const [squadSize, setSquadSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [example, setExample] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const plan = await fetchPlan();
      const list = teamWorkouts(plan.sessions);
      if (!active) return;

      if (list.length > 0) {
        setWorkouts(list);
        const rows = await fetchResults(list.map((w) => w.dayKey));
        if (!active) return;
        setResults(rows);
      } else {
        // Nothing flagged yet → the worked example, with the viewer standing in
        // for the squad's median rower so they can see their own row.
        const name = await fetchProfileFullName(userId);
        if (!active) return;
        const demo = demoTeamPlan(new Date(), userId ? { id: userId, name } : null);
        setWorkouts(teamWorkouts(demo.sessions));
        setResults(demo.results);
        setExample(true);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    let active = true;
    fetchSquadSize(teamId).then((n) => active && setSquadSize(n));
    return () => {
      active = false;
    };
  }, [teamId]);

  /* An example board counts against the EXAMPLE roster, never the real squad —
     "37 of 3 logged" is nonsense on a squad that hasn't signed up yet. */
  const shownSquadSize = example ? demoSquadSize : squadSize;

  // How many results each workout has, so the list can show it without
  // re-filtering inside the render loop.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of results) map.set(r.dayKey, (map.get(r.dayKey) ?? 0) + 1);
    return map;
  }, [results]);

  const opened = workouts.find((w) => w.dayKey === open) ?? null;
  const openedResults = useMemo(
    () => (open ? results.filter((r) => r.dayKey === open) : []),
    [results, open],
  );

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading" className="mt-4 flex flex-col gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="skeleton block h-[66px] rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4">
      {example && (
        <div className="mb-2 rounded-xl border border-dashed border-border bg-surface-2 px-3.5 py-2.5">
          <p className="text-[11px] leading-relaxed text-muted">
            <span className="font-semibold text-text">Example workouts.</span> Nobody has flagged a
            team workout yet, so this is what the board looks like once they have. It vanishes the
            moment the coach switches a real session on.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {workouts.map((w) => {
          const n = counts.get(w.dayKey) ?? 0;
          return (
            <button
              key={w.dayKey}
              type="button"
              onClick={() => setOpen(w.dayKey)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 text-left active:bg-surface-2"
            >
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: sessionColor(w.session) }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-text">
                    {w.session.description.trim() || sessionLabel(w.session)}
                  </span>
                  {w.board === "ranked" && (
                    <span className="flex-shrink-0 rounded border border-primary-line bg-primary-tint px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-primary">
                      Ranked
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  {w.dateLabel} · {w.period} ·{" "}
                  {n === 0 ? "nobody logged yet" : `${n}${shownSquadSize ? ` of ${shownSquadSize}` : ""} logged`}
                </div>
              </div>
              <span className="text-muted">
                <IconChevronRight size={15} />
              </span>
            </button>
          );
        })}
      </div>

      {opened && (
        <WorkoutBoard
          key={opened.dayKey} // a fresh board when another workout is opened from inside this one
          workout={opened}
          results={openedResults}
          workouts={workouts}
          allResults={results}
          squadSize={shownSquadSize}
          myId={userId}
          onClose={() => setOpen(null)}
          onOpenWorkout={(dayKey) => setOpen(dayKey)}
        />
      )}
    </div>
  );
}

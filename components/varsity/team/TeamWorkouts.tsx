"use client";

/*
  TEAM WORKOUTS — the Workouts half of the Team tab.
  ---------------------------------------------------------------------------
  Everything the squad measured, in ONE list, newest first:

    ERG    — a session the coach flagged as a TEAM WORKOUT, with how many of
             the squad have logged it. Tap → its board (WorkoutBoard.tsx).
    WATER  — an outing with telemetry attached (Peach PowerLine / SpeedCoach),
             with its crew and how many pieces. Tap → its pieces
             (TelemetryOuting.tsx), then a piece → the crew's numbers.

  One list rather than two tabs because that is how a week is read — this
  week's numbers — and because a rower's profile already puts their erg and
  water side by side. Chips at the top narrow it to one kind. Water rows are
  never ranked; a piece is a CREW result.

  This is the screen that replaces the spreadsheet: nobody types results into a
  shared sheet and hunts for their own name — everyone logs their own session
  (scanning the monitor photo if they like) and the board assembles itself.

  Data: the plan comes from planStore (which is where the coach's switch lives),
  the results from resultsStore, the outings from telemetryStore. Until a real
  export has been imported the water side shows ONE example outing transcribed
  from the owner's own PowerLine screen (lib/varsity/demoTelemetry.ts) — real
  numbers, labelled as an example, gone the moment a real one exists. Colors
  are theme tokens; the category dot is a content color from data, applied via
  inline style (rule-1 exception).
*/
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppState";
import { useMembership } from "@/components/varsity/useMembership";
import WorkoutBoard from "@/components/varsity/team/WorkoutBoard";
import TelemetryOuting from "@/components/varsity/team/TelemetryOuting";
import { fetchPlan, fetchProfileFullName } from "@/lib/varsity/planStore";
import { demoTeamPlan, demoSquadSize } from "@/lib/varsity/demoWorkouts";
import { fetchResults, fetchSquadSize, type TeamResult } from "@/lib/varsity/resultsStore";
import { teamWorkouts, type TeamWorkout } from "@/lib/varsity/teamBoard";
import { sessionLabel, sessionColor, dayKeyLabel, parseSessionKey } from "@/lib/varsity/coachPlan";
import { fetchOutings } from "@/lib/varsity/telemetryStore";
import { demoOutings } from "@/lib/varsity/demoTelemetry";
import { outingTotals, type TelemetryOuting as Outing } from "@/lib/varsity/telemetry";
import { IconChevronRight } from "@/components/icons";

/** "Fri 15 May · AM" for an outing's session key. */
function outingDateLabel(dayKey: string): string {
  const parsed = parseSessionKey(dayKey);
  return `${dayKeyLabel(dayKey)}${parsed ? ` · ${parsed.period}` : ""}`;
}

type Kind = "all" | "erg" | "water";
type Row = { key: string; date: Date; erg?: TeamWorkout; water?: Outing };

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
  // the water side
  const [outings, setOutings] = useState<Outing[]>([]);
  const [outingExample, setOutingExample] = useState(false);
  const [openOuting, setOpenOuting] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("all");

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

  useEffect(() => {
    let active = true;
    fetchOutings().then((list) => {
      if (!active) return;
      if (list.length > 0) {
        setOutings(list);
      } else {
        // No import yet → the one transcribed outing, so the water side can
        // be looked at (see demoTelemetry.ts).
        setOutings(demoOutings);
        setOutingExample(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

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

  /* The one list: erg boards and water outings, merged by date. */
  const rows = useMemo<Row[]>(() => {
    const ergRows: Row[] = workouts.map((w) => ({ key: `erg:${w.dayKey}`, date: w.date, erg: w }));
    const waterRows: Row[] = outings.map((o) => ({
      key: `water:${o.id}`,
      date: parseSessionKey(o.dayKey)?.date ?? new Date(0),
      water: o,
    }));
    return [...ergRows, ...waterRows]
      .filter((r) => kind === "all" || (kind === "erg" ? !!r.erg : !!r.water))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [workouts, outings, kind]);

  const opened = workouts.find((w) => w.dayKey === open) ?? null;
  const openedOuting = outings.find((o) => o.id === openOuting) ?? null;
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
      {(example || outingExample) && (
        <div className="mb-2 rounded-xl border border-dashed border-border bg-surface-2 px-3.5 py-2.5">
          <p className="text-[11px] leading-relaxed text-muted">
            {example && (
              <>
                <span className="font-semibold text-text">Example workouts.</span> Nobody has flagged
                a team workout yet, so this is what the board looks like once they have. It vanishes
                the moment the coach switches a real session on.{" "}
              </>
            )}
            {outingExample && (
              <>
                <span className="font-semibold text-text">Example outing.</span> No Peach export has
                been imported yet, so the water row is one real outing transcribed from the
                PowerLine screen (15 May, box 5423). It vanishes when a real import exists.
              </>
            )}
          </p>
        </div>
      )}

      {/* erg / water */}
      <div className="mb-2 flex gap-1 rounded-xl border border-border bg-surface p-1">
        {(["all", "erg", "water"] as Kind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex-1 rounded-lg py-1.5 text-[12px] font-semibold capitalize transition-colors ${
              kind === k ? "bg-text text-background" : "text-muted"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-[12px] text-muted">
            Nothing here yet.
          </div>
        )}
        {rows.map((row) => {
          if (row.erg) {
            const w = row.erg;
            const n = counts.get(w.dayKey) ?? 0;
            return (
              <button
                key={row.key}
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
                    <span className="flex-shrink-0 rounded border border-border px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-muted">
                      Erg
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
          }
          const o = row.water!;
          const totals = outingTotals(o);
          const withSeats = o.pieces.filter((p) => p.seats?.length).length;
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => setOpenOuting(o.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 text-left active:bg-surface-2"
            >
              {/* water: the varsity accent, the same dot the plan draws for water */}
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-accent" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-text">
                    {o.crew} · {o.pieces.length} pieces
                  </span>
                  <span className="flex-shrink-0 rounded border border-border px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-muted">
                    Water
                  </span>
                  <span className="flex-shrink-0 rounded border border-border px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-muted">
                    {o.source === "peach" ? "Peach" : "SpeedCoach"}
                  </span>
                </div>
                <div className="mt-1 text-[11px] tabular-nums text-muted">
                  {outingDateLabel(o.dayKey)} · {totals.metres.toLocaleString("en-US")} m
                  {withSeats > 0 && ` · seats on ${withSeats}`}
                </div>
              </div>
              <span className="text-muted">
                <IconChevronRight size={15} />
              </span>
            </button>
          );
        })}
      </div>

      {openedOuting && (
        <TelemetryOuting
          outing={openedOuting}
          dateLabel={outingDateLabel(openedOuting.dayKey)}
          onClose={() => setOpenOuting(null)}
        />
      )}

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

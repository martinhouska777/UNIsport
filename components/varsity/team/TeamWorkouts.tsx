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
  water side by side. Each row wears an Erg or Water tag, so no toggle is
  needed to tell them apart (there used to be one; it hid half the week).
  Water rows are never ranked; a piece is a CREW result.

  "N of M logged" is shown only on a RANKED board, where who turned up is part
  of the result. On an averages board it read as a compliance score over a
  steady session, so there the row just says how many.

  This is the screen that replaces the spreadsheet: nobody types results into a
  shared sheet and hunts for their own name — everyone logs their own session
  (scanning the monitor photo if they like) and the board assembles itself.

  Data: the plan comes from planStore (which is where the coach's switch lives),
  the results from resultsStore, the outings from telemetryStore. Until a real
  export has been imported the water side shows ONE example outing transcribed
  from the owner's own PowerLine screen (lib/varsity/demoTelemetry.ts) — real
  numbers, gone the moment a real one exists. Colors are theme tokens; the
  category dot is a content color from data, applied via inline style (rule-1
  exception).

  A ROW WEARS ONE TAG, and it is the only one that changes what you are about
  to read: ERG or WATER. The EXAMPLE pill used to ride here too, and so did
  RANKED and the telemetry source (PEACH / SPEEDCOACH); all three came off on
  the owner's call — four pills down one line is a row you have to decode.

  THE EXAMPLE NO LONGER SAYS SO anywhere (owner, 2026-09-13): the tag on the
  board's top row and the line across the top of the water outing both came
  off. What it must still never do is write the VIEWER'S name onto a made-up
  result: seeing yourself ranked 22nd at a split you never pulled is not a
  lesson about the board, it is a lie about you.
*/
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppState";
import { useMembership } from "@/components/varsity/useMembership";
import WorkoutBoard from "@/components/varsity/team/WorkoutBoard";
import TelemetryOuting from "@/components/varsity/team/TelemetryOuting";
import { fetchPlan } from "@/lib/varsity/planStore";
import { demoTeamPlan, demoSquadSize } from "@/lib/varsity/demoWorkouts";
import { fetchResults, fetchSquadSize, type TeamResult } from "@/lib/varsity/resultsStore";
import { teamWorkouts, type TeamWorkout } from "@/lib/varsity/teamBoard";
import { sessionLabel, sessionColor, dayKeyLabel, parseSessionKey } from "@/lib/varsity/coachPlan";
import { fetchTrainingConfig } from "@/lib/varsity/configStore";
import { fetchOutings } from "@/lib/varsity/telemetryStore";
import { demoOutings } from "@/lib/varsity/demoTelemetry";
import { outingTotals, type TelemetryOuting as Outing } from "@/lib/varsity/telemetry";
import { IconChevronRight, IconSearch } from "@/components/icons";

/** "Fri 15 May · AM" for an outing's session key. */
function outingDateLabel(dayKey: string): string {
  const parsed = parseSessionKey(dayKey);
  return `${dayKeyLabel(dayKey)}${parsed ? ` · ${parsed.period}` : ""}`;
}

type Row ={ key: string; date: Date; erg?: TeamWorkout; water?: Outing };

/*
  SEARCH BY NAME OR DATE (owner 2026-09-14; first Coach Console only, then the
  Team tab too the same day). A row matches
  when every word typed is found in its name or in any of the ways its date is
  written: "Tue 22 Jun", "Tuesday", "June", "22/6", "6/22", "2026-06-22".
*/
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
function searchText(name: string, dateLabel: string, d: Date): string {
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const iso = `${d.getFullYear()}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return [name, dateLabel, WEEKDAYS[d.getDay()], MONTHS[d.getMonth()], `${day}/${month}`, `${month}/${day}`, `${day}.${month}.`, iso]
    .join(" ")
    .toLowerCase();
}

export default function TeamWorkouts({ inConsole = false }: { inConsole?: boolean } = {}) {
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
  const [openOuting, setOpenOuting] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      // Which types may carry a board is the coach's setting, so the plan is
      // read alongside the squad's config (the rowing default until it loads,
      // or for a squad that never opened Settings).
      const [plan, cfg] = await Promise.all([fetchPlan(), fetchTrainingConfig(teamId)]);
      const list = teamWorkouts(plan.sessions, cfg);
      if (!active) return;

      if (list.length > 0) {
        setWorkouts(list);
        const rows = await fetchResults(list.map((w) => w.dayKey));
        if (!active) return;
        setResults(rows);
      } else {
        // Nothing flagged yet → the worked example. Nobody real is in it: the
        // viewer's own name never goes on a result they didn't pull. The board
        // still obeys the coach's own canBoard switch, so the example shows the
        // same session types a real week would.
        const demo = demoTeamPlan(new Date());
        setWorkouts(teamWorkouts(demo.sessions, cfg));
        setResults(demo.results);
        setExample(true);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId, teamId]);

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
      }
    });
    return () => {
      active = false;
    };
  }, []);

  /* The turnout count on a LIST ROW here — the board itself stopped printing
     one. An example board counts against the EXAMPLE roster, never the real
     squad: "37 of 3 logged" is nonsense on a squad that hasn't signed up yet. */
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
    return [...ergRows, ...waterRows].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [workouts, outings]);

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shownRows = words.length
    ? rows.filter((row) => {
        const text = row.erg
          ? searchText(row.erg.session.description.trim() || sessionLabel(row.erg.session), row.erg.dateLabel, row.date)
          : searchText(`${row.water!.crew} ${row.water!.pieces.length} pieces`, outingDateLabel(row.water!.dayKey), row.date);
        return words.every((w) => text.includes(w));
      })
    : rows;

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
      {rows.length > 0 && (
        // The same search box the Team roster uses.
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
          <span className="text-muted">
            <IconSearch size={16} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or date"
            aria-label="Search workouts by name or date"
            className="w-full bg-transparent text-base text-text outline-none placeholder:text-muted"
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-[12px] text-muted">
            Nothing here yet.
          </div>
        )}
        {rows.length > 0 && shownRows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-[12px] text-muted">
            No workouts match.
          </div>
        )}
        {shownRows.map((row) => {
          if (row.erg) {
            const w = row.erg;
            const n = counts.get(w.dayKey) ?? 0;
            // The "of M" only where turning up is part of the result (ranked).
            const ofSquad = w.board === "ranked" && shownSquadSize ? ` of ${shownSquadSize}` : "";
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
                    {/* ONE TAG ON A ROW, and it is the only one that changes
                        what you are about to read: erg or water. RANKED went
                        — it is the shape of the board, which the board itself
                        shows the moment it opens — and so did EXAMPLE, on the
                        owner's call. */}
                    <span className="flex-shrink-0 rounded border border-border px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-muted">
                      Erg
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted">
                    {w.dateLabel} · {w.period} ·{" "}
                    {n === 0 ? "nobody logged yet" : `${n}${ofSquad} logged`}
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
          allOutings={outings}
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
          example={example}
          inConsole={inConsole}
          myId={userId}
          onClose={() => setOpen(null)}
          onOpenWorkout={(dayKey) => setOpen(dayKey)}
        />
      )}
    </div>
  );
}

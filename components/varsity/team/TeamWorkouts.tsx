"use client";

/*
  TEAM WORKOUTS — the Workouts half of the Team tab.
  ---------------------------------------------------------------------------
  Everything the squad measured, newest first, behind TWO TABS:

    ERG    — a session the coach flagged as a TEAM WORKOUT, with how many of
             the squad have logged it. Tap → its board (WorkoutBoard.tsx).
    WATER  — an outing with telemetry attached (Peach PowerLine / SpeedCoach),
             with its crew and how many pieces. Tap → its pieces
             (TelemetryOuting.tsx), then a piece → the crew's numbers. This is
             where the water work goes, races most of all.
  Water rows are never ranked; a piece is a CREW result.

  THE SWITCH IS BACK (owner, 2026-09-20). These two were merged into one list
  in date order, on the argument that a week is read as one week and a row's
  Erg/Water tag was enough to tell them apart. It isn't: the two are not the
  same question — an erg board is every individual ranked, a water row is one
  crew's piece — and with races going on the water side, looking down the
  season's races meant scrolling past every erg test in between. So: two tabs,
  each its own list, and no tag on the rows (the tab overhead already says
  which you are reading). The search belongs to the tab you are on.

  Which tab opens is DERIVED, not remembered: Erg unless there is nothing on
  it, so a squad whose coach has flagged no boards yet doesn't land on a blank
  screen while its outings sit one tap away. The moment anyone taps, their
  choice wins.

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

/** The two halves of this screen. */
type Side = "erg" | "water";

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
  /* Which listed workouts are the worked example, by day key — the rest are
     the squad's own. Empty once a real result exists. */
  const [exampleKeys, setExampleKeys] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState<string | null>(null);
  // the water side
  const [outings, setOutings] = useState<Outing[]>([]);
  const [openOuting, setOpenOuting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  /* null until someone taps: the tab is derived from what is here (see the
     note up top), and pinned to their choice from the first tap on. */
  const [picked, setPicked] = useState<Side | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      // Which types may carry a board is the coach's setting, so the plan is
      // read alongside the squad's config (the rowing default until it loads,
      // or for a squad that never opened Settings).
      const [plan, cfg] = await Promise.all([fetchPlan(), fetchTrainingConfig(teamId)]);
      const list = teamWorkouts(plan.sessions, cfg);
      if (!active) return;

      const rows = list.length ? await fetchResults(list.map((w) => w.dayKey)) : [];
      if (!active) return;

      if (rows.length > 0) {
        // Somebody real has logged a board: the squad's own results, nothing else.
        setWorkouts(list);
        setResults(rows);
      } else {
        /*
          NOBODY HAS LOGGED A RESULT YET → the worked example (demoWorkouts.ts),
          next to whatever the coach has flagged. The rule used to be "no
          flagged session at all": the day the squad's real plan went in
          (2026-09-21) it carried one flagged session, the example vanished,
          and the Erg tab was a blank list — "before, I liked it" (owner, same
          day). So the example now stays until the first REAL result exists,
          and the real flagged sessions are listed with it (each saying
          nobody has logged it yet), never hidden by it. An example piece
          that falls on a session the coach flagged gives way to the real one.
        */
        const demo = demoTeamPlan(new Date());
        const real = new Set(list.map((w) => w.dayKey));
        const examples = teamWorkouts(demo.sessions, cfg).filter((w) => !real.has(w.dayKey));
        setWorkouts([...list, ...examples]);
        setResults(demo.results.filter((r) => !real.has(r.dayKey)));
        setExampleKeys(new Set(examples.map((w) => w.dayKey)));
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
  const squadSizeFor = (dayKey: string) => (exampleKeys.has(dayKey) ? demoSquadSize : squadSize);

  // How many results each workout has, so the list can show it without
  // re-filtering inside the render loop.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of results) map.set(r.dayKey, (map.get(r.dayKey) ?? 0) + 1);
    return map;
  }, [results]);

  /* A list per side, each newest first. */
  const byDate = (a: Row, b: Row) => b.date.getTime() - a.date.getTime();
  const ergRows = useMemo<Row[]>(
    () => workouts.map((w) => ({ key: `erg:${w.dayKey}`, date: w.date, erg: w })).sort(byDate),
    [workouts],
  );
  const waterRows = useMemo<Row[]>(
    () =>
      outings
        .map((o) => ({
          key: `water:${o.id}`,
          date: parseSessionKey(o.dayKey)?.date ?? new Date(0),
          water: o,
        }))
        .sort(byDate),
    [outings],
  );

  /* Erg, unless there is nothing on it and there IS something on the water. */
  const side: Side = picked ?? (ergRows.length === 0 && waterRows.length > 0 ? "water" : "erg");
  const rows = side === "erg" ? ergRows : waterRows;

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
      {/* ERG | WATER — the same full-width switch the Team tab uses above the
          roster: the two halves ARE the box, no inset pill, and overflow-hidden
          is what lets the selected fill take the rounded corners with it. */}
      <div className="mb-3 flex overflow-hidden rounded-xl border border-border bg-surface">
        {(["erg", "water"] as Side[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setPicked(t);
              setQuery(""); // a search belongs to the list it was typed into
            }}
            className={`flex-1 py-2.5 text-[12px] font-semibold capitalize transition-colors ${
              side === t ? "bg-text text-background" : "text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {rows.length > 0 && (
        // The same search bubble the Team roster uses — white since 2026-09-16 (owner: "it's gray, it should be white").
        <div className="mb-3 flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5">
          <span className="text-muted">
            <IconSearch size={16} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            /* Just "Search" (owner, 2026-09-14). What you can type into it is
               something you find out by typing; the label was spending the
               width of the field explaining itself. The spoken label still
               says which search this is, for a screen reader. */
            placeholder="Search"
            aria-label="Search workouts"
            className="w-full bg-transparent text-base text-text outline-none placeholder:text-muted"
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-[12px] text-muted">
            {side === "erg" ? "No erg workouts yet." : "No water outings yet."}
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
            const squad = squadSizeFor(w.dayKey);
            const ofSquad = w.board === "ranked" && squad ? ` of ${squad}` : "";
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
                    {/* NO TAG. A row used to wear ERG or WATER — the one thing
                        that changed what you were about to read — back when
                        both were in one list. The tab above says it now. */}
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
          example={exampleKeys.has(opened.dayKey)}
          inConsole={inConsole}
          myId={userId}
          onClose={() => setOpen(null)}
          onOpenWorkout={(dayKey) => setOpen(dayKey)}
        />
      )}
    </div>
  );
}

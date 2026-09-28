"use client";

/*
  THE RANKINGS — the Coach Console's third view on Workouts, beside Erg and
  Water (owner, 2026-09-27: "for coaches we want to do some athletes ranking").
  ---------------------------------------------------------------------------
  Coaches only: TeamWorkouts offers it in the console and nowhere else, and
  the console's Workouts tab is a coach's alone.

  THREE LISTS, never one score (lib/varsity/ranking.ts): ERG — points by place
  on every ranked erg test; WATER — pieces won on the timing sheets; and
  CONSISTENCY — the plan's sessions done, the ones logged on top, and the days
  out. Then the window: Month, Semester, or two dates.

  A LIST, NOT A LEADERBOARD (owner, 2026-09-27). It was dressed for one round
  like the students' boards — a podium, medals — and the owner took it back
  off: "it's for coaches, so you don't need to do these top leaderboards. Just
  make them normal… on the left, you can do a little bit more gold, but still
  1, 2, 3. Don't put medals and other emojis there." So the rows are the
  spreadsheet from the first round, in white, and the first three places on
  the left are gold, silver and bronze with the number on them. What stayed
  from the dressed round is what the owner kept: a face beside every name, and
  the places piece by piece — "so they see first, second, third, and fourth" —
  on the erg's tests and on every water piece, a medal place in its metal's
  colour.

  WHICH SESSIONS, ON TOP (owner, 2026-09-28: "make sure that we know which
  pieces we were doing somewhere on top, so I'm going to see which piece it
  was"). A column only has the width for a day and a name cut short, and on
  the water every session's pieces are just "Piece 1", "Piece 2"; so above the
  list, one line per session — its day, and the plan's own words for it
  ("3×5' at r30, 2k+2") — and in the list's header that same day in the same
  grey tag, once, across all of that session's columns.

  Erg is made of what the Workouts tab already read — the boards and their
  results — so it can never disagree with a board a coach opens; while the Erg
  side is still the worked example, so is this, and it says so. Water reads
  the timing sheets the same tab already has. Consistency reads the squad's
  own logs, the published plan and the days out — only when it is opened, and
  only for a coach (can.readTraining), the same reads the team statistics make.

  A person who has an account opens their console page from their row. Water
  knows people by their SEAT on the roster (racePieces.crewPeople — so two
  rowers who share a surname are two rows), not by their account, so it has
  no page to open. Colours are theme tokens; the three metals are the app's
  own tokens (--podium-1..3).
*/
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Dropdown from "@/components/varsity/profile/Dropdown";
import DatesSheet, { type Dates } from "@/components/varsity/team/DatesSheet";
import RankBadge from "@/components/varsity/team/RankBadge";
import ExampleTag from "@/components/varsity/ExampleTag";
import Segmented from "@/components/ui/Segmented";
import Avatar from "@/components/messages/Avatar";
import { useMembership } from "@/components/varsity/useMembership";
import { can, fetchSquad } from "@/lib/varsity/membership";
import { fetchSquadLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { fetchPlan } from "@/lib/varsity/planStore";
import { publishedSessions } from "@/lib/varsity/athleteHome";
import { fetchOutDaysBetween } from "@/lib/varsity/squadDaysOut";
import { classTitle } from "@/lib/varsity/racePieces";
import { dayKeyLabel, sessionLabel } from "@/lib/varsity/coachPlan";
import { TEAM_CUSTOM_RANGE, customTeamRange, teamRangeByKey, toIso } from "@/lib/varsity/teamStats";
import {
  consistencyRanking,
  defaultRankingRange,
  ergRanking,
  ergTests,
  ordinal,
  rankingLists,
  rankingRanges,
  rankingSpan,
  sessionRuns,
  waterRanking,
  type RankingList,
  type SessionRun,
} from "@/lib/varsity/ranking";
import type { TeamWorkout } from "@/lib/varsity/teamBoard";
import type { TeamResult } from "@/lib/varsity/resultsStore";
import type { RaceDay } from "@/lib/varsity/racePieces";
import type { SessionMap } from "@/lib/varsity/coachPlan";
import type { Boat } from "@/lib/varsity/coachLineup";

/* The header row of a list — the race board's. */
const TH = "text-[9px] font-semibold uppercase tracking-[0.1em] text-muted";
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CARD = "overflow-x-auto overscroll-x-contain rounded-2xl border border-border bg-surface shadow-card";
const EMPTY = "rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] text-muted";

/* What an empty window says, in the words of the choice that made it. */
const noneIn = (key: string, label: string) =>
  key === "month" ? "the last month" : key === "semester" ? "the semester" : label;

/* The three metals: a solid fill for a place in the list, a wash behind a
   place in a piece. Literal class names, so the stylesheet keeps them. */
const METAL_FILL: Record<number, string> = { 1: "bg-podium-1", 2: "bg-podium-2", 3: "bg-podium-3" };
const METAL_TINT: Record<number, string> = { 1: "bg-podium-1-tint", 2: "bg-podium-2-tint", 3: "bg-podium-3-tint" };

/* A place in the list: 1, 2 and 3 on gold, silver and bronze, the race
   board's round grey badge after them, and a dash for somebody who has not
   scored at all — a list where everybody is level at nothing has no first
   place to hand out (the leaderboards' own rule). */
function Place({ rank, scored }: { rank: number; scored: boolean }) {
  if (!scored) return <span className="flex h-[22px] w-[22px] items-center justify-center text-[12px] text-muted">–</span>;
  const fill = METAL_FILL[rank];
  if (!fill) return <RankBadge rank={rank} />;
  return (
    <span
      className={`flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums text-podium-ink ${fill}`}
    >
      {rank}
    </span>
  );
}

/* A person: the Messages avatar and the name. */
function Who({ name }: { name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar size={26} name={name} />
      <span className="truncate text-[13px] font-semibold text-text">{name}</span>
    </span>
  );
}

/* Where somebody finished one test or piece: a medal place sits on its
   metal's wash, every other place is plain, and one they did not row is a
   dash. `under` is a word beneath it — the class of the boat, on the water. */
function PiecePlace({ place, under }: { place: number | null; under?: string }) {
  if (place == null) return <span className="text-right text-[12px] text-muted">—</span>;
  const tint = METAL_TINT[place];
  return (
    <span className="flex flex-col items-end leading-tight">
      <span
        className={`rounded-md px-1.5 py-0.5 text-[12px] tabular-nums ${tint ? `${tint} font-semibold text-text` : "text-muted"}`}
      >
        {ordinal(place)}
      </span>
      {under && <span className="mt-0.5 pr-1.5 font-mono text-[9px] text-muted">{under}</span>}
    </span>
  );
}

/* One row of a list — a link to the rower's console page when there is one. */
function Row({
  i,
  first,
  cols,
  href,
  children,
}: {
  i: number;
  first: boolean;
  cols: string;
  href?: string;
  children: React.ReactNode;
}) {
  const cls = `grid items-center gap-1.5 px-2.5 py-2 ${i > 0 ? "border-t border-border" : ""} ${first ? "bg-surface-2" : ""}`;
  return href ? (
    <Link href={href} className={`${cls} active:bg-surface-2`} style={{ gridTemplateColumns: cols }}>
      {children}
    </Link>
  ) : (
    <div className={cls} style={{ gridTemplateColumns: cols }}>
      {children}
    </div>
  );
}

/* A session's day in a grey tag — the SAME tag over its columns and beside
   its words above the list, so the eye carries one to the other. `half` is
   AM or PM, written only when two sessions share the day. Over the columns
   the day STAYS IN SIGHT while any of its pieces are (`band`): the list
   scrolls sideways, and a tag across three pieces would otherwise slide its
   day out of the screen while two of them are still on it. */
function DayTag({ day, half, big = false, band = false }: { day: string; half?: string; big?: boolean; band?: boolean }) {
  return (
    <span
      className={`flex w-full items-center justify-center rounded-[5px] bg-surface-2 px-1.5 py-[3px] text-center font-semibold uppercase leading-tight text-text ${
        big ? "text-[10px] tracking-[0.06em]" : "text-[9px] tracking-[0.08em]"
      }`}
    >
      <span className={`min-w-0 max-w-full truncate ${band ? "sticky left-3 right-3" : ""}`}>
        {day}
        {half && <span className="block">{half}</span>}
      </span>
    </span>
  );
}

/* One session of a list: its day, and what the plan called it. */
type KeyItem = { key: string; day: string; half?: string; words: string };

/* The key folds past this many sessions — a semester of timing sheets would
   otherwise push the list itself off the screen — to the first six. */
const KEY_FOLD = 8;
const KEY_FOLDED = 6;

/*
  WHAT WAS ROWED — the list's sessions above it, oldest first like its
  columns: the day in its tag, and the plan's own words beside it, in full.
*/
function SessionKey({ items }: { items: KeyItem[] }) {
  const [all, setAll] = useState(false);
  const folds = items.length > KEY_FOLD;
  const shown = folds && !all ? items.slice(0, KEY_FOLDED) : items;
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      {shown.map((it, i) => (
        <div key={it.key} className={`flex items-start gap-2.5 px-3 py-2 ${i > 0 ? "border-t border-border" : ""}`}>
          <span className="w-[5.2rem] flex-shrink-0">
            <DayTag day={it.day} half={it.half} big />
          </span>
          <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-text">{it.words}</span>
        </div>
      ))}
      {folds && (
        <button
          type="button"
          onClick={() => setAll((a) => !a)}
          className="block w-full border-t border-border px-3 py-2.5 text-left text-[12px] font-semibold text-muted active:bg-surface-2"
        >
          {all ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}

/*
  THE HEADER OF A LIST WITH A COLUMN PER PIECE, on two lines: each session's
  day once, in its tag, across all of that session's columns — three pieces
  of one timing sheet are three columns under one "5 Sep" — and under it
  every column's own name, the test ("5k TEST") or the piece ("Piece 2").
*/
function ListHead({
  cols,
  score,
  runs,
  names,
}: {
  cols: string;
  /** The heading of the number the list is ordered by: Pts, Wins. */
  score: string;
  runs: (SessionRun & { day: string; half?: string })[];
  names: { key: string; name: string; full?: string }[];
}) {
  return (
    <div className="border-b border-border px-2.5 py-2">
      {/* Stretched, so a day that has to say AM or PM on a second line does
          not leave its neighbours' tags shorter beside it. */}
      <div className="grid items-stretch gap-x-1.5" style={{ gridTemplateColumns: cols }}>
        <span />
        <span />
        <span />
        {runs.map((r) => (
          <span key={r.dayKey} className="flex min-w-0" style={{ gridColumn: `span ${r.count}` }}>
            <DayTag day={r.day} half={r.half} band />
          </span>
        ))}
      </div>
      <div className={`mt-1.5 grid items-end gap-x-1.5 ${TH}`} style={{ gridTemplateColumns: cols }}>
        <span />
        <span>Athlete</span>
        <span className="text-right">{score}</span>
        {names.map((n) => (
          <span key={n.key} className="min-w-0 truncate text-right" title={n.full}>
            {n.name}
          </span>
        ))}
      </div>
    </div>
  );
}

const athleteHref = (id: string) => `/varsity/coach/athlete/${id}`;
const dayLabel = (d: Date) => `${d.getDate()} ${MO[d.getMonth()]}`;

/* Each session's day as a header or the key writes it, with AM or PM only
   where another session in the list falls on the same day. */
function labelRuns(runs: SessionRun[]) {
  return runs.map((r) => {
    const shared = runs.some((o) => o.dayKey !== r.dayKey && dayLabel(o.date) === dayLabel(r.date));
    return { ...r, day: dayLabel(r.date), half: shared ? r.period : undefined };
  });
}

/* The consistency list's reads, for one window. */
type SquadRead = {
  key: string;
  people: { id: string; name: string }[];
  logs: Record<string, LogEntry[]>;
  outDays: Record<string, number>;
};

export default function TeamRanking({
  workouts,
  results,
  exampleKeys,
  races,
  raceBoats,
  raceTitle,
}: {
  /** Every board on the Workouts tab, worked examples included. */
  workouts: TeamWorkout[];
  results: TeamResult[];
  /** Which of those boards are the worked example. */
  exampleKeys: Set<string>;
  /** The timing sheets on the Water side. */
  races: RaceDay[];
  /** Those sessions' lineup boats — who sat where, so two rowers who share a
      surname are told apart. */
  raceBoats: Record<string, Boat[]>;
  /** The plan's words for a timing sheet's session, as its row on the Water
      side says them. */
  raceTitle: (dayKey: string) => string;
}) {
  const now = useMemo(() => new Date(), []);
  const [list, setList] = useState<RankingList>("erg");
  const [rangeKey, setRangeKey] = useState(defaultRankingRange);
  /* Two dates the coach chose. While set, they ARE the window. */
  const [custom, setCustom] = useState<Dates | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [picking, setPicking] = useState(false);

  const range = useMemo(
    () => (custom ? customTeamRange(custom.start, custom.end) : teamRangeByKey(rangeKey)),
    [custom, rangeKey],
  );
  const span = useMemo(() => rankingSpan(range, now), [range, now]);

  /* ── Erg ── */
  const tests = useMemo(() => ergTests(workouts, span), [workouts, span]);
  const erg = useMemo(() => ergRanking(workouts, results, span), [workouts, results, span]);
  const example = tests.some((t) => exampleKeys.has(t.dayKey));

  /* ── Water ── */
  const water = useMemo(() => waterRanking(races, span, raceBoats), [races, span, raceBoats]);

  /* ── Consistency: the squad's logs, the published plan, the days out ── */
  const { membership } = useMembership();
  const teamId = membership?.teamId ?? null;
  const canRead = !!membership?.role && can.readTraining(membership.role);
  const squadKey = `${teamId}:${span.startIso}:${span.endIso}`;
  const [squad, setSquad] = useState<SquadRead | null>(null);
  const [plan, setPlan] = useState<SessionMap | null>(null);
  useEffect(() => {
    if (list !== "consistency" || !teamId || !canRead) return;
    let active = true;
    const empty: SquadRead = { key: squadKey, people: [], logs: {}, outDays: {} };
    (async () => {
      const members = (await fetchSquad(teamId)).filter((m) => m.status === "approved" && m.role !== "coach");
      const ids = members.map((m) => m.userId);
      const [logs, outDays] = await Promise.all([
        fetchSquadLogsInRange(ids, span.startIso, span.endIso),
        fetchOutDaysBetween(span.startIso, span.endIso),
      ]);
      if (active) setSquad({ key: squadKey, people: members.map((m) => ({ id: m.userId, name: m.name })), logs, outDays });
    })().catch(() => active && setSquad(empty));
    return () => {
      active = false;
    };
  }, [list, teamId, canRead, squadKey, span]);
  useEffect(() => {
    if (list !== "consistency" || plan) return;
    let active = true;
    fetchPlan()
      .then((p) => active && setPlan(publishedSessions(p)))
      .catch(() => active && setPlan({}));
    return () => {
      active = false;
    };
  }, [list, plan]);
  const squadHere = squad && squad.key === squadKey ? squad : null;
  const consistency = useMemo(
    () =>
      squadHere && plan
        ? consistencyRanking(squadHere.people, squadHere.logs, plan, span, squadHere.outDays)
        : null,
    [squadHere, plan, span],
  );
  const consistencyLoading = canRead && !!teamId && consistency === null;

  /* Which sessions each list is made of: a run of columns per session, for
     the header, and the same sessions spelled out for the key above it. */
  const ergRuns = useMemo(() => labelRuns(sessionRuns(tests)), [tests]);
  const waterRuns = useMemo(() => labelRuns(sessionRuns(water.pieces)), [water.pieces]);
  const testWords = (w: TeamWorkout) => w.session.description.trim() || sessionLabel(w.session);
  const ergKey: KeyItem[] = ergRuns.map((r) => ({
    key: r.dayKey,
    day: dayKeyLabel(r.dayKey),
    half: r.half,
    words: testWords(tests.find((t) => t.dayKey === r.dayKey)!),
  }));
  const waterKey: KeyItem[] = waterRuns.map((r) => ({
    key: r.dayKey,
    day: dayKeyLabel(r.dayKey),
    half: r.half,
    words: raceTitle(r.dayKey),
  }));

  /*
    THE COLUMNS. The place, the person, THE NUMBER THE LIST IS ORDERED BY
    beside the name — at the end of a row it fell off a phone's screen — and
    then the detail: a column per erg test or water piece, or the plan's
    counts. Whatever does not fit scrolls sideways; the ranking never does.
  */
  const ergCols = `1.6rem minmax(0,1fr) 2.6rem repeat(${tests.length}, 3rem)`;
  const ergMin = `${1.6 + 9.5 + 2.6 + tests.length * 3 + (tests.length + 2) * 0.375 + 1.25}rem`;
  const waterCols = `1.6rem minmax(0,1fr) 2.6rem repeat(${water.pieces.length}, 3rem)`;
  const waterMin = `${1.6 + 9.5 + 2.6 + water.pieces.length * 3 + (water.pieces.length + 2) * 0.375 + 1.25}rem`;
  /* Consistency's plan count rides UNDER its percentage rather than in a
     column of its own: four columns of numbers cut every full name short. */
  const consCols = "1.6rem minmax(0,1fr) 2.9rem 2.4rem 2.1rem";

  const rangeOptions = [
    ...rankingRanges.map((r) => ({ key: r.key, label: r.label })),
    { key: TEAM_CUSTOM_RANGE, label: "Choose dates…" },
  ];

  return (
    <div>
      {/* ERG | WATER | CONSISTENCY, and the window beside it. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented options={rankingLists} value={list} onChange={setList} ariaLabel="Ranking" />
        <Dropdown
          label={range.label}
          options={rangeOptions}
          value={range.key}
          open={menuOpen}
          onOpen={setMenuOpen}
          align="right"
          onPick={(k) => {
            setMenuOpen(false);
            if (k === TEAM_CUSTOM_RANGE) setPicking(true);
            else {
              setCustom(null);
              setRangeKey(k);
            }
          }}
        />
      </div>

      {list === "erg" && example && erg.length > 0 && (
        <div className="mt-2 flex justify-end">
          <ExampleTag />
        </div>
      )}

      <div className="mt-3">
        {/* ── ERG ── points, then the place on every test. */}
        {list === "erg" &&
          (erg.length === 0 ? (
            <div className={EMPTY}>No ranked erg tests in {noneIn(range.key, range.label)}.</div>
          ) : (
            <>
              <SessionKey items={ergKey} />
              <div className={CARD}>
                <div style={{ minWidth: ergMin }}>
                  <ListHead
                    cols={ergCols}
                    score="Pts"
                    runs={ergRuns}
                    names={tests.map((t) => ({
                      key: t.dayKey,
                      name: t.session.description.trim() || "Erg",
                      full: t.session.description.trim() || undefined,
                    }))}
                  />
                  {erg.map((r, i) => (
                    <Row
                      key={r.athleteId}
                      i={i}
                      first={r.rank === 1}
                      cols={ergCols}
                      /* A worked example's people have no page to open. */
                      href={example ? undefined : athleteHref(r.athleteId)}
                    >
                      <Place rank={r.rank} scored={r.points > 0} />
                      <Who name={r.name || "Unnamed"} />
                      <span className="text-right text-[14px] font-bold tabular-nums text-text">{r.points}</span>
                      {r.places.map((p, k) => (
                        <PiecePlace key={k} place={p?.place ?? null} />
                      ))}
                    </Row>
                  ))}
                </div>
              </div>
            </>
          ))}

        {/* ── WATER ── wins, then where their boat finished in every piece,
            with the class it was in. */}
        {list === "water" &&
          (water.rows.length === 0 ? (
            <div className={EMPTY}>No timed race pieces in {noneIn(range.key, range.label)}.</div>
          ) : (
            <>
              <SessionKey items={waterKey} />
              <div className={CARD}>
                <div style={{ minWidth: waterMin }}>
                  <ListHead
                    cols={waterCols}
                    score="Wins"
                    runs={waterRuns}
                    names={water.pieces.map((p) => ({ key: p.id, name: p.name }))}
                  />
                  {water.rows.map((r, i) => (
                    <Row key={r.key} i={i} first={r.rank === 1 && r.wins > 0} cols={waterCols}>
                      <Place rank={r.rank} scored={r.wins > 0} />
                      <Who name={r.name} />
                      <span className="text-right text-[14px] font-bold tabular-nums text-text">{r.wins}</span>
                      {r.places.map((p, k) => (
                        <PiecePlace key={k} place={p?.place ?? null} under={p ? classTitle(p.badge) : undefined} />
                      ))}
                    </Row>
                  ))}
                </div>
              </div>
            </>
          ))}

        {/* ── CONSISTENCY ── the plan's share done (and what of), the
            sessions on top, the days out. */}
        {list === "consistency" &&
          (consistencyLoading ? (
            <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="skeleton block h-[52px] rounded-2xl" />
              ))}
            </div>
          ) : !consistency || consistency.length === 0 ? (
            <div className={EMPTY}>Nobody on the squad yet.</div>
          ) : (
            <div className={CARD}>
              <div className={`grid items-end gap-1.5 border-b border-border px-2.5 py-2 ${TH}`} style={{ gridTemplateColumns: consCols }}>
                <span />
                <span>Athlete</span>
                <span className="text-right">Done</span>
                <span className="text-right">Extra</span>
                <span className="text-right">Out</span>
              </div>
              {consistency.map((r, i) => (
                <Row key={r.id} i={i} first={r.rank === 1 && (r.share ?? 0) > 0} cols={consCols} href={athleteHref(r.id)}>
                  <Place rank={r.rank} scored={(r.share ?? 0) > 0} />
                  <Who name={r.name} />
                  <span className="text-right leading-tight">
                    <span className="block text-[14px] font-bold tabular-nums text-text">
                      {r.share == null ? "—" : `${r.share}%`}
                    </span>
                    {r.planned > 0 && (
                      <span className="block text-[10px] tabular-nums text-muted">
                        {r.done}/{r.planned}
                      </span>
                    )}
                  </span>
                  <span className={`text-right text-[12px] tabular-nums ${r.extra > 0 ? "font-semibold text-text" : "text-muted"}`}>
                    {r.extra}
                  </span>
                  <span className={`text-right text-[12px] tabular-nums ${r.out > 0 ? "font-semibold text-text" : "text-muted"}`}>
                    {r.out}
                  </span>
                </Row>
              ))}
            </div>
          ))}
      </div>

      {picking && (
        <DatesSheet
          start={span.startIso}
          end={span.endIso}
          today={toIso(now)}
          onApply={(d) => {
            setCustom(d);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}

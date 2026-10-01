"use client";

/*
  THE RANKINGS — the Coach Console's third view on Workouts, beside Erg and
  Water (owner, 2026-09-27: "for coaches we want to do some athletes ranking").
  ---------------------------------------------------------------------------
  Coaches only: TeamWorkouts offers it in the console and nowhere else, and
  the console's Workouts tab is a coach's alone.

  FOUR LISTS, never one score (lib/varsity/ranking.ts): ERG — points by place
  on every ranked erg test; WATER — pieces won on the timing sheets;
  CONSISTENCY — the plan's sessions done, the ones logged on top, and the days
  out; and SEAT RACES — who beat whom in the switches made between pieces
  (2026-10-01; it was a screen of its own). That one is NOT a ranking: only the
  people who seat raced, each with who they beat and who beat them, and by how
  many seconds. Then the window: Month, Semester, or two dates.

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

  WHICH WORKOUT EACH COLUMN WAS (owner, 2026-09-28: "make sure that we know
  which pieces we were doing somewhere on top"). Each session wears one grey
  tag across its columns at the top of the list — its day and the start of
  the plan's words — and a tap grows it to the whole workout (SessionTag). A
  list of the sessions ABOVE the table was tried first and taken off the same
  day: "by top of the sheet, not overview above".

  Erg is made of what the Workouts tab already read — the boards and their
  results — so it can never disagree with a board a coach opens; while the Erg
  side is still the worked example, so is this (the owner took its Example
  tag off this list, 2026-09-28). Water reads
  the timing sheets the same tab already has. Consistency reads the squad's
  own logs, the published plan and the days out — only when it is opened, and
  only for a coach (can.readTraining), the same reads the team statistics make.

  A person who has an account opens their console page from their row. Water
  knows people by their SEAT on the roster (racePieces.crewPeople — so two
  rowers who share a surname are two rows), not by their account, so it has
  no page to open. Colours are theme tokens; the three metals are the app's
  own tokens (--podium-1..3).
*/
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Dropdown from "@/components/varsity/profile/Dropdown";
import DatesSheet, { type Dates } from "@/components/varsity/team/DatesSheet";
import RankBadge from "@/components/varsity/team/RankBadge";
import Segmented from "@/components/ui/Segmented";
import Avatar from "@/components/messages/Avatar";
import { IconX } from "@/components/icons";
import { useMembership } from "@/components/varsity/useMembership";
import { can, fetchSquad } from "@/lib/varsity/membership";
import { fetchSquadLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { fetchPlan } from "@/lib/varsity/planStore";
import { publishedSessions } from "@/lib/varsity/athleteHome";
import { fetchOutDaysBetween } from "@/lib/varsity/squadDaysOut";
import { classTitle } from "@/lib/varsity/racePieces";
import { secs, type Opponent } from "@/lib/varsity/raceSwitch";
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
  seatRacers,
  sessionRuns,
  waterRanking,
  withoutRest,
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
/* The list's own headings — Athlete, Pts, Wins, Done — at the size of the
   workouts beside them, not the size of a footnote under them (owner,
   2026-09-28: "make Athlete and Pts bigger so they sit with the workouts"). */
const HEAD = "text-[11px] font-semibold uppercase tracking-[0.1em] text-muted";
/* One gap between every column, the header's and every row's, so they line up. */
const GAP = "gap-x-1";
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
/* Centred under its workout's tag (owner, 2026-09-28: "centre it all") — it
   sat against the right edge of the column, under a tag centred above it. */
function PiecePlace({ place, under }: { place: number | null; under?: string }) {
  if (place == null) return <span className="text-center text-[12px] text-muted">—</span>;
  const tint = METAL_TINT[place];
  return (
    <span className="flex flex-col items-center leading-tight">
      <span
        className={`rounded-md px-1.5 py-0.5 text-[12px] tabular-nums ${tint ? `${tint} font-semibold text-text` : "text-muted"}`}
      >
        {ordinal(place)}
      </span>
      {under && <span className="mt-0.5 font-mono text-[9px] text-muted">{under}</span>}
    </span>
  );
}

/* ONE LINE OF A ROWER'S SEAT RACES: the word, then each person and by how many
   seconds ("Pierce Lapham 8.8 s"; "3.5 · 1.2 s" when they met more than once).
   The wins are the ink and the losses the grey, so a quick look reads the wins.
   It sits under the name, in line with it (the avatar's width and its gap). */
function Meetings({ word, list, strong = false }: { word: string; list: Opponent[]; strong?: boolean }) {
  return (
    <div className="mt-1.5 flex items-baseline gap-2 pl-[34px]">
      <span className="w-[3.1rem] flex-shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{word}</span>
      <span className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5">
        {list.map((o) => (
          <span key={o.key} className={`text-[13px] ${strong ? "text-text" : "text-muted"}`}>
            <span className={strong ? "font-semibold" : ""}>{o.name}</span>{" "}
            <span className="tabular-nums">{o.by.map(secs).join(" · ")} s</span>
          </span>
        ))}
      </span>
    </div>
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
  const cls = `grid items-center ${GAP} px-2.5 py-2 ${i > 0 ? "border-t border-border" : ""} ${first ? "bg-surface-2" : ""}`;
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

/*
  WHICH WORKOUT A COLUMN WAS — in the list's header, not above it (owner,
  2026-09-28, after a first round put a list of the sessions over the table:
  "by showing the workouts I meant by top of the sheet, not overview above,
  delete that, but make it wider or taller on top — I want to see at least an
  indication of the workout, and then when you click it, it will grow bigger
  so you can see it").

  So each session wears ONE grey tag across all of its columns — three pieces
  of one timing sheet are three columns under one tag — with its day, and
  under the day as much of the plan's words as two lines of the tag hold
  ("3×5' at r30, 2k+2"). A tap GROWS it: the tag turns black, and the whole
  workout — weekday, half of the day, every word — drops down under the
  header across the full width of the list (GrownWorkout), so it is never cut
  off by the list's edge however far along the tag sits. A tap on it, on
  another tag or anywhere else puts it back.

  The day and the words STAY IN SIGHT while any of the session's columns are
  (sticky inside the tag): the list scrolls sideways, and a tag across three
  pieces would otherwise slide its words off the screen while two of those
  pieces are still on it.

  THE WORKOUT IS THE BIG LINE (owner, 2026-09-28: "the workouts aren't
  visible… so when I look at it I know straight away what workout it was").
  The day had the dark letters and the workout was a grey footnote, cut to
  "8×500 / m, 1:3…". Now the workout is the line you read — dark, the size of
  the places under it, without its rest (withoutRest) so it fits — and the day
  is the small grey line above it. Everything in the tag is centred both ways,
  so a one-line workout next to a two-line one leaves no gap under it.
*/
type Run = SessionRun & { col: number; day: string; half?: string; when: string; words: string; short: string };

function SessionTag({ run, open, onToggle }: { run: Run; open: boolean; onToggle: () => void }) {
  return (
    <span data-session-tag className="flex min-w-0" style={{ gridColumn: `${run.col} / span ${run.count}`, gridRow: 1 }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${run.when}: ${run.words}`}
        className={`flex w-full min-w-0 items-center justify-center rounded-[6px] px-0.5 py-1 text-center transition-colors ${
          open ? "bg-text" : "bg-surface-2 active:bg-border"
        }`}
      >
        <span className="sticky left-3 right-3 min-w-0 max-w-full">
          <span
            className={`block truncate text-[9px] font-semibold uppercase tracking-[0.08em] ${open ? "text-background/70" : "text-muted"}`}
          >
            {run.day}
            {run.half ? ` ${run.half}` : ""}
          </span>
          <span
            className={`line-clamp-2 break-words text-[12px] font-semibold leading-[1.2] ${
              open ? "text-background" : "text-text"
            }`}
          >
            {run.short}
          </span>
        </span>
      </button>
    </span>
  );
}

/* THE TAG, GROWN — the whole workout, under the header, the list's width. */
function GrownWorkout({ run, top, onClose }: { run: Run; top: number; onClose: () => void }) {
  return (
    <button
      type="button"
      data-session-tag
      onClick={onClose}
      style={{ top }}
      className="absolute inset-x-1.5 z-20 origin-top rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left shadow-card [animation:cal-month-expand_0.2s_ease-out]"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{run.when}</span>
        <span className="text-muted">
          <IconX size={12} />
        </span>
      </span>
      <span className="mt-1 block text-[14px] font-semibold leading-snug text-text">{run.words}</span>
    </button>
  );
}

/*
  THE HEADER OF A LIST WITH A COLUMN PER PIECE: each session's tag once across
  its columns (SessionTag), and — on the water only — every piece's name under
  it ("Piece 2"); an erg test's name is its session's words, already in the
  tag, so the erg header is the one line.

  Athlete and the score sit IN THAT LINE, centred on its height (owner,
  2026-09-28). They were a row of their own under the tags, which left an
  empty block over the names and the headings small at its foot.
*/
function ListHead({
  headRef,
  cols,
  score,
  runs,
  names,
  open,
  onOpen,
}: {
  /** The header itself, so a grown tag can drop down just under it. */
  headRef: React.Ref<HTMLDivElement>;
  cols: string;
  /** The heading of the number the list is ordered by: Pts, Wins. */
  score: string;
  runs: Run[];
  names: { key: string; name: string }[];
  /** The session whose tag is grown, by day key. */
  open: string | null;
  onOpen: (dayKey: string | null) => void;
}) {
  const named = names.some((n) => n.name);
  /* The headings span both lines when there are piece names under the tags. */
  const rows = named ? "1 / span 2" : "1";
  return (
    <div ref={headRef} className="border-b border-border px-2.5 py-1.5">
      <div className={`grid items-stretch ${GAP} gap-y-1`} style={{ gridTemplateColumns: cols }}>
        <span className={`self-center ${HEAD}`} style={{ gridColumn: 2, gridRow: rows }}>
          Athlete
        </span>
        <span className={`self-center text-center ${HEAD}`} style={{ gridColumn: 3, gridRow: rows }}>
          {score}
        </span>
        {runs.map((r) => (
          <SessionTag
            key={r.dayKey}
            run={r}
            open={open === r.dayKey}
            onToggle={() => onOpen(open === r.dayKey ? null : r.dayKey)}
          />
        ))}
        {named &&
          names.map((n, k) => (
            <span key={n.key} className={`min-w-0 truncate text-center ${TH}`} style={{ gridColumn: 4 + k, gridRow: 2 }}>
              {n.name}
            </span>
          ))}
      </div>
    </div>
  );
}

const athleteHref = (id: string) => `/varsity/coach/athlete/${id}`;
const dayLabel = (d: Date) => `${d.getDate()} ${MO[d.getMonth()]}`;
const testWords = (w: TeamWorkout) => w.session.description.trim() || sessionLabel(w.session);

/* Each session's tag: its day ("5 Sep", with AM or PM only where another
   session in the list falls on the same day), the whole day for the grown
   card ("Sat 5 Sep · AM"), and what the plan called it. */
function labelRuns(runs: SessionRun[], words: (dayKey: string) => string): Run[] {
  /* The piece columns start at the fourth: place, person, score. */
  let col = 4;
  return runs.map((r) => {
    const shared = runs.some((o) => o.dayKey !== r.dayKey && dayLabel(o.date) === dayLabel(r.date));
    const all = words(r.dayKey);
    const run = {
      ...r,
      col,
      day: dayLabel(r.date),
      half: shared ? r.period : undefined,
      when: `${dayKeyLabel(r.dayKey)} · ${r.period}`,
      words: all,
      short: withoutRest(all),
    };
    col += r.count;
    return run;
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
  /* ── Seat races: read out of the same timing sheets — a record, not a ranking ── */
  const seatRaced = useMemo(() => seatRacers(races, span, raceBoats), [races, span, raceBoats]);

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

  /* Which sessions each list is made of: a run of columns per session, each
     with its tag at the top of the list. */
  const ergRuns = labelRuns(sessionRuns(tests), (k) => testWords(tests.find((t) => t.dayKey === k)!));
  const waterRuns = labelRuns(sessionRuns(water.pieces), raceTitle);
  /* The one tag grown at a time, for the list it was grown on, and how far
     down the list its workout drops: just under the header. */
  const headRef = useRef<HTMLDivElement>(null);
  const [grown, setGrown] = useState<{ list: RankingList; dayKey: string; top: number } | null>(null);
  const grownHere = grown && grown.list === list ? grown.dayKey : null;
  const grow = (dayKey: string | null) => {
    const head = headRef.current;
    setGrown(dayKey ? { list, dayKey, top: head ? head.offsetTop + head.offsetHeight : 0 } : null);
  };
  const grownRun = (runs: Run[]) => (grown && grownHere ? runs.find((r) => r.dayKey === grownHere) : undefined);
  /* A tap anywhere but on a tag, or Escape, puts it back. */
  useEffect(() => {
    if (!grown) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest("[data-session-tag]")) setGrown(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGrown(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [grown]);

  /*
    THE COLUMNS. The place, the person, THE NUMBER THE LIST IS ORDERED BY
    beside the name — at the end of a row it fell off a phone's screen — and
    then the detail: a column per erg test or water piece, or the plan's
    counts. Whatever does not fit scrolls sideways; the ranking never does.
  */
  /* An erg test's column is as wide as its workout's words ("4×2000m" on one
     line); a water piece shares its session's tag with the others, so its
     column can be narrower. The gap is GAP's 0.25rem. */
  const ergCols = `1.6rem minmax(0,1fr) 2.6rem repeat(${tests.length}, 4rem)`;
  const ergMin = `${1.6 + 9.5 + 2.6 + tests.length * 4 + (tests.length + 2) * 0.25 + 1.25}rem`;
  const waterCols = `1.6rem minmax(0,1fr) 2.6rem repeat(${water.pieces.length}, 3.25rem)`;
  const waterMin = `${1.6 + 9.5 + 2.6 + water.pieces.length * 3.25 + (water.pieces.length + 2) * 0.25 + 1.25}rem`;
  /* Consistency's plan count rides UNDER its percentage rather than in a
     column of its own: four columns of numbers cut every full name short. */
  const consCols = "1.6rem minmax(0,1fr) 2.9rem 2.7rem 2.2rem";

  const rangeOptions = [
    ...rankingRanges.map((r) => ({ key: r.key, label: r.label })),
    { key: TEAM_CUSTOM_RANGE, label: "Choose dates…" },
  ];

  return (
    <div>
      {/* ERG | WATER | CONSISTENCY, and the window beside it. */}
      <div data-tour="coach-ranking-lists" className="flex flex-wrap items-center justify-between gap-2">
        <Segmented options={rankingLists} value={list} onChange={setList} ariaLabel="Ranking" />
        {/* ml-auto: with four lists the window no longer always fits beside
            them on a phone, and when it drops to a line of its own it stays
            at the right, where its menu opens from. */}
        <div className="ml-auto">
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
      </div>

      <div className="mt-3">
        {/* ── ERG ── points, then the place on every test. */}
        {list === "erg" &&
          (erg.length === 0 ? (
            <div className={EMPTY}>No ranked erg tests in {noneIn(range.key, range.label)}.</div>
          ) : (
            <div className="relative">
              <div className={CARD}>
                <div style={{ minWidth: ergMin }}>
                  <ListHead
                    headRef={headRef}
                    cols={ergCols}
                    score="Pts"
                    runs={ergRuns}
                    names={tests.map((t) => ({ key: t.dayKey, name: "" }))}
                    open={grownHere}
                    onOpen={grow}
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
                      <span className="text-center text-[14px] font-bold tabular-nums text-text">{r.points}</span>
                      {r.places.map((p, k) => (
                        <PiecePlace key={k} place={p?.place ?? null} />
                      ))}
                    </Row>
                  ))}
                </div>
              </div>
              {(() => {
                const run = grownRun(ergRuns);
                return run && grown ? <GrownWorkout run={run} top={grown.top} onClose={() => grow(null)} /> : null;
              })()}
            </div>
          ))}

        {/* ── WATER ── wins, then where their boat finished in every piece,
            with the class it was in. */}
        {list === "water" &&
          (water.rows.length === 0 ? (
            <div className={EMPTY}>No timed race pieces in {noneIn(range.key, range.label)}.</div>
          ) : (
            <div className="relative">
              <div className={CARD}>
                <div style={{ minWidth: waterMin }}>
                  <ListHead
                    headRef={headRef}
                    cols={waterCols}
                    score="Wins"
                    runs={waterRuns}
                    names={water.pieces.map((p) => ({ key: p.id, name: p.name }))}
                    open={grownHere}
                    onOpen={grow}
                  />
                  {water.rows.map((r, i) => (
                    <Row key={r.key} i={i} first={r.rank === 1 && r.wins > 0} cols={waterCols}>
                      <Place rank={r.rank} scored={r.wins > 0} />
                      <Who name={r.name} />
                      <span className="text-center text-[14px] font-bold tabular-nums text-text">{r.wins}</span>
                      {r.places.map((p, k) => (
                        <PiecePlace key={k} place={p?.place ?? null} under={p ? classTitle(p.badge) : undefined} />
                      ))}
                    </Row>
                  ))}
                </div>
              </div>
              {(() => {
                const run = grownRun(waterRuns);
                return run && grown ? <GrownWorkout run={run} top={grown.top} onClose={() => grow(null)} /> : null;
              })()}
            </div>
          ))}

        {/* ── SEAT RACES ── NOT A RANKING (owner, 2026-10-01: "just names and
            who he beat… that is the valuable information"). Only the people
            who seat raced, A to Z, each with the people they beat and the
            people who beat them, and by how many seconds. Their record is
            beside the name, so somebody who won every one reads at a glance.
            Water knows people by their seat, not their account, so a row has
            no page to open. */}
        {list === "seatraces" &&
          (seatRaced.length === 0 ? (
            <div className={EMPTY}>No seat races in {noneIn(range.key, range.label)}.</div>
          ) : (
            <div className={CARD}>
              {seatRaced.map((p, i) => (
                <div key={p.key} className={`px-2.5 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <Who name={p.name} />
                    <span className="flex-shrink-0 text-[14px] font-bold tabular-nums text-text">
                      {p.won}–{p.lost}
                    </span>
                  </div>
                  {p.beat.length > 0 && <Meetings word="Beat" list={p.beat} strong />}
                  {p.lostTo.length > 0 && <Meetings word="Lost to" list={p.lostTo} />}
                </div>
              ))}
            </div>
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
              <div className={`grid items-center ${GAP} border-b border-border px-2.5 py-2.5 ${HEAD}`} style={{ gridTemplateColumns: consCols }}>
                <span />
                <span>Athlete</span>
                <span className="text-center">Done</span>
                <span className="text-center">Extra</span>
                <span className="text-center">Out</span>
              </div>
              {consistency.map((r, i) => (
                <Row key={r.id} i={i} first={r.rank === 1 && (r.share ?? 0) > 0} cols={consCols} href={athleteHref(r.id)}>
                  <Place rank={r.rank} scored={(r.share ?? 0) > 0} />
                  <Who name={r.name} />
                  <span className="text-center leading-tight">
                    <span className="block text-[14px] font-bold tabular-nums text-text">
                      {r.share == null ? "—" : `${r.share}%`}
                    </span>
                    {r.planned > 0 && (
                      <span className="block text-[10px] tabular-nums text-muted">
                        {r.done}/{r.planned}
                      </span>
                    )}
                  </span>
                  <span className={`text-center text-[12px] tabular-nums ${r.extra > 0 ? "font-semibold text-text" : "text-muted"}`}>
                    {r.extra}
                  </span>
                  <span className={`text-center text-[12px] tabular-nums ${r.out > 0 ? "font-semibold text-text" : "text-muted"}`}>
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

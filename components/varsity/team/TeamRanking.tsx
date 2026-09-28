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

  Erg is made of what the Workouts tab already read — the boards and their
  results — so it can never disagree with a board a coach opens; while the Erg
  side is still the worked example, so is this, and it says so. Water reads
  the timing sheets the same tab already has. Consistency reads the squad's
  own logs, the published plan and the days out — only when it is opened, and
  only for a coach (can.readTraining), the same reads the team statistics make.

  A person who has an account opens their console page from their row. Water
  matches people by the surname the sheet wrote, like the race board's
  Athletes tab, so it has no page to open. Colours are theme tokens; the three
  metals are the app's own tokens (--podium-1..3).
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
  waterRanking,
  type RankingList,
} from "@/lib/varsity/ranking";
import type { TeamWorkout } from "@/lib/varsity/teamBoard";
import type { TeamResult } from "@/lib/varsity/resultsStore";
import type { RaceDay } from "@/lib/varsity/racePieces";
import type { SessionMap } from "@/lib/varsity/coachPlan";

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

const athleteHref = (id: string) => `/varsity/coach/athlete/${id}`;
const dayLabel = (d: Date) => `${d.getDate()} ${MO[d.getMonth()]}`;

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
}: {
  /** Every board on the Workouts tab, worked examples included. */
  workouts: TeamWorkout[];
  results: TeamResult[];
  /** Which of those boards are the worked example. */
  exampleKeys: Set<string>;
  /** The timing sheets on the Water side. */
  races: RaceDay[];
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
  const water = useMemo(() => waterRanking(races, span), [races, span]);

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

  /* A column is headed by its name and its day; two sessions on one day say
     which half of it. */
  const ergShared = (w: TeamWorkout) =>
    tests.some((t) => t.dayKey !== w.dayKey && dayLabel(t.date) === dayLabel(w.date));
  const waterShared = (dayKey: string, date: Date) =>
    water.pieces.some((p) => p.dayKey !== dayKey && dayLabel(p.date) === dayLabel(date));

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
            <div className={CARD}>
              <div style={{ minWidth: ergMin }}>
                <div className={`grid items-end gap-1.5 border-b border-border px-2.5 py-2 ${TH}`} style={{ gridTemplateColumns: ergCols }}>
                  <span />
                  <span>Athlete</span>
                  <span className="text-right">Pts</span>
                  {tests.map((t) => (
                    <span key={t.dayKey} className="min-w-0 text-right" title={t.session.description.trim() || undefined}>
                      <span className="block truncate">{t.session.description.trim() || "Erg"}</span>
                      <span className="block truncate font-medium normal-case tracking-normal">
                        {dayLabel(t.date)}
                        {ergShared(t) ? ` ${t.period}` : ""}
                      </span>
                    </span>
                  ))}
                </div>
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
          ))}

        {/* ── WATER ── wins, then where their boat finished in every piece,
            with the class it was in. */}
        {list === "water" &&
          (water.rows.length === 0 ? (
            <div className={EMPTY}>No timed race pieces in {noneIn(range.key, range.label)}.</div>
          ) : (
            <div className={CARD}>
              <div style={{ minWidth: waterMin }}>
                <div className={`grid items-end gap-1.5 border-b border-border px-2.5 py-2 ${TH}`} style={{ gridTemplateColumns: waterCols }}>
                  <span />
                  <span>Athlete</span>
                  <span className="text-right">Wins</span>
                  {water.pieces.map((p) => (
                    <span key={p.id} className="min-w-0 text-right">
                      <span className="block truncate">{p.name}</span>
                      <span className="block truncate font-medium normal-case tracking-normal">
                        {dayLabel(p.date)}
                        {waterShared(p.dayKey, p.date) ? ` ${p.period}` : ""}
                      </span>
                    </span>
                  ))}
                </div>
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

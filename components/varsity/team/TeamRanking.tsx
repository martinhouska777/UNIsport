"use client";

/*
  THE RANKINGS — the Coach Console's third view on Workouts, beside Erg and
  Water (owner, 2026-09-27: "for coaches we want to do some athletes ranking").
  ---------------------------------------------------------------------------
  Coaches only: TeamWorkouts offers it in the console and nowhere else, and
  the console's Workouts tab is a coach's alone.

  The window first — Month, Semester, or two dates — and then the list, drawn
  the way the water board draws its Combined: a spreadsheet, the points beside
  the name and then one column per test. For the erg that is every RANKED erg
  test in the window, the place each rower took on it, and the points those
  places add up to (lib/varsity/ranking.ts). Most points on top, the winner's
  row in grey with the black badge, exactly as on the race board. A place a
  rower does not have is a dash; nothing is written about it.

  It is made of what the Workouts tab already read — the boards and their
  results — so it can never disagree with a board a coach opens from Erg. And
  while the Erg side is still showing the worked example (nobody has logged a
  real result yet), so is this, wearing the same EXAMPLE tag: a ranking of the
  squad's real names out of invented times must say so.

  A row is a link to that rower's console page, like every name in the team
  statistics. Colours are theme tokens only.
*/
import { useMemo, useState } from "react";
import Link from "next/link";
import Dropdown from "@/components/varsity/profile/Dropdown";
import DatesSheet, { type Dates } from "@/components/varsity/team/DatesSheet";
import RankBadge from "@/components/varsity/team/RankBadge";
import ExampleTag from "@/components/varsity/ExampleTag";
import { TEAM_CUSTOM_RANGE, customTeamRange, teamRangeByKey, toIso } from "@/lib/varsity/teamStats";
import {
  defaultRankingRange,
  ergRanking,
  ergTests,
  ordinal,
  rankingRanges,
  rankingSpan,
} from "@/lib/varsity/ranking";
import type { TeamWorkout } from "@/lib/varsity/teamBoard";
import type { TeamResult } from "@/lib/varsity/resultsStore";

/* The header row of a list — the race board's. */
const TH = "text-[9px] font-semibold uppercase tracking-[0.1em] text-muted";
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* What an empty window says, in the words of the choice that made it. */
const noneIn = (key: string, label: string) =>
  key === "month" ? "the last month" : key === "semester" ? "the semester" : label;

export default function TeamRanking({
  workouts,
  results,
  exampleKeys,
}: {
  /** Every board on the Workouts tab, worked examples included. */
  workouts: TeamWorkout[];
  results: TeamResult[];
  /** Which of those boards are the worked example. */
  exampleKeys: Set<string>;
}) {
  const now = useMemo(() => new Date(), []);
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
  const tests = useMemo(() => ergTests(workouts, span), [workouts, span]);
  const rows = useMemo(() => ergRanking(workouts, results, span), [workouts, results, span]);
  const example = tests.some((t) => exampleKeys.has(t.dayKey));

  /* A test is headed by the coach's words and its day; two on one day say
     which half of it. */
  const dayOf = (w: TeamWorkout) => `${w.date.getDate()} ${MO[w.date.getMonth()]}`;
  const sharedDay = (w: TeamWorkout) => tests.some((t) => t !== w && dayOf(t) === dayOf(w));

  /* The spreadsheet's columns: the place, the name, THE POINTS, then one per
     test. The points sit beside the name rather than at the end, where the
     water board keeps its Total: a month holds four or five tests, and on a
     phone a total at the end was off the edge of the screen — the one number
     the list is ordered by, behind a sideways scroll. Now the places are what
     scrolls, and the ranking itself never does. */
  const n = tests.length;
  const cols = `1.25rem minmax(0,1fr) 2.6rem repeat(${n}, 3rem)`;
  const minWidth = `${1.25 + 8 + 2.6 + n * 3 + (n + 2) * 0.375 + 1.25}rem`;

  const rangeOptions = [
    ...rankingRanges.map((r) => ({ key: r.key, label: r.label })),
    { key: TEAM_CUSTOM_RANGE, label: "Choose dates…" },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Dropdown
          label={range.label}
          options={rangeOptions}
          value={range.key}
          open={menuOpen}
          onOpen={setMenuOpen}
          onPick={(k) => {
            setMenuOpen(false);
            if (k === TEAM_CUSTOM_RANGE) setPicking(true);
            else {
              setCustom(null);
              setRangeKey(k);
            }
          }}
        />
        {example && <ExampleTag />}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] text-muted">
          No ranked erg tests in {noneIn(range.key, range.label)}.
        </div>
      ) : (
        <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-border bg-surface shadow-card">
          <div style={{ minWidth }}>
            <div
              className={`grid items-end gap-1.5 border-b border-border px-2.5 py-2 ${TH}`}
              style={{ gridTemplateColumns: cols }}
            >
              <span />
              <span>Athlete</span>
              <span className="text-right">Pts</span>
              {tests.map((t) => (
                <span key={t.dayKey} className="min-w-0 text-right" title={t.session.description.trim() || undefined}>
                  <span className="block truncate">{t.session.description.trim() || "Erg"}</span>
                  <span className="block truncate font-medium normal-case tracking-normal">
                    {dayOf(t)}
                    {sharedDay(t) ? ` ${t.period}` : ""}
                  </span>
                </span>
              ))}
            </div>
            {rows.map((r, i) => {
              const cls = `grid items-center gap-1.5 px-2.5 py-2.5 ${i > 0 ? "border-t border-border" : ""} ${
                r.rank === 1 ? "bg-surface-2" : ""
              }`;
              const cells = (
                <>
                  <RankBadge rank={r.rank} />
                  <span className="truncate text-[13px] font-semibold text-text">{r.name || "Unnamed"}</span>
                  <span className="text-right text-[13px] font-semibold tabular-nums text-text">{r.points}</span>
                  {r.places.map((p, k) => (
                    <span key={k} className="text-right text-[12px] tabular-nums text-muted">
                      {p ? ordinal(p.place) : "—"}
                    </span>
                  ))}
                </>
              );
              /* A real rower opens their console page; a worked example's
                 people have no page to open. */
              return example ? (
                <div key={r.athleteId} className={cls} style={{ gridTemplateColumns: cols }}>
                  {cells}
                </div>
              ) : (
                <Link
                  key={r.athleteId}
                  href={`/varsity/coach/athlete/${r.athleteId}`}
                  className={`${cls} active:bg-surface-2`}
                  style={{ gridTemplateColumns: cols }}
                >
                  {cells}
                </Link>
              );
            })}
          </div>
        </div>
      )}

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

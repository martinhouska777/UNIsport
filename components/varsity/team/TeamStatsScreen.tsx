"use client";

/*
  THE SQUAD'S STATISTICS, FULL SCREEN — the coach's version of the athlete's
  StatsFullScreen, with the same handles.
  ---------------------------------------------------------------------------
  The card on top of the Team tab is a glance: this week, two numbers. This is
  the whole screen given over to how the squad is training — the athlete's own
  statistics screen, copied and customised for the team (owner, 2026-09-21:
  "exactly the same as the athlete's statistics, with the same functions"):

    • the same THREE choices: the MEASURE (average km, average hours, people
      on the water), the WINDOW — a week read day by day, a month and the
      semester read week by week, or two dates the coach chooses — and the
      SHAPE, columns or a line
    • the same graph, with the number written on EVERY column whenever the
      numbers fit (owner: "show everywhere when it fits"); a TAP reads a
      column out below, and a DRAG across the columns zooms into that stretch
      — three weeks out of a semester become those three weeks, day by day.
      "Zoom out" puts back the window you were on before the first zoom.
    • an empty day reads out NOTHING — "5 boats, nothing written on them" and
      "27 people · 14 boats" were text nobody asked for
    • THE SAME GROUPS THE ATHLETE GETS (owner, 2026-09-22): distance per
      person — THE AVERAGE ROW FIRST, then the water, the erg, the total and
      what that is in a week — time per person, and consistency per person,
      which is what the coach put up against what got done, missed and done
      on top. The owner cut two things from this list by name: the word
      "outing" (2026-09-21) and the whole SQUAD group (2026-09-22) — who
      logged out of the roster, and the squad's raw distance and time.
    • the squad's TRAINING MIX, over the same window
    • EVERY PERSON, one row each: what they rowed, how long, and done out of
      planned — "let's say there was something prescribed and then they did
      more or less, so they want to see how each person trained". TAPPING A
      ROW OPENS THAT PERSON (owner, 2026-09-22: "when you click a person, you
      want to see his statistics") — their console page, which is their
      statistics, their past workouts and their calendar.
    • at the foot, a TABLE the way a coach would lay it out in a spreadsheet:
      one row a day or a week, kilometres, the change on the row before,
      hours — so a week is compared against the weeks before it by reading
      down a column. A row nobody trained in is dashes; tapping a row picks it.

  IT IS ALL MADE OF THE ATHLETES' OWN LOGS (owner, 2026-09-22). It used to be
  the BOATS — the lineups the coach drew, with the kilometres a crew wrote on
  them — which is why it could only ever talk about outings: a boat knows
  nothing about the erg, the weights, or whether anybody did what was
  prescribed. Every figure is now the average of the people who LOGGED
  something in the window (lib/varsity/squadStats.ts), so the squad's
  statistics are made of exactly what each rower sees about themselves.
  Somebody who logged nothing is left out rather than averaged in as a zero.
  The boats are still what a tapped DAY lists — the crews that went out are a
  fact about the day, and no average replaces them. Nothing is compared in
  colour: a taper week is supposed to fall.

  Boats are read ONCE for the longest built-in window; a custom window or a
  zoom that reaches outside it fetches only the days it is missing. Portalled
  to <body> and re-wrapped in <ThemeProvider>, like the athlete's, so it
  covers the tab bar and keeps the Varsity theme. All colours are theme tokens.
*/
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import { useUnits } from "@/components/useUnits";
import Plot from "@/components/varsity/profile/Plot";
import Dropdown from "@/components/varsity/profile/Dropdown";
import Sheet from "@/components/varsity/Sheet";
import { IconX, IconCalendar, IconArrowLeft } from "@/components/icons";
import type { Boat } from "@/lib/varsity/coachLineup";
import { chartTypes, type ChartType } from "@/lib/varsity/athleteStats";
import { fetchLineupsFor } from "@/lib/varsity/lineupStore";
import { fetchSquadLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { fetchPlan } from "@/lib/varsity/planStore";
import { publishedSessions } from "@/lib/varsity/athleteHome";
import type { SessionMap } from "@/lib/varsity/coachPlan";
import { useMembership } from "@/components/varsity/useMembership";
import { can, fetchSquad } from "@/lib/varsity/membership";
import { trainingMix, type MixRow } from "@/lib/varsity/trainingMix";
import TrainingMixList from "@/components/varsity/profile/TrainingMixList";
import { squadRows, type SquadRow } from "@/lib/varsity/squadStats";
import type { StatTone } from "@/lib/varsity/rowingStats";
import { crewLabel } from "@/lib/varsity/racePieces";
import { formatDistance, formatDuration, metresToUnit, type Units } from "@/lib/varsity/units";
import {
  TEAM_CUSTOM_RANGE,
  allKeys,
  customTeamRange,
  defaultTeamRange,
  fillBuckets,
  teamBuckets,
  teamMetricByKey,
  teamMetrics,
  teamRangeByKey,
  teamRanges,
  teamReport,
  toIso,
  trainedBuckets,
  windowAverage,
  windowLabel,
  windowPeople,
  bucketMetres,
  bucketMinutes,
  type TeamBucket,
  type TeamRange,
} from "@/lib/varsity/teamStats";

type Dates = { start: string; end: string };

/* ONE frozen empty map, shared. A fresh `{}` per render would be a new
   dependency every render, and the whole window would be rebuilt each time. */
const NO_LOGS: Record<string, LogEntry[]> = {};

/* A word from the data, into a theme token. The data never names a colour. */
const toneClass: Record<StatTone, string> = {
  text: "text-text",
  success: "text-success",
  warn: "text-warn",
  muted: "text-muted",
};

export default function TeamStatsScreen({ onClose }: { onClose: () => void }) {
  const vTheme = useVarsityTheme();
  const { units } = useUnits();
  const now = useMemo(() => new Date(), []);

  const [rangeKey, setRangeKey] = useState(defaultTeamRange);
  /* Two dates the coach chose, or a stretch dragged on the graph. While it is
     set it IS the window. */
  const [custom, setCustom] = useState<Dates | null>(null);
  /* The window before the first zoom, so "Zoom out" undoes however many zooms
     in one press. Picking a window by hand forgets it. */
  const [beforeZoom, setBeforeZoom] = useState<{ rangeKey: string; custom: Dates | null } | null>(null);
  const [metricKey, setMetricKey] = useState(teamMetrics[0].key);
  const [chart, setChart] = useState<ChartType>("bars");
  const [openMenu, setOpenMenu] = useState<"metric" | "range" | "chart" | null>(null);
  const [picking, setPicking] = useState(false);
  /* Practice key → its boats, for every day read so far (an absent key that
     was asked for is stored as [] so it is never asked for again). Null until
     the first read lands. */
  const [lineups, setLineups] = useState<Record<string, Boat[]> | null>(null);
  /*
    THE SQUAD'S LOGS, athlete id to everything they logged, read ONCE for the
    longest window the screen offers, the same way the boats are. Null until
    the read lands. Every figure on the screen is made of these.
  */
  const [logs, setLogs] = useState<Record<string, LogEntry[]> | null>(null);
  /** Account id to the name printed in the table of people. */
  const [names, setNames] = useState<Record<string, string>>({});
  /* The published plan, so planned / done / missed / on top can be counted:
     the same published-only gate the athlete's own screen uses, so the two
     screens never disagree about what was missed. */
  const [plan, setPlan] = useState<SessionMap>({});
  /* The tapped column — the latest bucket until someone taps. Held with the
     window's label: an index means nothing once the window changes. */
  const [picked, setPicked] = useState<{ window: string; index: number } | null>(null);

  const range: TeamRange = custom ? customTeamRange(custom.start, custom.end) : teamRangeByKey(rangeKey);
  const metric = teamMetricByKey(metricKey);
  const windowId = `${range.key}:${range.start ?? ""}:${range.end ?? ""}`;

  const pickRange = (key: string) => {
    setBeforeZoom(null);
    setCustom(null);
    setRangeKey(key);
  };
  const pickDates = (d: Dates) => {
    setBeforeZoom(null);
    setCustom(d);
  };
  const zoomTo = (start: string, end: string) => {
    if (!beforeZoom) setBeforeZoom({ rangeKey, custom });
    setCustom({ start, end });
  };
  const zoomOut = () => {
    if (!beforeZoom) return;
    setRangeKey(beforeZoom.rangeKey);
    setCustom(beforeZoom.custom);
    setBeforeZoom(null);
  };

  /*
    THE SQUAD, THEN ITS LOGS. The roster of accounts comes first because the
    logs are asked for by id; a coach who cannot read training gets neither,
    which is the same answer the database would give.
  */
  const { membership } = useMembership();
  const teamId = membership?.teamId ?? null;
  const role = membership?.role ?? null;
  /* Only a coach may read the squad. Anyone else is not "still loading" and
     must not be parked on a spinner, so this is DERIVED rather than written
     into state from inside the effect. */
  const canRead = !!teamId && !!role && can.readTraining(role);
  useEffect(() => {
    if (!canRead || !teamId) return;
    let active = true;
    const most = Math.max(...teamRanges.map((r) => r.days));
    const from = toIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (most - 1)));
    const to = toIso(now);
    fetchSquad(teamId)
      .then(async (squad) => {
        const approved = squad.filter((m) => m.status === "approved");
        if (!active) return;
        const byId: Record<string, string> = {};
        for (const m of approved) byId[m.userId] = m.name;
        setNames(byId);
        const read = await fetchSquadLogsInRange(
          approved.map((m) => m.userId),
          from,
          to,
        );
        if (active) setLogs(read);
      })
      .catch(() => active && setLogs({}));
    return () => {
      active = false;
    };
  }, [canRead, teamId, now]);

  useEffect(() => {
    let active = true;
    fetchPlan()
      .then((pl) => active && setPlan(publishedSessions(pl)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  /* The first read: everything the longest built-in window can show. */
  useEffect(() => {
    let active = true;
    fetchLineupsFor(allKeys(now))
      .then((l) => {
        if (!active) return;
        const filled: Record<string, Boat[]> = {};
        for (const k of allKeys(now)) filled[k] = l[k] ?? [];
        setLineups(filled);
      })
      .catch(() => active && setLineups({}));
    return () => {
      active = false;
    };
  }, [now]);

  /* A window reaching outside what has been read fetches only what it lacks. */
  const bare = useMemo(() => teamBuckets(range, now), [range, now]);
  const missing = useMemo(
    () => (lineups ? bare.flatMap((b) => b.dayKeys).filter((k) => !(k in lineups)) : []),
    [bare, lineups],
  );
  useEffect(() => {
    if (!missing.length) return;
    let active = true;
    fetchLineupsFor(missing).then((l) => {
      if (!active) return;
      setLineups((cur) => {
        const next = { ...(cur ?? {}) };
        for (const k of missing) next[k] = l[k] ?? [];
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [missing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* What the screen actually reads: nothing at all unless this is a coach. */
  const squadLogs = canRead ? logs : NO_LOGS;
  const loading = lineups === null || squadLogs === null || missing.length > 0;
  const buckets: TeamBucket[] = useMemo(
    () => (lineups ? fillBuckets(range, now, lineups, squadLogs ?? {}) : []),
    [lineups, squadLogs, range, now],
  );
  const points = buckets.map((b) => ({ label: b.short, value: metric.of(b), latest: b.latest }));
  const empty = !loading && trainedBuckets(buckets).length === 0;
  /* THE PEOPLE OF THE WINDOW, once: the groups and the table of names below
     are the same numbers read two ways, so they cannot disagree. */
  const people = useMemo(
    () => windowPeople(buckets, squadLogs ?? {}, names, plan),
    [buckets, squadLogs, names, plan],
  );
  const groups = teamReport(people, buckets, units);
  const rows: SquadRow[] = useMemo(() => squadRows(people, units), [people, units]);
  /* The squad's mix over the same window: everybody's logs pooled, which is
     the one figure here that is a share rather than an average. */
  const mix: MixRow[] = useMemo(
    () => trainingMix(buckets.flatMap((b) => b.logs), plan),
    [buckets, plan],
  );
  const plotMetric = { label: metric.label(units), format: metric.format };
  const selected =
    picked && picked.window === windowId ? Math.min(picked.index, buckets.length - 1) : buckets.length - 1;
  const readOut = buckets[selected] ?? null;
  const each = range.bucket === "day" ? "day" : "week";
  const rangeOptions = [
    ...teamRanges.map((r) => ({ key: r.key, label: r.label })),
    { key: TEAM_CUSTOM_RANGE, label: "Choose dates…" },
  ];

  return createPortal(
    <ThemeProvider tokens={vTheme.dark} light={vTheme.light}>
      <div className="fixed inset-0 z-[60] flex flex-col bg-background [animation:backdrop-in_0.18s_ease-out]">
        {/* ── The bar. What you are looking at, and the way out. ── */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-border px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close team statistics"
            className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconX size={15} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold leading-tight text-text">Team statistics</div>
            {buckets.length > 0 && (
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted">
                <IconCalendar size={11} />
                {windowLabel(buckets)} · {each} by {each}
              </div>
            )}
          </div>
          {beforeZoom && (
            <button
              type="button"
              onClick={zoomOut}
              className="tap44 flex flex-shrink-0 items-center gap-1 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-text"
            >
              <IconArrowLeft size={13} /> Zoom out
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-screen-sm px-3.5">
            {/* ── The three choices, the athlete's own dropdowns. ── */}
            <div className="flex flex-wrap items-center gap-2 py-3">
              <Dropdown
                label={metric.label(units)}
                options={teamMetrics.map((m) => ({ key: m.key, label: m.label(units) }))}
                value={metric.key}
                open={openMenu === "metric"}
                onOpen={(v) => setOpenMenu(v ? "metric" : null)}
                onPick={(k) => {
                  setMetricKey(k);
                  setOpenMenu(null);
                }}
              />
              <Dropdown
                label={range.label}
                options={rangeOptions}
                value={range.key}
                open={openMenu === "range"}
                onOpen={(v) => setOpenMenu(v ? "range" : null)}
                onPick={(k) => {
                  setOpenMenu(null);
                  if (k === TEAM_CUSTOM_RANGE) setPicking(true);
                  else pickRange(k);
                }}
              />
              <Dropdown
                label={chartTypes.find((c) => c.key === chart)?.label ?? "Columns"}
                options={chartTypes.map((c) => ({ key: c.key, label: c.label }))}
                value={chart}
                open={openMenu === "chart"}
                onOpen={(v) => setOpenMenu(v ? "chart" : null)}
                onPick={(k) => {
                  setChart(k as ChartType);
                  setOpenMenu(null);
                }}
              />
            </div>

            {loading ? (
              <p className="py-12 text-center text-[13px] text-muted">Adding up the squad…</p>
            ) : empty ? (
              <p className="px-6 py-12 text-center text-[13px] leading-relaxed text-muted">{metric.empty}</p>
            ) : (
              <>
                {/* THE GRAPH — its number on every column while they fit (the
                    best one alone when they don't), a dashed average across
                    the ones that had training; tap to read out, drag to zoom. */}
                <div className="rounded-2xl border border-border bg-surface p-3">
                  <Plot
                    points={points}
                    metric={plotMetric}
                    units={units}
                    chart={chart}
                    height={190}
                    values="auto"
                    average={windowAverage(buckets, metric)}
                    selected={selected}
                    onSelect={(i) => setPicked({ window: windowId, index: i })}
                    onRangeSelect={(from, to) => {
                      const a = buckets[from];
                      const b = buckets[to];
                      if (!a || !b) return;
                      // One DAY is already as close as the graph goes; a week
                      // (or more) of anything opens up day by day.
                      if (from === to && range.bucket === "day") return setPicked({ window: windowId, index: from });
                      zoomTo(toIso(a.start), toIso(b.end));
                      setPicked(null);
                    }}
                  />
                </div>

                {/* THE TAPPED COLUMN, read out — only when there is something
                    in it. An empty day says nothing at all. */}
                {readOut && (readOut.trained.length > 0 || readOut.mileage.boats > 0) && (
                  <ReadOut bucket={readOut} each={each} units={units} />
                )}

                {/* THE NUMBERS — lib/varsity/squadStats decides what is said and
                    in what order; this only draws it (rule 7). Drawn exactly
                    like the athlete's own groups, tone and all, because they
                    are the same groups. */}
                {groups.map((g) => (
                  <div key={g.key} className="mt-5">
                    <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{g.title}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {g.cells.map((c) => (
                        <div key={c.key} className="rounded-xl border border-border bg-surface px-3 py-2.5">
                          <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">{c.label}</div>
                          <div
                            className={`mt-1 text-[17px] font-semibold leading-none ${toneClass[c.tone ?? "text"]}`}
                          >
                            {c.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* WHAT ALL THAT TIME WAS, for the squad — the same block the
                    athlete gets, over the same window as the graph, so it
                    carries no window of its own. */}
                {mix.length > 0 && (
                  <div className="mt-5">
                    <TrainingMixList rows={mix} heading="Training mix" />
                  </div>
                )}

                <PeopleTable rows={rows} units={units} />

                <CompareTable
                  buckets={buckets}
                  each={each}
                  units={units}
                  selected={selected}
                  onPick={(i) => setPicked({ window: windowId, index: i })}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {picking && (
        <DatesSheet
          start={range.start ?? toIso(buckets[0]?.start ?? now)}
          end={range.end ?? toIso(now)}
          today={toIso(now)}
          onApply={(d) => {
            pickDates(d);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </ThemeProvider>,
    document.body,
  );
}

/*
  TWO DATES — the window the coach wants, when none of the three built-in ones
  is it ("how did the two weeks before the race go"). The phone's own date
  picker on each field, 16px so nothing zooms.
*/
function DatesSheet({
  start,
  end,
  today,
  onApply,
  onClose,
}: {
  start: string;
  end: string;
  today: string;
  onApply: (d: Dates) => void;
  onClose: () => void;
}) {
  const [a, setA] = useState(start);
  const [b, setB] = useState(end);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(a) && /^\d{4}-\d{2}-\d{2}$/.test(b);
  const field =
    "w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-text outline-none focus:border-primary-line";
  return (
    <Sheet title="Choose dates" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">From</span>
          <input type="date" value={a} max={today} onChange={(e) => setA(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">To</span>
          <input type="date" value={b} max={today} onChange={(e) => setB(e.target.value)} className={`${field} mt-1`} />
        </label>
      </div>
      <p className="mt-3 text-[12px] text-muted">Up to a month is read day by day; longer is read week by week.</p>
      <button
        type="button"
        disabled={!ok}
        onClick={() => onApply(a <= b ? { start: a, end: b } : { start: b, end: a })}
        className="tap44 mt-4 w-full rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-contrast disabled:opacity-50"
      >
        Show these dates
      </button>
    </Sheet>
  );
}

/*
  ONE COLUMN, READ OUT — the day or the week that was tapped: the average
  person's distance and time, and for a DAY the crews themselves, each boat
  with what it did, because "what happened on Tuesday" is answered by the
  boats, not by an average. No counts of people or boats (owner).
*/
function ReadOut({ bucket, each, units }: { bucket: TeamBucket; each: "day" | "week"; units: Units }) {
  const withFigures = bucket.boats.filter((b) => (b.metres ?? 0) > 0 || (b.minutes ?? 0) > 0);
  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
      <div className="text-[13px] font-semibold text-text">
        {bucket.latest ? (each === "day" ? "Today" : "This week") : bucket.label}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Per person</div>
          <div className="mt-0.5 text-[16px] font-semibold leading-none text-text">
            {formatDistance(bucketMetres(bucket), units.distance)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Per person</div>
          <div className="mt-0.5 text-[16px] font-semibold leading-none text-text">
            {formatDuration(Math.round(bucketMinutes(bucket)))}
          </div>
        </div>
      </div>
      {each === "day" && withFigures.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1">
          {withFigures.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="min-w-0 truncate text-text">
                <span className="mr-1.5 font-mono text-[10px] text-muted">{b.badge}</span>
                {crewLabel(b)}
              </span>
              <span className="flex-shrink-0 tabular-nums text-muted">
                {b.metres ? formatDistance(b.metres, units.distance) : ""}
                {b.metres && b.minutes ? " · " : ""}
                {b.minutes ? formatDuration(b.minutes) : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/*
  EVERY PERSON, ONE ROW (owner, 2026-09-22: "they want to see how each person
  trained, each boat — like what actually happened compared to the plan").

  The same spreadsheet shape as the table of weeks below it: the name, what
  they rowed, how long they trained, and DONE OUT OF PLANNED — the one column
  that answers "there was something prescribed and then they did more or
  less". Most kilometres on top, because that is the column an eye runs down.

  A row is a LINK to that person's console page — their own statistics, their
  past workouts and their calendar (owner, 2026-09-22). The roster rows on the
  Team tab already went there; the table of names did not, so the one screen
  that names everybody was the one place a coach could not tap a name.

  Only the plan column is coloured, and only when there IS a plan for that
  person: green when they did everything asked, warned when they are short.
  The distance and the hours are never coloured — a light week in a taper is
  not a failing, which is the same rule the weeks table keeps.

  Anybody who logged nothing in the window is not here at all. They are an
  unknown, not a zero, and a row of dashes per person would be the screen
  telling a coach something it does not know.
*/
function PeopleTable({ rows, units }: { rows: SquadRow[]; units: Units }) {
  if (rows.length === 0) return null;
  const cols = "grid-cols-[minmax(0,1.3fr)_3.3rem_3rem_3.1rem_3.1rem]";
  const cell = "px-1.5 py-2 text-right tabular-nums";
  return (
    <div className="mt-5">
      <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        Person by person
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface text-[12px]">
        <div
          className={`grid ${cols} border-b border-border bg-surface-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted`}
        >
          <span className="px-2.5 py-2 text-left">Name</span>
          <span className={cell}>{units.distance === "mi" ? "Mi" : "Km"}</span>
          <span className={cell}>±</span>
          <span className={cell}>Time</span>
          <span className={cell}>Plan</span>
        </div>
        {rows.map((r, i) => (
          <Link
            key={r.id}
            href={`/varsity/coach/athlete/${r.id}`}
            className={`grid ${cols} items-center border-b border-border last:border-b-0 active:bg-surface-2 ${
              i % 2 === 1 ? "bg-surface-2/60" : ""
            }`}
          >
            <span className="truncate px-2.5 py-2 font-medium text-text">{r.name}</span>
            <span className={`${cell} font-semibold text-text`}>{r.distance}</span>
            <span className={`${cell} font-semibold ${toneClass[r.deltaTone]}`}>{r.delta}</span>
            <span className={`${cell} text-text`}>{r.time}</span>
            <span className={`${cell} font-semibold ${toneClass[r.tone]}`}>{r.plan}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/*
  THE TABLE OF WEEKS — a spreadsheet, on purpose (owner: "just like an Excel table").
  Newest row on top. Each row is one day or one week: the average person's
  kilometres, the change on the row before it (the previous day or week that
  had training — never coloured), and the hours. A row with no boats is
  dashes. The row being read out above is marked, and tapping a row reads it
  out. The outings column came off (owner, 2026-09-21), and since 2026-09-22
  every figure in it is made of what people LOGGED, not of the boats.
*/
function CompareTable({
  buckets,
  each,
  units,
  selected,
  onPick,
}: {
  buckets: TeamBucket[];
  each: "day" | "week";
  units: Units;
  selected: number;
  onPick: (i: number) => void;
}) {
  const unit = units.distance;
  const km = (m: number) => {
    const v = metresToUnit(m, unit);
    return v >= 100 ? v.toFixed(0) : v.toFixed(1);
  };
  const hrs = (min: number) => formatDuration(Math.round(min));

  /* The previous row that had training, for the ± column. */
  const prevTrained = (i: number): TeamBucket | null => {
    for (let k = i - 1; k >= 0; k--) if (buckets[k].trained.length > 0) return buckets[k];
    return null;
  };
  const delta = (i: number): string => {
    const b = buckets[i];
    const p = prevTrained(i);
    if (!p || b.trained.length === 0) return "";
    const d = metresToUnit(bucketMetres(b) - bucketMetres(p), unit);
    if (Math.abs(d) < 0.05) return "±0";
    return `${d > 0 ? "+" : "−"}${Math.abs(d) >= 100 ? Math.abs(d).toFixed(0) : Math.abs(d).toFixed(1)}`;
  };

  const cols = "grid-cols-[minmax(0,1.6fr)_3.6rem_3.4rem_4rem]";
  const cell = "px-2 py-2 text-right tabular-nums";

  return (
    <div className="mt-5">
      <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        {each} by {each}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface text-[12px]">
        <div className={`grid ${cols} border-b border-border bg-surface-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted`}>
          <span className="px-2.5 py-2 text-left">{each}</span>
          <span className={cell}>{unit === "mi" ? "Mi" : "Km"}</span>
          <span className={cell}>±</span>
          <span className={cell}>Hours</span>
        </div>
        {buckets
          .map((b, i) => ({ b, i }))
          .reverse()
          .map(({ b, i }, row) => {
            const had = b.trained.length > 0;
            return (
              <button
                key={b.start.getTime()}
                type="button"
                onClick={() => onPick(i)}
                aria-pressed={i === selected}
                className={`grid ${cols} w-full items-center border-b border-border text-left last:border-b-0 ${
                  i === selected ? "bg-primary-tint" : row % 2 === 1 ? "bg-surface-2/60" : ""
                }`}
              >
                <span className={`truncate px-2.5 py-2 ${b.latest ? "font-semibold text-text" : "font-medium text-text"}`}>
                  {b.latest ? (each === "day" ? "Today" : "This week") : b.label}
                </span>
                {had ? (
                  <>
                    <span className={`${cell} font-semibold text-text`}>{km(bucketMetres(b))}</span>
                    <span className={`${cell} text-muted`}>{delta(i)}</span>
                    <span className={`${cell} text-text`}>{hrs(bucketMinutes(b))}</span>
                  </>
                ) : (
                  <>
                    <span className={`${cell} text-muted`}>—</span>
                    <span className={`${cell} text-muted`}></span>
                    <span className={`${cell} text-muted`}>—</span>
                  </>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}

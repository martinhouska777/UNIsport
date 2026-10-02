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
    • the squad's TRAINING MIX, over the same window — ON ITS OWN TAB since
      2026-10-01 (owner: "put training mix as a tab… call it team and not
      squad"). The screen is two tabs, Team and Training mix
      (lib/varsity/teamStats → teamStatTabs); everything else below is Team.
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

  Boats and logs are read ONCE for the longest built-in window; a custom
  window or a zoom that reaches outside it fetches only the days it is
  missing (the logs as well since 2026-09-27 — before that a window older
  than 91 days drew an empty graph). Portalled
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
import DatesSheet, { type Dates } from "@/components/varsity/team/DatesSheet";
import Segmented from "@/components/ui/Segmented";
import Avatar from "@/components/messages/Avatar";
import { IconX, IconCalendar, IconArrowLeft, IconChevronDown } from "@/components/icons";
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
import {
  squadAverage,
  squadRows,
  sortSquadRows,
  type PeopleSort,
  type SquadAverage,
  type SquadRow,
} from "@/lib/varsity/squadStats";
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
  teamStatTabs,
  toIso,
  trainedBuckets,
  windowAverage,
  windowLabel,
  windowPeople,
  bucketMetres,
  bucketMinutes,
  type TeamBucket,
  type TeamRange,
  type TeamStatTab,
} from "@/lib/varsity/teamStats";

/* ONE frozen empty map, shared. A fresh `{}` per render would be a new
   dependency every render, and the whole window would be rebuilt each time. */
const NO_LOGS: Record<string, LogEntry[]> = {};

/** "2026-06-29" → "2026-06-28". */
const dayBefore = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return toIso(new Date(y, m - 1, d - 1));
};

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

  const [tab, setTab] = useState<TeamStatTab>("team");
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
  /* The first day those logs reach back to, and who they were asked for — so a
     window that starts EARLIER (two dates chosen, or a zoom) fetches only the
     days it is missing, like the boats do. It used to read those 91 days and
     no more, and a custom window older than that drew an empty graph (audit,
     2026-09-27). */
  const [logsFrom, setLogsFrom] = useState<string | null>(null);
  const [squadIds, setSquadIds] = useState<string[] | null>(null);
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
        const ids = approved.map((m) => m.userId);
        const read = await fetchSquadLogsInRange(ids, from, to);
        if (!active) return;
        setSquadIds(ids);
        setLogsFrom(from);
        setLogs(read);
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

  /* …and the same for the LOGS: a window that starts before the first day
     read fetches the days in between, once, and they join what is there. */
  const windowFrom = bare.length ? toIso(bare[0].start) : null;
  const gapFrom = canRead && logs && logsFrom && windowFrom && windowFrom < logsFrom ? windowFrom : null;
  const gapTo = gapFrom && logsFrom ? dayBefore(logsFrom) : null;
  useEffect(() => {
    if (!gapFrom || !gapTo || !squadIds) return;
    let active = true;
    fetchSquadLogsInRange(squadIds, gapFrom, gapTo)
      .then((older) => {
        if (!active) return;
        setLogs((cur) => {
          const next: Record<string, LogEntry[]> = { ...(cur ?? {}) };
          for (const [id, list] of Object.entries(older)) next[id] = [...list, ...(next[id] ?? [])];
          return next;
        });
        setLogsFrom(gapFrom);
      })
      // A failed read must not leave the screen waiting on it for ever.
      .catch(() => active && setLogsFrom(gapFrom));
    return () => {
      active = false;
    };
  }, [gapFrom, gapTo, squadIds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* What the screen actually reads: nothing at all unless this is a coach. */
  const squadLogs = canRead ? logs : NO_LOGS;
  const loading = lineups === null || squadLogs === null || missing.length > 0 || !!gapFrom;
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
  const average = useMemo(() => squadAverage(people, units), [people, units]);
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
        {/* ── The bar. What you are looking at, the way out, and the two
            tabs — in the bar, so they stay in reach however far down the
            Team tab has been read. ── */}
        <div className="flex-shrink-0 border-b border-border px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3">
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
          <div className="mx-auto mt-2.5 w-full max-w-screen-sm">
            <Segmented
              size="md"
              full
              options={teamStatTabs}
              value={tab}
              onChange={setTab}
              ariaLabel="Team statistics"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-screen-sm px-3.5">
            {/* ── The three choices, the athlete's own dropdowns. The measure
                and the shape are the graph's, so only the Team tab has them;
                the window is both tabs'. ── */}
            <div className="flex flex-wrap items-center gap-2 py-3">
              {tab === "team" && (
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
              )}
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
              {tab === "team" && (
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
              )}
            </div>

            {loading ? (
              <p className="py-12 text-center text-[13px] text-muted">Adding up the squad…</p>
            ) : tab === "mix" ? (
              /* WHAT ALL THAT TIME WAS, for the team — the same block the
                 athlete gets, over the same window as the Team tab, so it
                 carries no window of its own. Alone on its tab. */
              <TrainingMixList rows={mix} />
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

                <PeopleTable rows={rows} average={average} units={units} />

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

  REBUILT 2026-10-01 (owner: "person by person… make a better UI there, it is
  pretty important"). It was a 12px spreadsheet with 9px headings, where
  "211 km" and "20h 14m" broke onto two lines and the ± column was a bare
  sign nobody could read. Now:
    • a face beside every name, the console's rankings' own, and the name may
      take two lines rather than be cut off
    • the figures at the size of the rankings' scores, never broken: the
      kilometres are the number alone (the heading says km or mi)
    • the plan as a bar under "21/36", so who is behind shows down the column
      without reading a single fraction
    • every heading puts the list in its order — most first, the name A to Z
      — with a small arrow under the one in use

  AND HOW FAR EACH ONE IS FROM THE AVERAGE (owner, the same day: "for the
  individual, we want to see how much they are from the average"). The team's
  average person is the first line, on grey, and never moves with the order;
  under every person's kilometres and time is how far above (green) or under
  (amber) that line they are. The kilometres off the plan, which sat under
  the distance until then, gave way — the plan is still the bar.
*/
const PEOPLE_HEAD = "tap44 flex items-center gap-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted";
const PEOPLE_COLS = "grid-cols-[minmax(0,1fr)_3.5rem_4.25rem_4rem]";

/* "21/36" over its bar. `fill` is the bar's own class: the tone for a person,
   the grey of a mark for the average. */
function PlanCell({ plan, share, fill }: { plan: string; share: number | null; fill: string }) {
  return (
    <span className="flex flex-col items-end gap-1">
      <span className="text-[14px] font-bold tabular-nums text-text">{plan}</span>
      {/* A sliver even at none done, so a plan nobody touched still reads
          as a bar and not as a missing one. */}
      {share != null && (
        <span className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <span
            className={`block h-full rounded-full ${fill}`}
            style={{ width: `${Math.max(4, Math.round(share * 100))}%` }}
          />
        </span>
      )}
    </span>
  );
}

function PeopleTable({ rows, average, units }: { rows: SquadRow[]; average: SquadAverage | null; units: Units }) {
  const [by, setBy] = useState<PeopleSort>("km");
  const shown = useMemo(() => sortSquadRows(rows, by), [rows, by]);
  if (rows.length === 0) return null;
  const cols = PEOPLE_COLS;
  const heads: { key: PeopleSort; label: string; end: boolean }[] = [
    { key: "name", label: "Athlete", end: false },
    { key: "km", label: units.distance === "mi" ? "Mi" : "Km", end: true },
    { key: "time", label: "Time", end: true },
    { key: "plan", label: "Plan", end: true },
  ];
  return (
    <div className="mt-5">
      <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        Person by person
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className={`grid ${cols} gap-x-1.5 border-b border-border px-3 py-2`}>
          {heads.map((h) => (
            <button
              key={h.key}
              type="button"
              onClick={() => setBy(h.key)}
              aria-pressed={by === h.key}
              className={`${PEOPLE_HEAD} ${h.end ? "justify-end" : "justify-start"}`}
            >
              {h.label}
              {by === h.key && <IconChevronDown size={11} />}
            </button>
          ))}
        </div>
        {average && (
          <div className={`grid ${cols} items-center gap-x-1.5 border-b border-border bg-surface-2 px-3 py-2.5`}>
            <span className="text-[13px] font-semibold leading-tight text-text">Team average</span>
            <span className="text-right text-[15px] font-bold tabular-nums text-text">{average.km}</span>
            <span className="whitespace-nowrap text-right text-[14px] font-semibold tabular-nums text-text">
              {average.time}
            </span>
            <PlanCell plan={average.plan} share={average.share} fill="bg-faint" />
          </div>
        )}
        {shown.map((r, i) => (
          <Link
            key={r.id}
            href={`/varsity/coach/athlete/${r.id}`}
            className={`grid ${cols} items-center gap-x-1.5 px-3 py-2.5 active:bg-surface-2 ${
              i > 0 ? "border-t border-border" : ""
            }`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <Avatar size={30} name={r.name} />
              <span className="line-clamp-2 min-w-0 break-words text-[13px] font-semibold leading-tight text-text">
                {r.name}
              </span>
            </span>
            <span className="text-right leading-tight">
              <span className="block text-[15px] font-bold tabular-nums text-text">{r.km}</span>
              <span className={`block text-[11px] font-semibold tabular-nums ${toneClass[r.vsKmTone]}`}>
                {r.vsKm}
              </span>
            </span>
            <span className="whitespace-nowrap text-right leading-tight">
              <span className="block text-[14px] font-semibold tabular-nums text-text">{r.time}</span>
              <span className={`block text-[11px] font-semibold tabular-nums ${toneClass[r.vsTimeTone]}`}>
                {r.vsTime}
              </span>
            </span>
            <PlanCell plan={r.plan} share={r.share} fill={r.tone === "success" ? "bg-success" : "bg-warn"} />
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

  REDRAWN 2026-10-01 in Person by person's look (owner: "can you do the
  week-to-week on the bottom… also better"): the same white card and 11px
  headings, the kilometres big with the change on the row before UNDER them
  (no "±" column of its own), and a bar under each row's name — its
  kilometres against the biggest row in the window — so a block's build and
  its taper show down the left edge. Still not coloured by better or worse.
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

  /* The biggest row of the window, which every row's bar is a share of. */
  const most = Math.max(0, ...buckets.filter((b) => b.trained.length > 0).map(bucketMetres));
  const cols = "grid-cols-[minmax(0,1fr)_4rem_4.5rem]";
  const head = "text-[11px] font-semibold uppercase tracking-[0.1em] text-muted";

  return (
    <div className="mt-5">
      <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        {each} by {each}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className={`grid ${cols} gap-x-3 border-b border-border px-3 py-2.5`}>
          <span className={head}>{each}</span>
          <span className={`${head} text-right`}>{unit === "mi" ? "Mi" : "Km"}</span>
          <span className={`${head} text-right`}>Hours</span>
        </div>
        {buckets
          .map((b, i) => ({ b, i }))
          .reverse()
          .map(({ b, i }, row) => {
            const had = b.trained.length > 0;
            const metres = bucketMetres(b);
            const change = delta(i);
            return (
              <button
                key={b.start.getTime()}
                type="button"
                onClick={() => onPick(i)}
                aria-pressed={i === selected}
                className={`grid ${cols} w-full items-center gap-x-3 px-3 py-2.5 text-left ${
                  row > 0 ? "border-t border-border" : ""
                } ${i === selected ? "bg-primary-tint" : "active:bg-surface-2"}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-text">
                    {b.latest ? (each === "day" ? "Today" : "This week") : b.label}
                  </span>
                  {/* The week as a bar against the biggest one in the window,
                      so the shape of the block reads down the left edge. */}
                  {had && metres > 0 && most > 0 && (
                    <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(2, Math.round((metres / most) * 100))}%` }}
                      />
                    </span>
                  )}
                </span>
                {had ? (
                  <>
                    <span className="text-right leading-tight">
                      <span className="block text-[15px] font-bold tabular-nums text-text">{km(metres)}</span>
                      {change && <span className="block text-[11px] tabular-nums text-muted">{change}</span>}
                    </span>
                    <span className="whitespace-nowrap text-right text-[14px] font-semibold tabular-nums text-text">
                      {hrs(bucketMinutes(b))}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-right text-[14px] text-muted">—</span>
                    <span className="text-right text-[14px] text-muted">—</span>
                  </>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}

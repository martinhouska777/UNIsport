"use client";

/*
  COACH → ONE ATHLETE → STATISTICS. The rower's own numbers, read by their coach.
  ---------------------------------------------------------------------------
  Every rower can open their profile and read how far and how long they have
  trained; the person running the squad could read nobody's (owner,
  2026-09-19). This is that same reading, about one athlete, in a tab beside
  their calendar.

  IT IS THE SAME ARITHMETIC, deliberately: the window list, the measures, the
  columns of the graph and every number under it come from the very files the
  athlete's own screen uses — lib/varsity/athleteStats (buildBuckets, the
  measures) and lib/varsity/rowingStats (rowingReport). A coach and a rower
  looking at the same weeks must never be shown two different answers, and the
  only way to guarantee that is for there to be one copy of the sums.

  WHAT IS DELIBERATELY NOT HERE, and why:
    • the drag-to-zoom graph and the tap-a-column read-out — those are an
      athlete studying their own training; a coach is asking a shorter
      question, and the window dropdown answers it.
    • the DAYS OUT group. Sick and injured days are the athlete's own record
      (lib/varsity/daysOut) and no coach-side read exists yet, so the report is
      given an empty set rather than a wrong one.

  Read-only, like everything else a coach sees about a rower.
  All colours are theme tokens.
*/
import { useEffect, useMemo, useState } from "react";
import Plot from "@/components/varsity/profile/Plot";
import Dropdown from "@/components/varsity/profile/Dropdown";
import { useUnits } from "@/components/useUnits";
import {
  buildBuckets,
  metricByKey,
  rangeByKey,
  statMetrics,
  statRanges,
  defaultStatRange,
  type Bucket,
} from "@/lib/varsity/athleteStats";
import { rowingReport, reportIsEmpty, type StatTone } from "@/lib/varsity/rowingStats";
import { fetchLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { fetchPlan } from "@/lib/varsity/planStore";
import type { SessionMap } from "@/lib/varsity/coachPlan";

const toneClass: Record<StatTone, string> = {
  text: "text-text",
  success: "text-success",
  warn: "text-warn",
  muted: "text-muted",
};

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* Far enough back for the longest window the dropdown offers, fetched once, so
   changing the window is instant and never returns to the database. */
const LOAD_DAYS = Math.max(...statRanges.map((r) => r.days)) + 1;

export default function AthleteStats({
  athleteId,
  /* Their own logs, already fetched for the calendar, when the screen has them —
     used ONLY to tell a squad that has never logged anything from one that has
     (the calendar falls back to a worked example; statistics do not pretend). */
  demo,
}: {
  athleteId: string;
  demo?: LogEntry[];
}) {
  const { units } = useUnits();
  const now = useMemo(() => new Date(), []);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [plan, setPlan] = useState<SessionMap>({});
  const [rangeKey, setRangeKey] = useState(defaultStatRange);
  const [metricKey, setMetricKey] = useState(statMetrics[0].key);
  const [openMenu, setOpenMenu] = useState<"metric" | "range" | null>(null);

  const range = rangeByKey(rangeKey);
  const metric = metricByKey(metricKey);

  useEffect(() => {
    let active = true;
    const from = toIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (LOAD_DAYS - 1)));
    fetchLogsInRange(athleteId, from, toIso(now))
      .then((rows) => {
        if (!active) return;
        setLogs(rows);
        setLoaded(true);
      })
      /* A refused or broken read must still end the wait: "Reading their
         training…" left on screen for ever is the one outcome that tells a
         coach nothing at all. */
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [athleteId, now]);

  /* The squad's plan, only so "planned / done / missed / extra" can be counted —
     the same group the athlete gets on their own screen. */
  useEffect(() => {
    let active = true;
    fetchPlan().then((p) => {
      if (active) setPlan(p.sessions ?? {});
    });
    return () => {
      active = false;
    };
  }, []);

  const shown = logs.length === 0 && demo?.length ? demo : logs;
  const buckets: Bucket[] = useMemo(
    () => buildBuckets(shown, range, now),
    [shown, range, now],
  );
  const points = buckets.map((b) => ({
    label: b.label,
    value: metric.value(b.logs, b.span),
    latest: b.latest,
  }));
  const span = buckets.length
    ? { startIso: buckets[0].span.startIso, endIso: buckets[buckets.length - 1].span.endIso }
    : { startIso: toIso(now), endIso: toIso(now) };
  const all = buckets.flatMap((b) => b.logs);
  const groups = rowingReport(all, plan, span, units);
  const empty = reportIsEmpty(all);

  return (
    <div>
      {/* WHAT IS BEING MEASURED, and OVER WHAT — the same two dropdowns, in the
          same order, as the athlete's own statistics. */}
      <div className="flex items-center gap-2">
        <Dropdown
          label={metric.label}
          title
          options={statMetrics.map((m) => ({ key: m.key, label: m.label }))}
          value={metricKey}
          open={openMenu === "metric"}
          onOpen={(v) => setOpenMenu(v ? "metric" : null)}
          onPick={(k) => {
            setMetricKey(k);
            setOpenMenu(null);
          }}
        />
        <Dropdown
          label={range.label}
          align="right"
          options={statRanges.map((r) => ({ key: r.key, label: r.label }))}
          value={rangeKey}
          open={openMenu === "range"}
          onOpen={(v) => setOpenMenu(v ? "range" : null)}
          onPick={(k) => {
            setRangeKey(k);
            setOpenMenu(null);
          }}
        />
      </div>

      {!loaded ? (
        <p className="py-12 text-center text-[13px] text-muted">Reading their training…</p>
      ) : empty ? (
        <p className="px-6 py-12 text-center text-[13px] leading-relaxed text-muted">
          {metric.empty}
        </p>
      ) : (
        <>
          <div className="mt-3 rounded-2xl border border-border bg-surface p-3">
            <Plot points={points} metric={metric} units={units} chart="bars" height={170} values="fit" />
          </div>

          {/* HOW FAR, HOW LONG, HOW STEADY — rowingStats decides what is said
              and in what order; this only draws it (rule 7). */}
          {groups.map((g) => (
            <div key={g.key} className="mt-5">
              <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                {g.title}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {g.cells.map((c) => (
                  <div key={c.key} className="rounded-xl border border-border bg-surface px-3 py-2.5">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                      {c.label}
                    </div>
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
        </>
      )}
    </div>
  );
}

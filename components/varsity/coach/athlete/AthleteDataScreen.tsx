"use client";

/*
  COACH → ONE ATHLETE. Everything the squad's coach may see about one rower's
  training, on one screen, read-only.

  Three blocks, in the order a coach asks the questions:
    1. WHO — side, status, class year, height, weight, erg PRs. From the narrow
       `varsity_athlete_card` RPC, not from their profile row.
    2. WHEN — a month calendar of what they actually did, with the same category
       colours the athlete sees on their own Calendar tab. Tap a day for the
       sessions. This is the part that needed a new database permission
       (db/varsity_coach_reads.sql); everything else was already readable.
    3. HOW FAST — every erg result they have posted to the team board.

  READ ONLY, deliberately and at the database level: there is no policy that
  would let a coach edit or delete a session. The log stays the athlete's own
  record of their own training; the coach gets to look.

  Crew telemetry (Peach / SpeedCoach) is NOT here, because an outing belongs to
  a BOAT rather than to a person — that lives in Team → Workouts. What a rower
  did on the water as an individual is in the calendar, like everything else.

  Colours are theme tokens (rule 1); the category dots and the side blade are
  CONTENT colours from data, applied inline (the rule-1 exception).
*/
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/varsity/Sheet";
import { useUnits } from "@/components/useUnits";
import { formatDistance } from "@/lib/varsity/units";
import { fetchLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { fetchAthleteCard, type AthleteCard } from "@/lib/varsity/coachAthlete";
import { fetchAthleteResults, type TeamResult } from "@/lib/varsity/resultsStore";
import { formatMetrics } from "@/lib/varsity/logParse";
import { dayKeyLabel, toISO } from "@/lib/varsity/coachPlan";
import { sideMeta } from "@/lib/varsity/coachLineup";
import {
  logCategoryColor,
  logCategoryLabel,
  legendCategories,
  rowingCategories,
  prPieces,
  statusOptions,
  type StatusTone,
} from "@/lib/varsity/athleteProfile";
import { IconArrowLeft, IconChevronDown } from "@/components/icons";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["M", "T", "W", "T", "F", "S", "S"];

const toneDot: Record<StatusTone, string> = {
  success: "bg-success",
  warn: "bg-warn",
  danger: "bg-danger",
  muted: "bg-muted",
};
const toneOf = (title: string): StatusTone =>
  statusOptions.find((s) => s.title === title)?.tone ?? "muted";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
      {children}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1">
      <div className="text-base font-semibold leading-none text-text">{value}</div>
      <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
    </div>
  );
}

/* One day's sessions, exactly as logged — no edit, no delete. */
function DaySheet({ label, logs, onClose }: { label: string; logs: LogEntry[]; onClose: () => void }) {
  return (
    <Sheet title={label} onClose={onClose}>
      {logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-6 text-center text-[12px] text-muted">
          Nothing logged this day.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((l) => {
            const metrics = formatMetrics(l.minutes, l.metres, l.split);
            return (
              <div
                key={l.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-3"
              >
                <span
                  className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ background: logCategoryColor[l.category ?? "other"] ?? "var(--muted)" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-text">{l.title}</div>
                  {metrics && <div className="mt-0.5 text-[12px] text-text-2">{metrics}</div>}
                  {l.note && (
                    <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{l.note}</div>
                  )}
                </div>
                {l.source === "plan" && (
                  <span className="flex-shrink-0 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                    Plan
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

export default function AthleteDataScreen({ athleteId }: { athleteId: string }) {
  const { units } = useUnits();
  const now = useMemo(() => new Date(), []);
  const todayIso = toISO(now);

  const [card, setCard] = useState<AthleteCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<TeamResult[]>([]);
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [picked, setPicked] = useState<{ iso: string; label: string } | null>(null);

  // Who they are + every erg they have posted. Both are athlete-wide, so once.
  useEffect(() => {
    let active = true;
    (async () => {
      const [c, r] = await Promise.all([
        fetchAthleteCard(athleteId),
        fetchAthleteResults(athleteId),
      ]);
      if (!active) return;
      setCard(c);
      setResults(r);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [athleteId]);

  // Their calendar, one month at a time.
  useEffect(() => {
    let active = true;
    (async () => {
      const from = toISO(new Date(view.y, view.m, 1));
      const to = toISO(new Date(view.y, view.m + 1, 0));
      const rows = await fetchLogsInRange(athleteId, from, to);
      if (active) setLogs(rows);
    })();
    return () => {
      active = false;
    };
  }, [athleteId, view]);

  const logsByDay = useMemo(() => {
    const map: Record<number, LogEntry[]> = {};
    for (const l of logs) {
      const day = Number(l.logDate.split("-")[2]);
      (map[day] ??= []).push(l);
    }
    return map;
  }, [logs]);

  const days = useMemo(() => {
    const count = new Date(view.y, view.m + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const num = i + 1;
      const iso = toISO(new Date(view.y, view.m, num));
      const seen = new Set<string>();
      const dots: string[] = [];
      for (const l of logsByDay[num] ?? []) {
        const c = l.category ?? "other";
        if (!seen.has(c) && dots.length < 4) {
          seen.add(c);
          dots.push(c);
        }
      }
      return { num, iso, dots, today: iso === todayIso, future: iso > todayIso };
    });
  }, [view, logsByDay, todayIso]);

  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of logs) {
      const c = l.category ?? "other";
      counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [logs]);

  const leadingEmpty = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday-first
  const monthMetres = logs.reduce(
    (sum, l) => sum + (rowingCategories.has(l.category ?? "") ? l.metres ?? 0 : 0),
    0,
  );
  const monthDays = new Set(logs.map((l) => l.logDate)).size;
  const atCurrentMonth = view.y === now.getFullYear() && view.m === now.getMonth();
  const goMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  if (loading) {
    return <p className="px-4 py-16 text-center text-sm text-muted">Loading…</p>;
  }

  /*
    No card means the database said no: a captain (who never gets athlete data),
    or someone no longer on this squad. Say so plainly rather than showing an
    empty screen that looks like the athlete has never trained.
  */
  if (!card) {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
        <Link href="/varsity/coach/team" className="flex items-center gap-1.5 text-[12px] text-muted">
          <IconArrowLeft size={14} />
          Squad
        </Link>
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] leading-relaxed text-muted">
          You can&apos;t see this athlete&apos;s training. Only a coach of their squad can, and only
          while they are on it.
        </div>
      </div>
    );
  }

  const p = card.profile;
  const cox = p.boatRole === "Coxswain";
  const side = sideMeta[p.side];
  const pinned = prPieces.filter((piece) => (p.prs[piece] ?? "").trim());

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
      <Link href="/varsity/coach/team" className="flex items-center gap-1.5 text-[12px] text-muted">
        <IconArrowLeft size={14} />
        Squad
      </Link>

      {/* ── 1. Who ── */}
      <h1 className="mt-2 text-2xl font-semibold text-text">{card.name || "Unnamed athlete"}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {cox ? (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            Coxswain
          </span>
        ) : (
          <span
            className="rounded-md border px-2 py-1 text-[11px] font-semibold"
            style={{
              background: side.color,
              color: side.ink,
              borderColor: `color-mix(in oklab, ${side.ink} 22%, transparent)`,
            }}
          >
            {side.label}
          </span>
        )}
        {p.teamYear && (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            {p.teamYear}
          </span>
        )}
        {card.classYear && (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            Class of {card.classYear}
          </span>
        )}
        {p.heightCm != null && (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            {p.heightCm} cm
          </span>
        )}
        {p.weightKg != null && (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            {p.weightKg} kg
          </span>
        )}
        <span className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
          <span className={`h-1.5 w-1.5 rounded-full ${toneDot[toneOf(p.status)]}`} />
          {p.status}
        </span>
      </div>

      {pinned.length > 0 && (
        <>
          <SectionLabel>Personal bests</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {pinned.map((piece) => (
              <div
                key={piece}
                className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-center"
              >
                <div className="text-[13px] font-semibold leading-none text-text">{p.prs[piece]}</div>
                <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                  {piece}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── 2. When — the calendar this permission exists for ── */}
      <SectionLabel>Training</SectionLabel>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-text">{MONTHS[view.m]}</span>
            <span className="text-[11px] font-medium tracking-wide text-muted">{view.y}</span>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => goMonth(-1)}
              className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted"
            >
              <IconChevronDown size={15} className="rotate-90" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => goMonth(1)}
              disabled={atCurrentMonth}
              className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted disabled:opacity-30"
            >
              <IconChevronDown size={15} className="-rotate-90" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border px-2 pb-1 pt-2">
          {DAY_NAMES.map((d, i) => (
            <div
              key={i}
              className="py-0.5 text-center text-[11px] font-semibold tracking-[0.12em] text-muted"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 px-2 pb-3 pt-2">
          {Array.from({ length: leadingEmpty }).map((_, i) => (
            <div key={`e${i}`} className="aspect-square" />
          ))}
          {days.map((d) => (
            <button
              key={d.num}
              type="button"
              onClick={() =>
                setPicked({ iso: d.iso, label: `${MONTHS[view.m]} ${d.num}, ${view.y}` })
              }
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl pt-1 ${
                d.today
                  ? "border border-primary-line bg-primary-tint"
                  : d.dots.length > 0
                    ? "border border-border bg-surface-2 active:bg-surface"
                    : "active:bg-surface-2"
              }`}
            >
              <span
                className={`text-[13px] font-medium leading-none ${
                  d.today ? "font-bold text-primary" : d.future ? "text-muted" : "text-text"
                }`}
              >
                {d.num}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">
                {d.dots.map((c, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: logCategoryColor[c] ?? "var(--muted)" }}
                  />
                ))}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-border bg-surface-2 px-3 py-2">
          {legendCategories.map((c) => (
            <span key={c} className="flex items-center gap-1.5 px-1.5 py-1 text-[11px] text-muted">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: logCategoryColor[c] ?? "var(--muted)" }}
              />
              {logCategoryLabel[c]}
              {(monthCounts[c] ?? 0) > 0 && (
                <span className="font-semibold text-text">{monthCounts[c]}</span>
              )}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-border px-4 py-3">
          <Stat value={String(logs.length)} label="Sessions" />
          <div className="h-6 w-px bg-border" />
          <Stat value={formatDistance(monthMetres, units.distance)} label="Rowed" />
          <div className="h-6 w-px bg-border" />
          <Stat value={String(monthDays)} label="Days" />
          <span className="ml-auto text-[11px] text-muted">in {MONTHS[view.m]}</span>
        </div>
      </div>

      {/* ── 3. How fast ── */}
      <SectionLabel>Erg results · {results.length}</SectionLabel>
      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted">
          Nothing posted to the team board yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-surface px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-semibold text-text">
                  {dayKeyLabel(r.dayKey)}
                </span>
                {r.split && (
                  <span className="flex-shrink-0 text-[13px] font-semibold text-text">{r.split}</span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
                {r.metres != null && <span>{formatDistance(r.metres, units.distance)}</span>}
                {r.strokeRate != null && <span>r{r.strokeRate}</span>}
                {r.watts != null && <span>{r.watts} W</span>}
                {r.weightKg != null && <span>{r.weightKg} kg</span>}
                {r.monitor && <span>{r.monitor}</span>}
              </div>
              {r.note && <div className="mt-1 text-[11px] leading-relaxed text-muted">{r.note}</div>}
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        Read only — a session belongs to the athlete who logged it. Crew telemetry sits under
        Team → Workouts, because an outing belongs to a boat rather than to one person.
      </p>

      {picked && (
        <DaySheet
          label={picked.label}
          logs={logsByDay[Number(picked.iso.split("-")[2])] ?? []}
          onClose={() => setPicked(null)}
        />
      )}
    </div>
  );
}

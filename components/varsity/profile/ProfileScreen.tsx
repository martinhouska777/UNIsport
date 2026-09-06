"use client";

/*
  Varsity PROFILE screen — the athlete's own rowing record, fully interactive.
  ---------------------------------------------------------------------------
  • Identity: the SAME name as the normal app profile (profiles.data.name), the
    year on the team (Freshman/Sophomore/…), and height/weight — all editable.
  • Current status: tap to change (Active / Light training / Injured / Away).
  • Statistics: pick a WINDOW (week / 2 weeks / month / 3 months, or two dates
    of your own) and a MEASURE (metres / hours / consistency); three numbers and
    a graph — columns or a line — follow both, the graph opens full size, and
    tapping through opens the Training mix. All from the athlete OWN logs
    (lib/varsity/logStore), with the coach plan read only to name intensities.
  • A button into the Calendar tab — the day-by-day training history lives there.
  • Personal bests: 2K / 5K / 6K / 30′ r20 — editable.
  • Send to coaches abroad: a shareable link (copy / share sheet).

  Editable data persists via lib/varsity/athleteProfile (profiles.data.varsity).
  All colors are theme tokens. Editor sheets use the shared <Sheet> (portalled).
*/
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import Sheet from "@/components/varsity/Sheet";
import { useAppState } from "@/components/AppState";
import { useMembership } from "@/components/varsity/useMembership";
import { useUnits } from "@/components/useUnits";
import { can, canOpenConsole, roleLabel } from "@/lib/varsity/membership";
import {
  formatWeight,
  kgToUnit,
  weightToKg,
  type Units,
} from "@/lib/varsity/units";
import { fetchLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { toISO, type SessionMap } from "@/lib/varsity/coachPlan";
import {
  fetchAthleteProfile,
  saveAthleteProfile,
  teamYearOptions,
  boatRoleOptions,
  sideOptions,
  sideLabel,
  statusOptions,
  prPieces,
  type VarsityAthleteProfile,
  type StatusTone,
} from "@/lib/varsity/athleteProfile";
import {
  metricByKey,
  statMetrics,
  summarise,
  statRanges,
  rangeByKey,
  customRange,
  rangeCaption,
  chartTypes,
  chartTypeOf,
  defaultStatRange,
  CUSTOM_RANGE,
  type ChartType,
  type StatMetric,
  type StatRange,
  type Bucket,
} from "@/lib/varsity/athleteStats";
import { trainingMix } from "@/lib/varsity/trainingMix";
import Plot from "@/components/varsity/profile/Plot";
import Dropdown from "@/components/varsity/profile/Dropdown";
import StatsFullScreen from "@/components/varsity/profile/StatsFullScreen";
import TrainingMixSheet from "@/components/varsity/profile/TrainingMixSheet";
import { fetchPlan } from "@/lib/varsity/planStore";
import {
  IconPencil,
  IconExpand,
  IconAnchor,
  IconActivity,
  IconChevronRight,
  IconCalendar,
  IconGlobe,
  IconCopy,
  IconCheck,
} from "@/components/icons";

/* status tone (data) → a theme-token utility (never a raw color) */
const toneText: Record<StatusTone, string> = {
  success: "text-success",
  warn: "text-warn",
  danger: "text-danger",
  muted: "text-muted",
};
const toneDot: Record<StatusTone, string> = {
  success: "bg-success",
  warn: "bg-warn",
  danger: "bg-danger",
  muted: "bg-muted",
};
const toneRing: Record<StatusTone, string> = {
  success: "border-success-line bg-success-tint text-success",
  warn: "border-warn-line bg-warn-tint text-warn",
  danger: "border-danger-line bg-danger-tint text-danger",
  muted: "border-border bg-surface-2 text-muted",
};
const statusByTitle = (title: string) =>
  statusOptions.find((s) => s.title === title) ?? statusOptions[0];

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "athlete";
}
function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/* A yyyy-mm-dd back as a local midnight — never `new Date(iso)`, which reads it
   as UTC and lands on the day before for anyone west of Greenwich. */
function asDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-base text-text outline-none focus:border-primary placeholder:text-muted";
/*
  How far back the LOGS are fetched — always the longest range the chips offer,
  once, so changing the range is instant and never returns to the database.
*/
const LOAD_DAYS = Math.max(...statRanges.map((r) => r.days));

/* ─────────────────────────  edit identity sheet  ───────────────────────── */
function EditIdentitySheet({
  profile,
  units,
  onSave,
  onClose,
}: {
  profile: VarsityAthleteProfile;
  units: Units;
  onSave: (patch: Partial<VarsityAthleteProfile>) => void;
  onClose: () => void;
}) {
  const [teamYear, setTeamYear] = useState(profile.teamYear);
  const [boatRole, setBoatRole] = useState(profile.boatRole);
  const [side, setSide] = useState(profile.side);
  const [height, setHeight] = useState(profile.heightCm != null ? String(profile.heightCm) : "");
  // Shown and typed in whichever weight unit they chose; ALWAYS stored in kilos,
  // so switching the setting later can't corrupt what's on the record.
  const [weight, setWeight] = useState(
    profile.weightKg != null ? String(Math.round(kgToUnit(profile.weightKg, units.weight))) : "",
  );

  const save = () => {
    const typed = weight.trim() ? Number(weight) : null;
    onSave({
      teamYear,
      boatRole,
      // Same as setup: a coxswain has no side, so don't keep a stale one.
      side: boatRole === "Coxswain" ? "B" : side,
      heightCm: height.trim() ? Number(height) : null,
      weightKg: typed == null ? null : Math.round(weightToKg(typed, units.weight) * 10) / 10,
    });
    onClose();
  };

  return (
    <Sheet title="Edit profile" onClose={onClose}>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Year on the team
      </div>
      <div className="flex flex-wrap gap-1.5">
        {teamYearOptions.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setTeamYear(y)}
            className={`rounded-full border px-3.5 py-2 text-[12px] font-medium ${
              teamYear === y
                ? "border-primary bg-primary-tint text-primary"
                : "border-border bg-surface-2 text-text"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        In the boat
      </div>
      <div className="flex flex-wrap gap-1.5">
        {boatRoleOptions.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setBoatRole(r)}
            className={`rounded-full border px-3.5 py-2 text-[12px] font-medium ${
              boatRole === r
                ? "border-primary bg-primary-tint text-primary"
                : "border-border bg-surface-2 text-text"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* A coxswain never takes a rowing seat, so the side question disappears. */}
      {boatRole === "Rower" && (
        <>
          <div className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Side
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sideOptions.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setSide(o.key)}
                className={`flex flex-col items-center rounded-full border px-3.5 py-1.5 text-[12px] font-medium leading-tight ${
                  side === o.key
                    ? "border-primary bg-primary-tint text-primary"
                    : "border-border bg-surface-2 text-text"
                }`}
              >
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[11px] text-muted">Height (cm)</label>
          <input
            value={height}
            onChange={(e) => setHeight(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder="—"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-muted">Weight ({units.weight})</label>
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            placeholder="—"
            className={inputCls}
          />
        </div>
      </div>

      <Button size="lg" full onClick={save} className="mt-5">
        <IconCheck size={16} /> Save
      </Button>
    </Sheet>
  );
}

/* ─────────────────────────  status picker sheet  ───────────────────────── */
function StatusSheet({
  current,
  onSave,
  onClose,
}: {
  current: string;
  onSave: (patch: Partial<VarsityAthleteProfile>) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Current status" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {statusOptions.map((s) => {
          const active = s.title === current;
          return (
            <button
              key={s.title}
              type="button"
              onClick={() => {
                onSave({ status: s.title });
                onClose();
              }}
              className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left ${
                active ? "border-primary bg-primary-tint" : "border-border bg-surface-2"
              }`}
            >
              <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${toneDot[s.tone]}`} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-text">{s.title}</div>
                <div className="text-[11px] text-muted">{s.sub}</div>
              </div>
              {active && (
                <span className="text-primary">
                  <IconCheck size={16} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

/* ─────────────────────────  personal-bests editor  ───────────────────────── */
function PrSheet({
  prs,
  onSave,
  onClose,
}: {
  prs: Record<string, string>;
  onSave: (patch: Partial<VarsityAthleteProfile>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    for (const p of prPieces) d[p] = prs[p] ?? "";
    return d;
  });

  return (
    <Sheet title="Personal bests" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {prPieces.map((piece) => (
          <div key={piece} className="flex items-center gap-3">
            <span className="w-16 flex-shrink-0 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
              {piece}
            </span>
            <input
              value={draft[piece]}
              onChange={(e) => setDraft((d) => ({ ...d, [piece]: e.target.value }))}
              placeholder={piece === "30′ r20" ? "e.g. 8,420 m" : "e.g. 6:08.4"}
              className={inputCls}
            />
          </div>
        ))}
      </div>
      <Button
        size="lg"
        full
        onClick={() => {
          const cleaned: Record<string, string> = {};
          for (const [k, v] of Object.entries(draft)) if (v.trim()) cleaned[k] = v.trim();
          onSave({ prs: cleaned });
          onClose();
        }}
        className="mt-5"
      >
        <IconCheck size={16} /> Save bests
      </Button>
    </Sheet>
  );
}

/* ─────────────────────────  the graph card  ─────────────────────────
   Whatever the athlete picked in its header — metres, hours or consistency —
   over whichever window the button on the right is set to, drawn as columns or
   as a line. One point per bucket: a day each for the short ranges, a week each
   for the long ones. The three numbers above it come from the same buckets.

   Columns are the default because the question is "how much did I do that
   day", and a quantity is a height you compare with the one beside it. A line
   is the same numbers read as a trend, which is what three months is for.

   THREE CHOICES, ONE SHAPE. The measure, the window and the shape it is drawn
   in are all the same dropdown (components/varsity/profile/Dropdown) — the
   first two in the header, the shape in the footer beside the way out to the
   full-screen graph. The drawing itself lives in ./Plot and is used at both
   sizes, so the small one and the big one can never disagree.

   The card is a GLANCE. Everything a person would actually study — every
   column named, the best one's number printed on it, the plan kept or missed,
   the splits, the mix — is on the full screen behind the expand button. */

/*
  A WINDOW THE ATHLETE PICKS THEMSELVES. Two dates and nothing else: the four
  ready-made windows answer "how is it going", this answers "how did that
  training camp go", which is a stretch that has already finished.
*/
function CustomRangeSheet({
  start,
  end,
  today,
  onApply,
  onClose,
}: {
  start: string;
  end: string;
  today: string;
  onApply: (start: string, end: string) => void;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(end);
  const valid = !!from && !!to && from <= to;

  return (
    <Sheet title="Choose the dates" onClose={onClose}>
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            From
          </span>
          <input
            type="date"
            value={from}
            max={to || today}
            onChange={(e) => setFrom(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex-1">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            To
          </span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            /* Nothing has happened after today, and a window reaching into next
               week would report the athlete as slacking. */
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
        Up to a month is charted day by day; anything longer is charted week by
        week, so the columns stay readable.
      </p>
      <Button
        size="lg"
        disabled={!valid}
        onClick={() => {
          onApply(from, to);
          onClose();
        }}
        className="mt-4 w-full"
      >
        Show these dates
      </Button>
    </Sheet>
  );
}

function WeeklyGraph({
  buckets,
  points,
  metric,
  range,
  chart,
  units,
  plan,
  today,
  windowStart,
  onMetric,
  onRange,
  onCustom,
  onChart,
}: {
  /** The same buckets the points came from — the full screen reads them. */
  buckets: Bucket[];
  points: { label: string; value: number; latest: boolean }[];
  metric: StatMetric;
  range: StatRange;
  chart: ChartType;
  units: Units;
  /** The coach's plan, so the full screen can count planned / missed / extra. */
  plan: SessionMap;
  today: string;
  /** The first day currently on the chart — what the date picker opens on. */
  windowStart: string;
  onMetric: (key: string) => void;
  onRange: (key: string) => void;
  onCustom: (start: string, end: string) => void;
  onChart: (key: string) => void;
}) {
  const [openMenu, setOpenMenu] = useState<"metric" | "range" | "chart" | null>(null);
  const [picking, setPicking] = useState(false); // the custom-dates sheet
  const [full, setFull] = useState(false); // the full-screen graph
  const anyData = points.some((p) => p.value > 0);

  const rangeOptions = [
    ...statRanges.map((r) => ({ key: r.key, label: r.label })),
    { key: CUSTOM_RANGE, label: "Choose dates…" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface px-4 pb-3.5 pt-4">
      {/* THE HEADER. The measure names the card, because it is what the card is
          about; the window sits opposite it, because it is the other half of
          the same question. Both are the same kind of menu. */}
      <div className="flex items-center justify-between gap-2">
        <Dropdown
          title
          label={metric.label}
          options={statMetrics.map((m) => ({ key: m.key, label: m.label }))}
          value={metric.key}
          open={openMenu === "metric"}
          onOpen={(v) => setOpenMenu(v ? "metric" : null)}
          onPick={onMetric}
        />
        <Dropdown
          label={range.label}
          align="right"
          options={rangeOptions}
          value={range.key}
          open={openMenu === "range"}
          onOpen={(v) => setOpenMenu(v ? "range" : null)}
          onPick={(key) => (key === CUSTOM_RANGE ? setPicking(true) : onRange(key))}
        />
      </div>

      {anyData ? (
        /* The plot is its own tap target. Every button on the card sits outside
           it, so this is not a target you have to fight. */
        <button
          type="button"
          onClick={() => setFull(true)}
          aria-label={`See ${metric.label.toLowerCase()} full size`}
          className="mt-4 block w-full active:opacity-80"
        >
          <Plot points={points} metric={metric} units={units} chart={chart} height={188} />
        </button>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-[12px] leading-relaxed text-muted">
          {metric.empty}
        </p>
      )}

      {/* THE FOOTER. What shape it is drawn in, and the way to see it big —
          the two things that are about the drawing rather than about the
          numbers, kept away from the header so neither row is crowded. The way
          out is the icon alone: a button that opens a whole screen doesn't need
          a word as well, and the word was taking the room. */}
      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border pt-3">
        <Dropdown
          label={chartTypes.find((c) => c.key === chart)?.label ?? "Columns"}
          options={chartTypes.map((c) => ({ key: c.key, label: c.label }))}
          value={chart}
          open={openMenu === "chart"}
          onOpen={(v) => setOpenMenu(v ? "chart" : null)}
          onPick={onChart}
        />
        <button
          type="button"
          onClick={() => setFull(true)}
          disabled={!anyData}
          aria-label="See the graph full screen"
          className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-muted disabled:opacity-40"
        >
          <IconExpand size={14} />
        </button>
      </div>

      {picking && (
        <CustomRangeSheet
          start={range.start ?? windowStart}
          end={range.end ?? today}
          today={today}
          onApply={onCustom}
          onClose={() => setPicking(false)}
        />
      )}

      {full && (
        <StatsFullScreen
          buckets={buckets}
          points={points}
          metric={metric}
          range={range}
          chart={chart}
          units={units}
          plan={plan}
          today={today}
          onMetric={onMetric}
          onRange={onRange}
          onCustomRange={() => setPicking(true)}
          onChart={onChart}
          onClose={() => setFull(false)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────  screen  ───────────────────────── */
export default function ProfileScreen() {
  const { userId } = useAppState();
  const { units } = useUnits();
  // Coach or captain? Decides whether the console door appears at the bottom.
  const { membership, isMember } = useMembership();
  const consoleRole =
    isMember && canOpenConsole(membership!.role) ? membership!.role : null;
  const now = useMemo(() => new Date(), []);

  const [name, setName] = useState("");
  const [classYear, setClassYear] = useState("");
  const [profile, setProfile] = useState<VarsityAthleteProfile | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  // The chosen window. Kept in the screen, not on the record: it's a question
  // you ask ("how was last week?"), not a setting you configure once. `custom`
  // is a pair of dates the athlete picked; while it is set it IS the window.
  const [rangeKey, setRangeKey] = useState(defaultStatRange);
  const [custom, setCustom] = useState<{ start: string; end: string } | null>(null);
  const range: StatRange = custom ? customRange(custom.start, custom.end) : rangeByKey(rangeKey);
  const pickRange = (key: string) => {
    setCustom(null);
    setRangeKey(key);
  };
  // The coach's sessions, only so the Training mix can name intensities.
  const [planSessions, setPlanSessions] = useState<SessionMap>({});
  const [mixOpen, setMixOpen] = useState(false);

  type Modal = "identity" | "status" | "prs" | null;
  const [modal, setModal] = useState<Modal>(null);
  const [copied, setCopied] = useState(false);

  // Identity + saved varsity record.
  useEffect(() => {
    let active = true;
    (async () => {
      const b = await fetchAthleteProfile(userId);
      if (!active) return;
      setName(b.name);
      setClassYear(b.classYear);
      setProfile(b.profile);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  /*
    Every log the longest ready-made range could ask for, fetched once — which
    is what makes switching window instant. A window the athlete chose can reach
    further back than that, and only then do we go to the database again.
  */
  const loadFrom = useMemo(() => {
    const first = toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (LOAD_DAYS - 1)));
    return custom && custom.start < first ? custom.start : first;
  }, [now, custom]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId) {
        setLogs([]);
        return;
      }
      const rows = await fetchLogsInRange(userId, loadFrom, toISO(now));
      if (active) setLogs(rows);
    })();
    return () => {
      active = false;
    };
  }, [userId, now, loadFrom]);

  /*
    The coach's plan, only so a logged session can be told apart as UT2 / UT1 /
    hard in the Training mix. Loaded once — the plan is shared and doesn't
    change while someone reads their own profile.
  */
  useEffect(() => {
    let active = true;
    fetchPlan().then((p) => active && setPlanSessions(p.sessions));
    return () => {
      active = false;
    };
  }, []);

  const patchProfile = (patch: Partial<VarsityAthleteProfile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      void saveAthleteProfile(userId, next);
      return next;
    });
  };

  /*
    THE BUCKETS THE GRAPH PLOTS, for whichever range is chosen.

    A short range is read day by day, a long one week by week (the range's own
    data says which). Weekly buckets start on Mondays so a "week" means the same
    thing here as it does on the coach's plan; the last one is short whenever
    today is mid-week, and NO bucket ever reaches past today — an unfinished
    week judged on days that haven't happened would report everyone as slacking.

    Bucketing the LOGS rather than a running total is what lets the chosen
    measure do its own sum: switching to hours, or to a different range, never
    returns to the database.
  */
  const buckets = useMemo<Bucket[]>(() => {
    const todayIso = toISO(now);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    /*
      A ready-made window is measured back from today. A window the athlete
      chose has its own two ends and need not touch today at all, so it stops
      where they said — capped at today, because there is nothing after it.
    */
    const last = range.end ? new Date(Math.min(asDay(range.end).getTime(), today.getTime())) : today;
    const first = range.start ? asDay(range.start) : null;

    const starts: Date[] = [];
    if (range.bucket === "day") {
      for (const d = first ? new Date(first) : addDays(last, -(range.days - 1)); d <= last; d.setDate(d.getDate() + 1)) {
        starts.push(new Date(d));
      }
    } else {
      // Whole Mon–Sun weeks, ending with the one containing the last day.
      const lastMonday = mondayOf(last);
      const firstMonday = first ? mondayOf(first) : addDays(lastMonday, -(Math.ceil(range.days / 7) - 1) * 7);
      for (const d = new Date(firstMonday); d <= lastMonday; d.setDate(d.getDate() + 7)) {
        starts.push(new Date(d));
      }
    }

    const made: Bucket[] = starts.map((start, i) => {
      const end = new Date(start);
      if (range.bucket === "week") end.setDate(start.getDate() + 6);
      const endIso = toISO(end > last ? last : end);
      return {
        label:
          range.bucket === "day"
            ? `${start.getDate()}`
            : `${start.getMonth() + 1}/${start.getDate()}`,
        span: { startIso: toISO(start), endIso },
        logs: [],
        latest: i === starts.length - 1,
      };
    });

    for (const l of logs) {
      if (l.logDate > todayIso) continue;
      const b = made.find((bk) => l.logDate >= bk.span.startIso && l.logDate <= bk.span.endIso);
      if (b) b.logs.push(l);
    }
    return made;
  }, [logs, now, range]);

  /* What the range actually contained, kind by kind — the window behind the
     numbers. Computed here so the sheet and the graph can never disagree. */
  const mix = useMemo(
    () => trainingMix(buckets.flatMap((b) => b.logs), planSessions),
    [buckets, planSessions],
  );

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-screen-sm pb-8">
        <div className="px-4 pt-20 text-center text-[13px] text-muted">Loading your profile…</div>
      </div>
    );
  }

  const status = statusByTitle(profile.status);
  const classLine = [classYear, profile.teamYear].filter(Boolean).join(" · ") || "Add your details";
  const shareUrl = `hubc.app/m/${slugify(name)}-2026`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — no-op */
    }
  };
  const share = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "My training", url: `https://${shareUrl}` });
        return;
      } catch {
        /* cancelled — fall through to copy */
      }
    }
    copyLink();
  };

  /*
    One measure and one window for the whole block: the graph plots the measure
    bucket by bucket, and the three numbers above are that same measure over the
    whole range, per average bucket, and at its best. The MEASURE is saved with
    the athlete record; the RANGE is not — see the state above.
  */
  const metric = metricByKey(profile.statMetric);
  const points = buckets.map((b) => ({
    label: b.label,
    value: metric.value(b.logs, b.span),
    latest: b.latest,
  }));
  const tiles = summarise(buckets, metric, units, range);
  const chart = chartTypeOf(profile.statChart);

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-10">
      {/* ── Identity ── */}
      <div className="border-b border-border bg-[radial-gradient(circle_at_0%_0%,color-mix(in_srgb,var(--primary)_9%,transparent),transparent_60%)] px-4 pb-4 pt-4">
        <div className="flex items-start gap-3.5">
          <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-primary-line bg-gradient-to-br from-primary/15 to-primary/5">
            <span className="text-xl font-semibold text-primary">{initialsOf(name)}</span>
            <span
              className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-[2.5px] border-background ${toneDot[status.tone]}`}
            />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="truncate text-xl font-semibold leading-tight text-text">
              {name || "Your name"}
            </div>
            <div className="mt-1 text-[11px] text-muted">{classLine}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
                <span className="text-accent">
                  <IconAnchor size={11} />
                </span>
                {profile.teamYear || "Team"}
              </span>
              {/* Coxswain, or which side you row — the answer from setup, so it
                  doesn't vanish into the database the moment it's given. */}
              <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
                {profile.boatRole === "Coxswain"
                  ? "Coxswain"
                  : (sideLabel(profile.boatRole, profile.side) ?? "Both")}
              </span>
              {profile.heightCm != null && (
                <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
                  {profile.heightCm} cm
                </span>
              )}
              {profile.weightKg != null && (
                <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
                  {formatWeight(profile.weightKg, units.weight)}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModal("identity")}
            aria-label="Edit profile"
            className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-muted"
          >
            <IconPencil size={15} />
          </button>
        </div>
      </div>

      {/* ── Current status (tap to change) ── */}
      <button
        type="button"
        onClick={() => setModal("status")}
        className="mx-3.5 mt-3.5 flex w-[calc(100%-1.75rem)] items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface px-3.5 py-3 text-left"
      >
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border ${toneRing[status.tone]}`}>
          <IconActivity size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
            Current status
          </div>
          <div className={`mt-0.5 text-[13px] font-medium ${toneText[status.tone]}`}>{status.title}</div>
          <div className="mt-0.5 truncate text-[11px] text-muted">{status.sub}</div>
        </div>
        <span className="text-muted">
          <IconChevronRight size={17} />
        </span>
      </button>

      {/* ── Statistics ── */}
      <div className="px-4 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Statistics
      </div>

      {/* The window is chosen on the graph card below, where the measure is
          chosen — but it governs these three numbers too, which is why each of
          them names the range underneath itself. */}
      <div className="mx-3.5 mb-2.5 grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-border bg-surface px-2 py-2.5 text-center"
          >
            {/* "8h 30m" and "12.4 km" need more room than "14" — the number
                steps down a size rather than spilling out of the tile. */}
            <div
              className={`${t.value.length > 6 ? "text-[13px]" : "text-[15px]"} font-semibold leading-none text-text`}
            >
              {t.value}
            </div>
            <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-muted">
              {t.label}
            </div>
            <div className="mt-0.5 truncate text-[8px] text-muted">{t.sub}</div>
          </div>
        ))}
      </div>
      <div className="mx-3.5">
        <WeeklyGraph
          buckets={buckets}
          points={points}
          metric={metric}
          range={range}
          chart={chart}
          units={units}
          plan={planSessions}
          today={toISO(now)}
          windowStart={buckets[0]?.span.startIso ?? toISO(now)}
          onMetric={(key) => patchProfile({ statMetric: key })}
          onRange={pickRange}
          onCustom={(start, end) => setCustom({ start, end })}
          onChart={(key) => patchProfile({ statChart: key })}
        />

        {/* The way into the detail. A row of its own rather than making the
            graph card tappable — the card carries its own buttons, and a tap
            target wrapped around them is a tap target you fight. */}
        <button
          type="button"
          onClick={() => setMixOpen(true)}
          className="mt-2.5 flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3.5 text-left active:bg-surface-2"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-primary-line bg-primary-tint text-primary">
            <IconActivity size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-text">Training mix</div>
            <div className="mt-0.5 truncate text-[11px] text-muted">
              {mix.length
                ? mix
                    .slice(0, 3)
                    .map((r) => `${r.label} ${r.share}%`)
                    .join(" · ")
                : "Nothing logged in this range yet"}
            </div>
          </div>
          <span className="text-muted">
            <IconChevronRight size={17} />
          </span>
        </button>
      </div>

      {mixOpen && (
        <TrainingMixSheet
          rows={mix}
          rangeLabel={rangeCaption(range)}
          units={units}
          onClose={() => setMixOpen(false)}
        />
      )}

      {/* ── Training calendar → its own tab ── */}
      <Link
        href="/varsity/calendar"
        className="mx-3.5 mt-2.5 flex w-[calc(100%-1.75rem)] items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3"
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-primary-line bg-primary-tint text-primary">
          <IconCalendar size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-text">Training calendar</div>
          <div className="text-[11px] text-muted">See what you did, day by day</div>
        </div>
        <span className="text-muted">
          <IconChevronRight size={17} />
        </span>
      </Link>

      {/* ── Personal bests (editable) ── */}
      <div className="flex items-center justify-between px-4 pb-2 pt-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Personal Bests
        </div>
        <button
          type="button"
          onClick={() => setModal("prs")}
          aria-label="Edit personal bests"
          className="flex items-center gap-1 text-[11px] font-medium text-primary"
        >
          <IconPencil size={12} /> Edit
        </button>
      </div>
      <div className="mx-3.5 grid grid-cols-2 gap-1.5">
        {prPieces.map((piece) => {
          const val = profile.prs[piece];
          return (
            <button
              key={piece}
              type="button"
              onClick={() => setModal("prs")}
              className="flex items-baseline justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-left"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {piece}
              </span>
              <span className={`text-[14px] font-semibold ${val ? "text-text" : "text-text-3"}`}>
                {val || "—"}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Send to coaches abroad (shareable report link) ── */}
      <div className="px-4 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Recruiting
      </div>
      <div className="relative mx-3.5 overflow-hidden rounded-2xl border border-accent-line bg-gradient-to-br from-accent/10 to-surface">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
        <div className="flex items-start gap-3 px-4 pb-3 pt-3.5">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-accent-line bg-accent-tint text-accent">
            <IconGlobe size={20} />
          </span>
          <div className="flex-1">
            <div className="mb-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-accent">
              Shareable training report
            </div>
            <div className="text-base font-semibold leading-tight text-text">Send to coaches abroad</div>
            <div className="mt-1.5 text-[11px] leading-relaxed text-muted">
              A live page of your full training year — calendar, every session and test, with verified
              data. Paste the link into an email or WhatsApp.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-accent/15 bg-[color-mix(in_srgb,var(--text)_8%,transparent)] px-3.5 py-2.5">
          <div className="flex-1 truncate rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-[11px] text-muted">
            {shareUrl}
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.06em] text-text"
          >
            {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
            {copied ? "COPIED" : "COPY"}
          </button>
          <button
            type="button"
            onClick={share}
            className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.06em] text-background"
          >
            SEND
          </button>
        </div>
      </div>

      {/* The door into the console, for the people who run the squad. A plain
          athlete never sees it, and the database refuses them anyway. */}
      {consoleRole && (
        <div className="mx-3.5 mt-4">
          <Link
            href={can.buildPlan(consoleRole) ? "/varsity/coach/plan" : "/varsity/coach/team"}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-[11px] font-medium text-muted"
          >
            <IconChevronRight size={14} />
            Open {roleLabel[consoleRole]} Console
          </Link>
        </div>
      )}

      {/* ── Sheets ── */}
      {modal === "identity" && (
        <EditIdentitySheet
          profile={profile}
          units={units}
          onSave={patchProfile}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "status" && (
        <StatusSheet current={profile.status} onSave={patchProfile} onClose={() => setModal(null)} />
      )}
      {modal === "prs" && (
        <PrSheet prs={profile.prs} onSave={patchProfile} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

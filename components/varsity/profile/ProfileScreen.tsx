"use client";

/*
  Varsity PROFILE screen — the athlete's own rowing record, fully interactive.
  ---------------------------------------------------------------------------
  • Identity: the SAME name as the normal app profile (profiles.data.name), the
    year on the team (Freshman/Sophomore/…), and height/weight — all editable.
  • Current status: tap to change (Active / Sick / Injured / Away).
  • Statistics: pick a WINDOW (week / 2 weeks / month / 3 months, or two dates
    of your own) and a MEASURE (metres / hours / consistency); a graph — columns
    or a line — follows both, the expand icon opens it full size with the whole
    reading of the window under it, and tapping through opens the Training mix.
    All from the athlete OWN logs (lib/varsity/logStore), with the coach plan
    read only to name intensities.
  • A button into the Calendar tab — the day-by-day training history lives there.
  • Personal bests: 2K / 5K / 6K / 30′ r20 — editable.
  (A "send to coaches abroad" card used to sit at the bottom: a shareable
  training-report link. It was cut — the link pointed at a page that did not
  exist, under a hardcoded club domain and year, which broke the white-label
  rule as well as the promise. It comes back when there is a real page to link.)

  Editable data persists via lib/varsity/athleteProfile (profiles.data.varsity).
  All colors are theme tokens. Editor sheets use the shared <Sheet> (portalled).
*/
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import Sheet from "@/components/varsity/Sheet";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import { classOfLabel } from "@/lib/currentUser";
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
  statRanges,
  rangeByKey,
  customRange,
  rangeCaption,
  chartTypes,
  chartTypeOf,
  defaultStatRange,
  photoStatWindow,
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
import { Toggle } from "@/components/onboarding/controls";
import ClaimSeatSheet from "@/components/varsity/ClaimSeatSheet";
import { sideMeta, COX_COLOR, type Side } from "@/lib/varsity/coachLineup";
import { fetchPlan } from "@/lib/varsity/planStore";
import {
  isoDays,
  reasonMeta,
  spanLabel,
  spellDays,
  statusReason,
  type DayOut,
  type DayOutReason,
  type DaysOut,
} from "@/lib/varsity/daysOut";
import {
  IconPencil,
  IconExpand,
  IconActivity,
  IconChevronRight,
  IconCalendar,
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

/*
  THE SIDE CHIP, in the side's own colour — port red, starboard green, both
  blue, a cox gold. It is the same content data the lineup pool and the coach's
  seating screen paint with (lib/varsity/coachLineup → sideMeta / COX_COLOR),
  applied inline: a per-entity colour out of a data file is the one exception
  to "colours come from tokens" (rule 1), and this is it.
*/
function sideChip(p: { boatRole: string; side: Side }): React.CSSProperties {
  const cox = p.boatRole === "Coxswain";
  const color = cox ? COX_COLOR : sideMeta[p.side].color;
  return {
    color,
    borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
    background: `color-mix(in oklab, ${color} 14%, transparent)`,
  };
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
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

/* ─────────────────────────  log the spell?  ───────────────────────── */
/*
  Asked when the status stops being Sick / Injured / Away: "You were sick
  10–14 Sep, 5 days. Log it in your calendar?" One tap logs every one of those
  days with that reason; Not now leaves the calendar as it is. Days you trained
  on during the spell are left out — only the empty days are offered — and so
  is a day already in the calendar (the first one, marked when the status was
  picked). The grey explainer line went on 2026-09-14 (owner): a box to write
  what goes in the calendar took its place, filled with the first day's note.
*/
type Spell = {
  reason: DayOutReason;
  from: string;
  to: string;
  /** The days in from…to with no training logged — the only ones to mark. */
  days: string[];
  /** What was written when the status was picked — the box starts with it. */
  note: string;
};

function LogSpellSheet({
  spell,
  onLog,
  onClose,
}: {
  spell: Spell;
  onLog: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState(spell.note);
  const days = spell.days.length;
  const all = isoDays(spell.from, spell.to).length;
  const word = reasonMeta(spell.reason).label.toLowerCase();
  return (
    <Sheet title="Log it in your calendar?" onClose={onClose}>
      <p className="text-[14px] leading-relaxed text-text">
        You were {word === "other" ? "out" : word}{" "}
        <span className="font-semibold">{spanLabel(spell.from, spell.to)}</span> —{" "}
        {days === all
          ? `${days} day${days === 1 ? "" : "s"}.`
          : `${days} of those ${all} days with no training.`}
      </p>
      <CalendarNote value={note} onChange={setNote} />
      <div className="mt-4 flex gap-2.5">
        <Button variant="secondary" size="lg" onClick={onClose} className="flex-1">
          Not now
        </Button>
        <Button size="lg" onClick={() => onLog(note)} className="flex-1">
          Log {days} day{days === 1 ? "" : "s"}
        </Button>
      </div>
    </Sheet>
  );
}

/*
  THE BOX FOR WHAT GOES IN THE CALENDAR — shared by the status sheet and the
  "Log it in your calendar?" sheet, so both ask the same way.
*/
function CalendarNote({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={200}
      rows={3}
      placeholder="Write what to put in your calendar (optional)"
      aria-label="Note for your calendar"
      // 16px so a phone doesn't zoom in on focus.
      className="mt-3 w-full resize-none rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-base leading-snug text-text outline-none placeholder:text-muted focus:border-primary"
    />
  );
}

/* ─────────────────────────  status picker sheet  ───────────────────────── */
/*
  Just the four names — the grey line under each came off on 2026-09-14
  (owner). Active saves at once. Sick, Injured or Away opens a box to write
  what happened, and Save puts TODAY in the calendar with that reason and the
  note (unless today already has training on it — only an empty day is out).
*/
function StatusSheet({
  current,
  onSave,
  onClose,
}: {
  current: string;
  onSave: (patch: Partial<VarsityAthleteProfile>, note: string) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const shown = picked ?? current;
  return (
    <Sheet title="Current status" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {statusOptions.map((s) => {
          const active = s.title === shown;
          return (
            <button
              key={s.title}
              type="button"
              onClick={() => {
                if (statusReason(s.title) && s.title !== current) {
                  setPicked(s.title);
                  return;
                }
                onSave({ status: s.title }, "");
                onClose();
              }}
              className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left ${
                active ? "border-primary bg-primary-tint" : "border-border bg-surface-2"
              }`}
            >
              <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${toneDot[s.tone]}`} />
              <div className="min-w-0 flex-1 text-[13px] font-semibold text-text">{s.title}</div>
              {active && (
                <span className="text-primary">
                  <IconCheck size={16} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {picked && (
        <>
          <CalendarNote value={note} onChange={setNote} />
          <Button
            size="lg"
            full
            className="mt-3"
            onClick={() => {
              onSave({ status: picked }, note);
              onClose();
            }}
          >
            <IconCheck size={16} /> Save
          </Button>
        </>
      )}
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
  onZoom,
  onZoomOut,
  zoomed,
  daysOut,
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
  onZoom: (start: string, end: string) => void;
  onZoomOut: () => void;
  zoomed: boolean;
  daysOut: DaysOut;
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
          <Plot points={points} metric={metric} units={units} chart={chart} height={188} values="fit" />
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
          onZoom={onZoom}
          onZoomOut={onZoomOut}
          zoomed={zoomed}
          daysOut={daysOut}
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
  const [photo, setPhoto] = useState<string | null>(null);
  const [profile, setProfile] = useState<VarsityAthleteProfile | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  // The chosen window. Kept in the screen, not on the record: it's a question
  // you ask ("how was last week?"), not a setting you configure once. `custom`
  // is a pair of dates the athlete picked; while it is set it IS the window.
  const [rangeKey, setRangeKey] = useState(defaultStatRange);
  const [custom, setCustom] = useState<{ start: string; end: string } | null>(photoStatWindow);
  const range: StatRange = custom ? customRange(custom.start, custom.end) : rangeByKey(rangeKey);
  /*
    ZOOM (the full-screen graph's drag). A zoom is a window of dates like any
    other; what it adds is a way BACK — the window you were on before the first
    zoom, so "Zoom out" undoes however many zooms in one press. Picking a window
    by hand forgets it.
  */
  const [beforeZoom, setBeforeZoom] = useState<{ rangeKey: string; custom: { start: string; end: string } | null } | null>(null);
  const pickRange = (key: string) => {
    setBeforeZoom(null);
    setCustom(null);
    setRangeKey(key);
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
  // The coach's sessions, only so the Training mix can name intensities.
  const [planSessions, setPlanSessions] = useState<SessionMap>({});
  const [mixOpen, setMixOpen] = useState(false);

  type Modal = "identity" | "status" | "prs" | "seat" | null;
  const [modal, setModal] = useState<Modal>(null);
  const router = useRouter();

  /*
    ARRIVING FROM SETTINGS → "Edit varsity profile" (/varsity/profile?edit=1 —
    it was a pencil in the top bar until 2026-09-19). Settings is another
    page and this editor lives here, so the link is the message.
    Read off the URL after mount — useSearchParams would force a Suspense
    boundary around the whole screen — then cleared, so a refresh doesn't
    reopen it. Same shape as the log reminder's deep link on Home.
  */
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (!new URLSearchParams(window.location.search).has("edit")) return;
      setModal("identity");
      router.replace("/varsity/profile");
    });
    return () => cancelAnimationFrame(id);
  }, [router]);

  // Identity + saved varsity record.
  useEffect(() => {
    let active = true;
    (async () => {
      const b = await fetchAthleteProfile(userId);
      if (!active) return;
      setName(b.name);
      setClassYear(b.classYear);
      setPhoto(b.photo);
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
    THE STATUS, WITH DATES (lib/varsity/daysOut.ts). Switching to Sick, Injured
    or Away notes the day it started. Switching away from one of them — back to
    Active, or on to another — asks whether to put the days since into the
    calendar, so a week in bed is on record as a week in bed. Saying no still
    changes the status; the days are just not logged.
  */
  const [spell, setSpell] = useState<Spell | null>(null);
  // Days written onto the calendar record, merged onto the LATEST profile (the
  // status change just before may not be in this closure yet). `keep`: a day
  // already marked keeps what it says.
  const markDays = (days: string[], v: DayOut, keep: boolean) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const daysOut: DaysOut = { ...prev.daysOut };
      for (const iso of days) daysOut[iso] = keep ? (daysOut[iso] ?? v) : v;
      const next = { ...prev, daysOut };
      void saveAthleteProfile(userId, next);
      return next;
    });
  };
  const changeStatus = (patch: Partial<VarsityAthleteProfile>, note = "") => {
    if (!profile || patch.status === undefined || patch.status === profile.status) return;
    const today = toISO(now);
    const was = statusReason(profile.status);
    const becomes = statusReason(patch.status);
    const marked = profile.daysOut;
    if (was && profile.statusSince) {
      /*
        Only the days you did NOTHING (owner, 2026-09-13). A day with training
        on it wasn't a sick day, whatever the status said — so the spell's days
        are read against the logs first, and if you trained every one of them
        there is nothing to ask.
      */
      const { from, to } = spellDays(profile.statusSince, today);
      void fetchLogsInRange(userId ?? "", from, to).then((rows) => {
        const trained = new Set(rows.filter((l) => l.category !== "off").map((l) => l.logDate));
        // A day already in the calendar isn't asked about again.
        const days = isoDays(from, to).filter((d) => !trained.has(d) && !marked[d]);
        const firstNote = marked[profile.statusSince ?? ""]?.note ?? "";
        if (days.length > 0) setSpell({ reason: was, from, to, days, note: firstNote });
      });
    }
    patchProfile({ status: patch.status, statusSince: becomes ? today : null });
    /*
      PICKING Sick / Injured / Away LOGS TODAY (owner, 2026-09-14: "when I log
      injured or away, it doesn't log"). Today goes in the calendar with the
      reason and the note, unless today already has training, which no day out
      can have.
    */
    if (becomes) {
      const text = note.trim();
      void fetchLogsInRange(userId ?? "", today, today).then((rows) => {
        if (rows.some((l) => l.category !== "off")) return;
        markDays([today], { reason: becomes, ...(text ? { note: text } : {}) }, false);
      });
    }
  };
  const logSpell = (s: Spell, note: string) => {
    const text = note.trim();
    markDays(s.days, { reason: s.reason, ...(text ? { note: text } : {}) }, true);
  };

  /*
    ARRIVING FROM HOME'S "Still sick? · I'm back" (/varsity/profile?back=1):
    switch to Active on the spot, which asks about the days as above. Cleared
    off the URL so a refresh doesn't do it twice.
  */
  useEffect(() => {
    if (!profile) return;
    const id = requestAnimationFrame(() => {
      if (!new URLSearchParams(window.location.search).has("back")) return;
      router.replace("/varsity/profile");
      changeStatus({ status: statusOptions[0].title });
    });
    return () => cancelAnimationFrame(id);
    // Once, when the profile has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile === null]);

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
  /*
    JUST THE CLASS YEAR. It used to read "'30 · Freshman", and the second half
    was a stored word, not a live one: nothing moves it on to "Sophomore" when
    the year turns, so a returning rower's own profile would keep calling them
    a freshman until they went and edited it. The year alone is always true.
    (The word is still on the athlete's record and still shown to the coach and
    on the Team screen — it just isn't a line on your own page.)
  */
  const classLine = classYear ? classOfLabel(classYear) : "Add your details";

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
  const chart = chartTypeOf(profile.statChart);

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-10">
      {/* ── Identity ──
          THE IDENTITY CARD (owner, 2026-09-14, picked from four drawings). It
          used to be a 56px square of initials pressed against the top bar over
          a faint crimson glow, with the year, side, height and weight all on
          one line. Now it is a white card with room above it, your actual
          photo (the one from the normal Profile tab) in a 64px circle, and the
          facts in the order the owner asked for:

              Name
              Class of 2029
              86 kg  [Port]                                  ( Active )

          Height was cut — "just do the kg or pounds". The status keeps the
          right-hand end of the card; tap it to change it, as before. */}
      <div className="mx-3.5 mt-3.5 flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3.5">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary-tint text-primary">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={name || "Profile photo"} className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-semibold">{initialsOf(name)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] font-semibold leading-tight text-text">
            {name || "Your name"}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">{classLine}</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
            {profile.weightKg != null && <span>{formatWeight(profile.weightKg, units.weight)}</span>}
            {/* The side keeps its COLOUR — port red, starboard green, both
                blue, a cox gold — the same colours the lineup screens and the
                coach's pool paint the same fact with (lib/varsity/coachLineup
                → sideMeta). A per-entity colour out of a data file is the one
                exception to "colours come from tokens" (rule 1). */}
            <span
              className="rounded-md border px-1.5 py-px text-[11px] font-medium"
              style={sideChip(profile)}
            >
              {profile.boatRole === "Coxswain"
                ? "Coxswain"
                : (sideLabel(profile.boatRole, profile.side) ?? "Both")}
            </span>
          </div>
          {/* The prompt to PICK a name stays while there is nothing picked —
              a published boat cannot mark your seat without it — but on its
              own line, because it is an ACTION and the lines above are facts. */}
          {!profile.rosterId && (
            <button
              type="button"
              onClick={() => setModal("seat")}
              className="mt-1.5 rounded-md border border-primary-line bg-primary-tint px-2 py-1 text-[11px] font-medium text-primary"
            >
              Pick your name on the squad list
            </button>
          )}
        </div>
        {/* YOUR STATUS, at the right-hand end of the card. It is the one thing
            on this page that changes week to week. Tap it to change it. */}
        <button
          type="button"
          onClick={() => setModal("status")}
          aria-label={`Current status: ${status.title}. Change it`}
          className={`press-icon flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 ${toneRing[status.tone]}`}
        >
          <IconActivity size={13} />
          <span className={`text-[11px] font-medium ${toneText[status.tone]}`}>{status.title}</span>
        </button>
      </div>

      {/* ── Statistics ── */}
      <div className="px-4 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Statistics
      </div>

      {/* Three tiles — Total / Avg week / Best week — used to sit here above
          the graph. CUT (owner, 2026-09-13): the expand icon opens the whole
          reading, so the card no longer has to try to be a summary as well as
          a glance. The heading now sits straight on the graph. */}
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
          onCustom={(start, end) => {
            setBeforeZoom(null);
            setCustom({ start, end });
          }}
          onChart={(key) => patchProfile({ statChart: key })}
          onZoom={zoomTo}
          onZoomOut={zoomOut}
          zoomed={beforeZoom !== null}
          daysOut={profile.daysOut}
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
            {/* Its name only. The grey line under it ("Rowing 60% · Bike
                20%…") was cut on 2026-09-13 at the owner's ask; the figures
                live on the statistics full screen and in the sheet. */}
            <div className="text-[13px] font-medium text-text">Training mix</div>
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
        {/* The name alone. "See what you did, day by day" explained a row that
            says "Training calendar" next to a calendar icon (owner,
            2026-09-13). */}
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-text">Training calendar</div>
        </div>
        <span className="text-muted">
          <IconChevronRight size={17} />
        </span>
      </Link>
      {/* WHO SEES IT (owner, 2026-09-13): teammates who open you on the Team
          tab see your training month unless you switch it off here. Its own
          row, not inside the link above, so flipping it never opens the
          calendar. The coach sees it either way. */}
      <div className="mx-3.5 mt-1.5 flex items-center justify-between gap-3 px-3.5 py-1.5">
        <span className="text-[12px] text-muted">Teammates see my calendar</span>
        <Toggle
          on={profile.showCalendar}
          onChange={() => patchProfile({ showCalendar: !profile.showCalendar })}
          ariaLabel="Teammates see my calendar"
        />
      </div>

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
        <StatusSheet current={profile.status} onSave={changeStatus} onClose={() => setModal(null)} />
      )}
      {spell && (
        <LogSpellSheet
          spell={spell}
          onLog={(note) => {
            logSpell(spell, note);
            setSpell(null);
          }}
          onClose={() => setSpell(null)}
        />
      )}
      {modal === "prs" && (
        <PrSheet prs={profile.prs} onSave={patchProfile} onClose={() => setModal(null)} />
      )}
      {modal === "seat" && (
        <ClaimSeatSheet
          current={profile.rosterId}
          onClaim={(rosterId) => patchProfile({ rosterId })}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

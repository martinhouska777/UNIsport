"use client";

/*
  Varsity PROFILE screen — the athlete's own rowing record, fully interactive.
  ---------------------------------------------------------------------------
  • Identity: the SAME name as the normal app profile (profiles.data.name), the
    year on the team (Freshman/Sophomore/…), and height/weight — all editable.
  • Current status: tap to change (Active / Light training / Injured / Away).
  • Statistics: this-month sessions + metres and an 8-week "metres rowed" graph,
    all computed from the athlete's OWN logs (lib/varsity/logStore).
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
import { toISO } from "@/lib/varsity/coachPlan";
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
  nextMetric,
  summarise,
  type StatMetric,
} from "@/lib/varsity/athleteStats";
import {
  IconPencil,
  IconChevronLeft,
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

const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-base text-text outline-none focus:border-primary placeholder:text-muted";

const WEEKS = 8;

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
                <span className="text-[10px] opacity-70">{o.sub}</span>
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

/* ─────────────────────────  weekly line graph  ─────────────────────────
   Whatever the athlete picked with the arrows in its header: metres, hours,
   sessions or days. The three numbers above it come from the same buckets. */
function WeeklyGraph({
  weeks,
  metric,
  onSwap,
}: {
  weeks: { label: string; value: number; latest: boolean }[];
  metric: StatMetric;
  onSwap: (dir: 1 | -1) => void;
}) {
  const max = Math.max(1, ...weeks.map((w) => w.value));
  const anyData = weeks.some((w) => w.value > 0);

  // SVG geometry (a viewBox that stretches to the card width).
  const W = 320;
  const H = 116;
  const padX = 8;
  const padT = 14;
  const padB = 16;
  const plotW = W - padX * 2;
  const plotH = H - padT - padB;
  const baseline = padT + plotH;
  const n = weeks.length;
  const x = (i: number) => padX + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const y = (v: number) => padT + plotH * (1 - v / max);

  const pts = weeks.map((w, i) => [x(i), y(w.value)] as const);
  const line = pts.map(([px, py]) => `${px},${py}`).join(" ");
  const area = `M ${pts[0][0]},${baseline} L ${line.replaceAll(" ", " L ")} L ${pts[n - 1][0]},${baseline} Z`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface px-3.5 pb-3 pt-3.5">
      {/* The arrows live here, on the thing they change. Everything in this
          block — graph and the three numbers above it — follows this choice. */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onSwap(-1)}
            aria-label="Chart the previous measure"
            className="tap44 press-icon -ml-1.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2"
          >
            <IconChevronLeft size={15} />
          </button>
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-text">
            {metric.label}
          </span>
          <button
            type="button"
            onClick={() => onSwap(1)}
            aria-label="Chart the next measure"
            className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2"
          >
            <IconChevronRight size={15} />
          </button>
        </div>
        <span className="flex-shrink-0 text-[11px] text-muted">last {WEEKS} weeks</span>
      </div>

      {anyData ? (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            className="mt-2 block text-primary"
            aria-hidden="true"
          >
            {/* baseline */}
            <line x1={padX} y1={baseline} x2={W - padX} y2={baseline} stroke="var(--border)" strokeWidth={1} />
            {/* soft area under the line */}
            <path d={area} fill="var(--primary)" fillOpacity={0.1} />
            {/* the trend line */}
            <polyline
              points={line}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* points (latest filled solid) */}
            {pts.map(([px, py], i) => (
              <circle
                key={i}
                cx={px}
                cy={py}
                r={weeks[i].latest ? 4 : 3}
                fill={weeks[i].latest ? "var(--primary)" : "var(--surface)"}
                stroke="currentColor"
                strokeWidth={2}
              />
            ))}
          </svg>
          <div className="mt-1 flex">
            {weeks.map((w, i) => (
              <div key={i} className="flex-1 text-center text-[7px] text-muted">
                {w.latest ? "This wk" : w.label}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-2 rounded-xl border border-dashed border-border bg-surface-2 px-3 py-6 text-center text-[11px] text-muted">
          {metric.empty}
        </p>
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

  // Logs across the last 8 weeks — powers the graph + this-month stats.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId) {
        setLogs([]);
        return;
      }
      const firstMonday = mondayOf(now);
      firstMonday.setDate(firstMonday.getDate() - (WEEKS - 1) * 7);
      const rows = await fetchLogsInRange(userId, toISO(firstMonday), toISO(now));
      if (active) setLogs(rows);
    })();
    return () => {
      active = false;
    };
  }, [userId, now]);

  const patchProfile = (patch: Partial<VarsityAthleteProfile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      void saveAthleteProfile(userId, next);
      return next;
    });
  };

  /*
    The last 8 Mon–Sun weeks, each holding its own logs. Bucketing the LOGS
    rather than a running total is what lets the chosen measure do its own sum —
    switching the graph to hours is instant and never returns to the database.
  */
  const weekBuckets = useMemo(() => {
    const thisMonday = mondayOf(now);
    const buckets = Array.from({ length: WEEKS }, (_, i) => {
      const start = new Date(thisMonday);
      start.setDate(thisMonday.getDate() - (WEEKS - 1 - i) * 7);
      return {
        startIso: toISO(start),
        endIso: toISO(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)),
        label: `${start.getMonth() + 1}/${start.getDate()}`,
        logs: [] as LogEntry[],
        latest: i === WEEKS - 1,
      };
    });
    for (const l of logs) {
      const b = buckets.find((bk) => l.logDate >= bk.startIso && l.logDate <= bk.endIso);
      if (b) b.logs.push(l);
    }
    return buckets;
  }, [logs, now]);

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
    One measure for the whole Statistics block: the graph plots it week by week,
    and the three numbers above are the same measure this week, on average, and
    at its best. The choice is saved with the rest of the athlete's record.
  */
  const metric = metricByKey(profile.statMetric);
  const weekValues = weekBuckets.map((b) => metric.weekly(b.logs));
  const weeks = weekBuckets.map((b, i) => ({
    label: b.label,
    value: weekValues[i],
    latest: b.latest,
  }));
  const tiles = summarise(weekValues, metric, units);
  const swapMetric = (dir: 1 | -1) =>
    patchProfile({ statMetric: nextMetric(metric.key, dir) });

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
                  : (sideLabel(profile.boatRole, profile.side) ?? "Either side")}
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
      <div className="mx-3.5 mb-1.5 grid grid-cols-3 gap-1.5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-2xl border border-border bg-surface px-1.5 py-3 text-center"
          >
            {/* "8h 30m" and "12.4 km" need more room than "14" — the number
                steps down a size rather than spilling out of the tile. */}
            <div
              className={`${t.value.length > 6 ? "text-base" : "text-xl"} font-semibold leading-none text-text`}
            >
              {t.value}
            </div>
            <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-muted">
              {t.label}
            </div>
            <div className="mt-0.5 text-[8px] text-muted">{t.sub}</div>
          </div>
        ))}
      </div>
      <div className="mx-3.5">
        <WeeklyGraph weeks={weeks} metric={metric} onSwap={swapMetric} />
      </div>

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

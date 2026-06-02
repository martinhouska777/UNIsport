"use client";

/*
  Varsity PROFILE screen — the athlete's own rowing record, fully interactive.
  ---------------------------------------------------------------------------
  • Identity: the SAME name as the normal app profile (profiles.data.name), the
    year on the team (Freshman/Sophomore/…), and height/weight — all editable.
  • Current status: tap to change (Active / Light training / Injured / Away).
  • Training calendar: a compact, tappable month built from the athlete's OWN
    logged sessions (lib/varsity/logStore). Tap a day to see what was logged.
  • This-month stats: sessions completed + metres rowed, from the same logs.
  • Personal bests: 2K / 5K / 6K / 30′ r20 — editable.
  • Send to coaches abroad: a shareable link (copy / share sheet).

  Editable data persists via lib/varsity/athleteProfile (profiles.data.varsity).
  All colors are theme tokens; per-category calendar dots are CONTENT colors from
  data, applied via inline style (rule-1 exception). Editor sheets are portalled
  to <body>, so they re-wrap themselves in <ThemeProvider> to keep the theme.
*/
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import ThemeProvider from "@/components/ThemeProvider";
import { useAppState } from "@/components/AppState";
import { varsityTheme, varsityLightTheme } from "@/lib/varsity/theme";
import { fetchLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { formatMetrics } from "@/lib/varsity/logParse";
import { toISO } from "@/lib/varsity/coachPlan";
import {
  fetchAthleteProfile,
  saveAthleteProfile,
  teamYearOptions,
  statusOptions,
  prPieces,
  logCategoryColor,
  rowingCategories,
  type VarsityAthleteProfile,
  type StatusTone,
} from "@/lib/varsity/athleteProfile";
import {
  IconPencil,
  IconAnchor,
  IconActivity,
  IconChevronRight,
  IconChevronDown,
  IconGlobe,
  IconCopy,
  IconCheck,
  IconX,
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
  success: "border-success/30 bg-success/15 text-success",
  warn: "border-warn/30 bg-warn/15 text-warn",
  danger: "border-danger/30 bg-danger/15 text-danger",
  muted: "border-border bg-surface-2 text-muted",
};
const statusByTitle = (title: string) =>
  statusOptions.find((s) => s.title === title) ?? statusOptions[0];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "athlete";
}

/* ─────────────────────────  reusable bottom sheet  ───────────────────────── */
function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <ThemeProvider tokens={varsityTheme} light={varsityLightTheme}>
      <div className="fixed inset-0 z-[60] flex flex-col justify-end">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
        />
        <div className="relative max-h-[85%] overflow-y-auto rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
          <div className="flex justify-center pb-1.5 pt-2.5">
            <div className="h-1 w-9 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between border-b border-border px-4 pb-3">
            <span className="text-[15px] font-semibold text-text">{title}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
            >
              <IconX size={14} />
            </button>
          </div>
          <div className="px-4 pb-8 pt-4">{children}</div>
        </div>
      </div>
    </ThemeProvider>,
    document.body,
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-base text-text outline-none focus:border-primary placeholder:text-muted";

/* ─────────────────────────  edit identity sheet  ───────────────────────── */
function EditIdentitySheet({
  profile,
  onSave,
  onClose,
}: {
  profile: VarsityAthleteProfile;
  onSave: (patch: Partial<VarsityAthleteProfile>) => void;
  onClose: () => void;
}) {
  const [teamYear, setTeamYear] = useState(profile.teamYear);
  const [height, setHeight] = useState(profile.heightCm != null ? String(profile.heightCm) : "");
  const [weight, setWeight] = useState(profile.weightKg != null ? String(profile.weightKg) : "");

  const save = () => {
    onSave({
      teamYear,
      heightCm: height.trim() ? Number(height) : null,
      weightKg: weight.trim() ? Number(weight) : null,
    });
    onClose();
  };

  return (
    <Sheet title="Edit profile" onClose={onClose}>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
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
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-surface-2 text-text"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] text-muted">Height (cm)</label>
          <input
            value={height}
            onChange={(e) => setHeight(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder="—"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-muted">Weight (kg)</label>
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            placeholder="—"
            className={inputCls}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[14px] font-semibold text-primary-contrast"
      >
        <IconCheck size={16} /> Save
      </button>
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
                active ? "border-primary bg-primary/10" : "border-border bg-surface-2"
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
      <button
        type="button"
        onClick={() => {
          const cleaned: Record<string, string> = {};
          for (const [k, v] of Object.entries(draft)) if (v.trim()) cleaned[k] = v.trim();
          onSave({ prs: cleaned });
          onClose();
        }}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[14px] font-semibold text-primary-contrast"
      >
        <IconCheck size={16} /> Save bests
      </button>
    </Sheet>
  );
}

/* ─────────────────────────  day-detail sheet  ───────────────────────── */
function DaySheet({
  dateLabel,
  logs,
  onClose,
}: {
  dateLabel: string;
  logs: LogEntry[];
  onClose: () => void;
}) {
  return (
    <Sheet title={dateLabel} onClose={onClose}>
      {logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-6 text-center text-[12px] text-muted">
          Nothing logged this day.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((l) => {
            const metrics = formatMetrics(l.minutes, l.metres, l.split);
            return (
              <div key={l.id} className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
                <span
                  className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ background: logCategoryColor[l.category ?? "other"] ?? "var(--muted)" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-text">{l.title}</div>
                  {metrics && <div className="mt-0.5 text-[12px] text-text/90">{metrics}</div>}
                  {l.note && <div className="mt-0.5 text-[11px] text-muted">{l.note}</div>}
                </div>
                {l.source === "plan" && (
                  <span className="flex-shrink-0 rounded-md border border-border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted">
                    Plan
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Link
        href="/varsity/log"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-[12px] font-medium text-text"
      >
        Open the log
        <IconChevronRight size={14} />
      </Link>
    </Sheet>
  );
}

/* ─────────────────────────  screen  ───────────────────────── */
type CalDay = { num: number; iso: string; dots: string[]; today: boolean; future: boolean };

export default function ProfileScreen() {
  const { userId } = useAppState();
  const now = useMemo(() => new Date(), []);
  const todayIso = toISO(now);

  const [name, setName] = useState("");
  const [classYear, setClassYear] = useState("");
  const [profile, setProfile] = useState<VarsityAthleteProfile | null>(null);

  // Calendar month being viewed (defaults to the current month).
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [logs, setLogs] = useState<LogEntry[]>([]);

  type Modal =
    | { kind: "identity" }
    | { kind: "status" }
    | { kind: "prs" }
    | { kind: "day"; iso: string; label: string }
    | null;
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

  // Logs for the viewed month (drives the calendar + this-month stats).
  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId) {
        setLogs([]);
        return;
      }
      const from = toISO(new Date(view.y, view.m, 1));
      const to = toISO(new Date(view.y, view.m + 1, 0));
      const rows = await fetchLogsInRange(userId, from, to);
      if (active) setLogs(rows);
    })();
    return () => {
      active = false;
    };
  }, [userId, view]);

  const patchProfile = async (patch: Partial<VarsityAthleteProfile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      void saveAthleteProfile(userId, next);
      return next;
    });
  };

  // Logs grouped by day-of-month, for the calendar + day sheet.
  const logsByDay = useMemo(() => {
    const map: Record<number, LogEntry[]> = {};
    for (const l of logs) {
      const day = Number(l.logDate.split("-")[2]);
      (map[day] ??= []).push(l);
    }
    return map;
  }, [logs]);

  const calendar = useMemo<CalDay[]>(() => {
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const out: CalDay[] = [];
    for (let n = 1; n <= daysInMonth; n++) {
      const iso = toISO(new Date(view.y, view.m, n));
      const dayLogs = logsByDay[n] ?? [];
      // Unique categories that day, in first-seen order, capped at 3 dots.
      const seen = new Set<string>();
      const dots: string[] = [];
      for (const l of dayLogs) {
        const c = l.category ?? "other";
        if (!seen.has(c) && dots.length < 3) {
          seen.add(c);
          dots.push(c);
        }
      }
      out.push({ num: n, iso, dots, today: iso === todayIso, future: iso > todayIso });
    }
    return out;
  }, [view, logsByDay, todayIso]);

  const leadingEmpty = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday-first
  const monthSessions = logs.length;
  const monthMetres = logs.reduce(
    (sum, l) => sum + (rowingCategories.has(l.category ?? "") ? l.metres ?? 0 : 0),
    0,
  );
  const metresLabel =
    monthMetres >= 1000 ? `${(monthMetres / 1000).toFixed(monthMetres >= 10000 ? 0 : 1)}k` : String(monthMetres);

  const goMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const atCurrentMonth = view.y === now.getFullYear() && view.m === now.getMonth();

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

  const dayNames = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-10">
      {/* ── Identity ── */}
      <div className="border-b border-border bg-[radial-gradient(circle_at_0%_0%,color-mix(in_srgb,var(--primary)_9%,transparent),transparent_60%)] px-4 pb-4 pt-4">
        <div className="flex items-start gap-3.5">
          <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/15 to-primary/5">
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
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[10px] text-text">
                <span className="text-accent">
                  <IconAnchor size={11} />
                </span>
                {profile.teamYear || "Team"}
              </span>
              {profile.heightCm != null && (
                <span className="rounded-md border border-border bg-surface px-2 py-1 text-[10px] text-text">
                  {profile.heightCm} cm
                </span>
              )}
              {profile.weightKg != null && (
                <span className="rounded-md border border-border bg-surface px-2 py-1 text-[10px] text-text">
                  {profile.weightKg} kg
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModal({ kind: "identity" })}
            aria-label="Edit profile"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-muted"
          >
            <IconPencil size={15} />
          </button>
        </div>
      </div>

      {/* ── Current status (tap to change) ── */}
      <button
        type="button"
        onClick={() => setModal({ kind: "status" })}
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
          <div className="mt-0.5 truncate text-[10px] text-muted">{status.sub}</div>
        </div>
        <span className="text-muted">
          <IconChevronRight size={17} />
        </span>
      </button>

      {/* ── Training calendar (compact + tappable, built from logged sessions) ── */}
      <div className="px-4 pb-2 pt-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">
        Training Calendar
      </div>
      <div className="mx-3.5 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-text">{MONTHS[view.m]}</span>
            <span className="text-[10px] font-medium tracking-wide text-muted">{view.y}</span>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => goMonth(-1)}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-2 text-muted"
            >
              <IconChevronDown size={14} className="rotate-90" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => goMonth(1)}
              disabled={atCurrentMonth}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-2 text-muted disabled:opacity-30"
            >
              <IconChevronDown size={14} className="-rotate-90" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border px-2 pb-1 pt-2">
          {dayNames.map((d, i) => (
            <div key={i} className="py-0.5 text-center text-[8px] font-semibold tracking-[0.14em] text-muted">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-[3px] px-2 pb-2.5 pt-1.5">
          {Array.from({ length: leadingEmpty }).map((_, i) => (
            <div key={`e${i}`} className="aspect-square" />
          ))}
          {calendar.map((d) => {
            const has = d.dots.length > 0;
            const label = `${MONTHS[view.m]} ${d.num}`;
            return (
              <button
                key={d.num}
                type="button"
                onClick={() => setModal({ kind: "day", iso: d.iso, label })}
                className={`flex aspect-square flex-col items-center justify-center rounded-[9px] pt-0.5 ${
                  d.today ? "border border-primary/40 bg-primary/15" : has ? "active:bg-surface-2" : ""
                }`}
              >
                <span
                  className={`text-[12px] font-medium leading-none ${
                    d.today ? "font-bold text-primary" : d.future ? "text-muted" : "text-text"
                  }`}
                >
                  {d.num}
                </span>
                <span className="mt-[3px] flex h-1 items-center gap-0.5">
                  {d.dots.map((c, i) => (
                    <span
                      key={i}
                      className="h-1 w-1 rounded-full"
                      style={{ background: logCategoryColor[c] ?? "var(--muted)" }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        {/* This-month summary, straight from the logs */}
        <div className="flex items-center gap-3.5 border-t border-border px-3.5 py-3">
          <div>
            <div className="text-sm font-semibold leading-none text-text">{monthSessions}</div>
            <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
              Sessions
            </div>
          </div>
          <div className="h-6 w-px bg-border" />
          <div>
            <div className="text-sm font-semibold leading-none text-text">{metresLabel}</div>
            <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
              Metres rowed
            </div>
          </div>
          <span className="ml-auto text-[9px] text-muted">this month</span>
        </div>
      </div>

      {/* ── Personal bests (editable) ── */}
      <div className="flex items-center justify-between px-4 pb-2 pt-5">
        <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">
          Personal Bests
        </div>
        <button
          type="button"
          onClick={() => setModal({ kind: "prs" })}
          aria-label="Edit personal bests"
          className="flex items-center gap-1 text-[10px] font-medium text-primary"
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
              onClick={() => setModal({ kind: "prs" })}
              className="flex items-baseline justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-left"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                {piece}
              </span>
              <span className={`text-[14px] font-semibold ${val ? "text-text" : "text-muted/50"}`}>
                {val || "—"}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Send to coaches abroad (shareable report link) ── */}
      <div className="px-4 pb-2 pt-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">
        Recruiting
      </div>
      <div className="relative mx-3.5 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-surface">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
        <div className="flex items-start gap-3 px-4 pb-3 pt-3.5">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/15 text-accent">
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
          <div className="flex-1 truncate rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-[10px] text-muted">
            {shareUrl}
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.06em] text-text"
          >
            {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
            {copied ? "COPIED" : "COPY"}
          </button>
          <button
            type="button"
            onClick={share}
            className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.06em] text-background"
          >
            SEND
          </button>
        </div>
      </div>

      {/* Dev entry into the Coach Console (until the real coach role/approval exists) */}
      <div className="mx-3.5 mt-4">
        <Link
          href="/varsity/coach"
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-[11px] font-medium text-muted"
        >
          <IconChevronRight size={14} />
          Open Coach Console (dev)
        </Link>
      </div>

      {/* ── Sheets ── */}
      {modal?.kind === "identity" && (
        <EditIdentitySheet profile={profile} onSave={patchProfile} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "status" && (
        <StatusSheet current={profile.status} onSave={patchProfile} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "prs" && (
        <PrSheet prs={profile.prs} onSave={patchProfile} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "day" && (
        <DaySheet
          dateLabel={modal.label}
          logs={logsByDay[Number(modal.iso.split("-")[2])] ?? []}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

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
import Link from "next/link";
import Sheet from "@/components/varsity/Sheet";
import { useAppState } from "@/components/AppState";
import { fetchLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { toISO } from "@/lib/varsity/coachPlan";
import {
  fetchAthleteProfile,
  saveAthleteProfile,
  teamYearOptions,
  statusOptions,
  prPieces,
  rowingCategories,
  type VarsityAthleteProfile,
  type StatusTone,
} from "@/lib/varsity/athleteProfile";
import {
  IconPencil,
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
  success: "border-success/30 bg-success/15 text-success",
  warn: "border-warn/30 bg-warn/15 text-warn",
  danger: "border-danger/30 bg-danger/15 text-danger",
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
function metresK(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)}k`;
  return String(m);
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

/* ─────────────────────────  weekly-metres bar graph  ───────────────────────── */
function MetresGraph({ weeks }: { weeks: { label: string; metres: number; latest: boolean }[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.metres));
  const anyData = weeks.some((w) => w.metres > 0);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface px-3.5 pb-3 pt-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
          Metres rowed
        </span>
        <span className="text-[10px] text-muted">last {WEEKS} weeks</span>
      </div>

      {anyData ? (
        <>
          <div className="mt-3 flex h-28 items-end gap-1.5">
            {weeks.map((w, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[7px] font-medium text-muted">
                  {w.metres > 0 ? metresK(w.metres) : ""}
                </span>
                <div
                  className={`w-full rounded-t-[3px] ${w.latest ? "bg-primary" : "bg-primary/35"}`}
                  style={{ height: `${Math.max((w.metres / max) * 100, w.metres > 0 ? 6 : 1)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {weeks.map((w, i) => (
              <div key={i} className="flex-1 text-center text-[7px] text-muted">
                {w.label}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-border bg-surface-2 px-3 py-6 text-center text-[11px] text-muted">
          Log some erg or water sessions and your weekly metres will chart here.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────  screen  ───────────────────────── */
export default function ProfileScreen() {
  const { userId } = useAppState();
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

  // This month's totals.
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
  const monthLogs = useMemo(() => logs.filter((l) => l.logDate.startsWith(monthPrefix)), [logs, monthPrefix]);
  const monthSessions = monthLogs.length;
  const monthMetres = monthLogs.reduce(
    (s, l) => s + (rowingCategories.has(l.category ?? "") ? l.metres ?? 0 : 0),
    0,
  );

  // Weekly metres buckets (Mon–Sun), oldest → newest.
  const weeks = useMemo(() => {
    const thisMonday = mondayOf(now);
    const buckets = Array.from({ length: WEEKS }, (_, i) => {
      const start = new Date(thisMonday);
      start.setDate(thisMonday.getDate() - (WEEKS - 1 - i) * 7);
      return {
        startIso: toISO(start),
        endIso: toISO(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)),
        label: `${start.getMonth() + 1}/${start.getDate()}`,
        metres: 0,
        latest: i === WEEKS - 1,
      };
    });
    for (const l of logs) {
      if (!rowingCategories.has(l.category ?? "")) continue;
      const b = buckets.find((bk) => l.logDate >= bk.startIso && l.logDate <= bk.endIso);
      if (b) b.metres += l.metres ?? 0;
    }
    return buckets;
  }, [logs, now]);

  const weeklyAvg = Math.round(weeks.reduce((s, w) => s + w.metres, 0) / WEEKS);

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

  const statTiles = [
    { val: String(monthSessions), lbl: "Sessions", sub: "this month" },
    { val: metresK(monthMetres), lbl: "Metres", sub: "this month" },
    { val: metresK(weeklyAvg), lbl: "Weekly avg", sub: `${WEEKS} wks` },
  ];

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
            onClick={() => setModal("identity")}
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
          <div className="mt-0.5 truncate text-[10px] text-muted">{status.sub}</div>
        </div>
        <span className="text-muted">
          <IconChevronRight size={17} />
        </span>
      </button>

      {/* ── Statistics ── */}
      <div className="px-4 pb-2 pt-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">
        Statistics
      </div>
      <div className="mx-3.5 mb-2.5 grid grid-cols-3 gap-1.5">
        {statTiles.map((t) => (
          <div key={t.lbl} className="rounded-2xl border border-border bg-surface px-2 py-3 text-center">
            <div className="text-xl font-semibold leading-none text-text">{t.val}</div>
            <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted">
              {t.lbl}
            </div>
            <div className="mt-0.5 text-[8px] text-muted">{t.sub}</div>
          </div>
        ))}
      </div>
      <div className="mx-3.5">
        <MetresGraph weeks={weeks} />
      </div>

      {/* ── Training calendar → its own tab ── */}
      <Link
        href="/varsity/calendar"
        className="mx-3.5 mt-2.5 flex w-[calc(100%-1.75rem)] items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3"
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-primary/30 bg-primary/10 text-primary">
          <IconCalendar size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-text">Training calendar</div>
          <div className="text-[10px] text-muted">See what you did, day by day</div>
        </div>
        <span className="text-muted">
          <IconChevronRight size={17} />
        </span>
      </Link>

      {/* ── Personal bests (editable) ── */}
      <div className="flex items-center justify-between px-4 pb-2 pt-5">
        <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">
          Personal Bests
        </div>
        <button
          type="button"
          onClick={() => setModal("prs")}
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
              onClick={() => setModal("prs")}
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
      {modal === "identity" && (
        <EditIdentitySheet profile={profile} onSave={patchProfile} onClose={() => setModal(null)} />
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

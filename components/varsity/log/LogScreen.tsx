"use client";

/*
  Varsity LOG screen — where the athlete logs training.
  Connected to the coach's plan: today's PRESCRIBED sessions are listed first,
  each loggable in one tap (result + how it felt + note). Below that, "extra
  training" the athlete adds themselves, logged the normal manual way. A
  prominent "Scan C2 / RP3 monitor" button is a placeholder for the photo
  auto-read coming later.

  Logs are private per-athlete (lib/varsity/logStore.ts). The editor is a
  full-screen sheet portalled to <body> (same pattern as the plan/notes editors,
  so its Save bar stays pinned). Colors are theme tokens; the per-category dot is
  a content color applied via inline style (rule-1 exception).
*/
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { varsityTheme } from "@/lib/varsity/theme";
import { useAppState } from "@/components/AppState";
import { fetchPlan, type Plan } from "@/lib/varsity/planStore";
import { prescribedForDay } from "@/lib/varsity/athleteHome";
import {
  sessionLabel,
  categoryMeta,
  toISO,
  type Session,
  type Period,
} from "@/lib/varsity/coachPlan";
import { estimateForSession, formatMetrics } from "@/lib/varsity/logParse";
import { scanErgPhoto, minutesToClock } from "@/lib/varsity/ergScan";
import {
  fetchLogsInRange,
  savePlanLog,
  saveExtraLog,
  updateLog,
  deleteLog,
  type LogEntry,
  type LogDraft,
} from "@/lib/varsity/logStore";
import {
  IconCamera,
  IconPlus,
  IconCheck,
  IconCheckCircle,
  IconArrowLeft,
  IconClock,
  IconChevronRight,
} from "@/components/icons";

/* category → label + content color for the dot (extra adds run/bike/other) */
const catMeta: Record<string, { label: string; color: string }> = {
  water: { label: "Water", color: categoryMeta.water.color },
  erg: { label: "Erg", color: "#60a5fa" },
  weights: { label: "Weights", color: categoryMeta.weights.color },
  flex: { label: "Flex", color: "var(--accent)" },
  off: { label: "Off", color: categoryMeta.off.color },
  run: { label: "Run", color: "#c084fc" },
  bike: { label: "Bike", color: "#f59e0b" },
  other: { label: "Other", color: "var(--muted)" },
};
const extraCategories = ["erg", "water", "weights", "run", "bike", "other"] as const;
function Dot({ color }: { color: string }) {
  return <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: color }} />;
}

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between px-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{children}</span>
      {hint && <span className="text-[10px] text-muted">{hint}</span>}
    </div>
  );
}

/* ─────────────────────────  editor (portal)  ───────────────────────── */
type EditorState =
  | { mode: "plan"; period: Period; dayKey: string; session: Session; existing?: LogEntry }
  | { mode: "extra"; existing?: LogEntry };

function LogEditor({
  state,
  athleteId,
  logDate,
  onClose,
  onSaved,
}: {
  state: EditorState;
  athleteId: string;
  logDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const existing = state.existing;
  // For a planned session with no log yet, pre-fill minutes/metres from the plan.
  const est = state.mode === "plan" && !existing ? estimateForSession(state.session) : null;
  const [title, setTitle] = useState(
    existing?.title ?? (state.mode === "plan" ? sessionLabel(state.session) : ""),
  );
  const [category, setCategory] = useState<string>(
    existing?.category ?? (state.mode === "plan" ? state.session.category : "erg"),
  );
  const numStr = (n: number | null | undefined) => (n != null ? String(n) : "");
  const [minutes, setMinutes] = useState<string>(numStr(existing?.minutes ?? est?.minutes));
  const [metres, setMetres] = useState<string>(numStr(existing?.metres ?? est?.metres));
  const [split, setSplit] = useState<string>(existing?.split ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [busy, setBusy] = useState(false);
  const fromPlan = !!est && (est.minutes != null || est.metres != null);

  // C2/RP3 photo scan (erg only) → fills the fields via Claude vision.
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const handleScan = async (file: File | undefined) => {
    if (!file) return;
    setScanning(true);
    setScanMsg(null);
    const { result, error } = await scanErgPhoto(file);
    setScanning(false);
    if (error || !result) {
      setScanMsg(
        error === "unconfigured"
          ? "Photo scanning isn't switched on yet — enter the numbers by hand."
          : "Couldn't read that photo — enter the numbers by hand.",
      );
      return;
    }
    if (result.totalMinutes != null) setMinutes(String(Math.round(result.totalMinutes)));
    if (result.totalMetres != null) setMetres(String(result.totalMetres));
    if (result.splitPer500) setSplit(result.splitPer500);
    // The minutes field is whole-number, so keep the exact time + rate + watts in the note.
    const bits: string[] = [];
    if (result.totalMinutes != null) bits.push(minutesToClock(result.totalMinutes));
    if (result.strokeRate != null) bits.push(`r${result.strokeRate}`);
    if (result.avgWatts != null) bits.push(`${result.avgWatts}W`);
    if (bits.length) setNote((prev) => [bits.join(" · "), prev].filter(Boolean).join(" · "));
    setScanMsg(
      result.confident
        ? "Filled from your photo — check it and save."
        : "Read it, but I wasn't fully sure — please double-check.",
    );
  };

  const inputCls =
    "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-base text-text outline-none focus:border-primary placeholder:text-muted";
  const labelCls = "mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted";

  const valid = state.mode === "plan" || title.trim().length > 0;

  const save = async () => {
    setBusy(true);
    const draft: LogDraft = {
      logDate,
      period: state.mode === "plan" ? state.period : null,
      dayKey: state.mode === "plan" ? state.dayKey : null,
      source: state.mode,
      title: title.trim() || (state.mode === "plan" ? sessionLabel(state.session) : "Extra session"),
      category,
      minutes: minutes.trim() ? Number(minutes) : null,
      metres: metres.trim() ? Number(metres) : null,
      split: split.trim() || null,
      note: note.trim(),
    };
    const res =
      state.mode === "plan"
        ? await savePlanLog(athleteId, draft)
        : existing
          ? await updateLog(athleteId, existing.id, draft)
          : await saveExtraLog(athleteId, draft);
    setBusy(false);
    if (res.error) {
      console.error("save log:", res.error);
      return;
    }
    onSaved();
  };

  const remove = async () => {
    if (!existing) return;
    setBusy(true);
    await deleteLog(athleteId, existing.id);
    setBusy(false);
    onSaved();
  };

  const overlay = (
    <div className="fixed inset-0 z-[60] flex h-dvh flex-col bg-background">
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <button type="button" onClick={onClose} className="flex items-center gap-1 text-[13px] text-muted">
          <IconArrowLeft size={18} /> Back
        </button>
        <div className="ml-1 text-[15px] font-semibold text-text">
          {state.mode === "plan" ? "Log session" : existing ? "Edit session" : "Extra session"}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <div className="mx-auto w-full max-w-screen-sm">
          {state.mode === "plan" ? (
            <div className="rounded-2xl border border-border bg-surface px-3.5 py-3">
              <div className="flex items-center gap-2">
                <Dot color={catMeta[state.session.category]?.color ?? "var(--muted)"} />
                <span className="text-[13px] font-semibold text-text">{sessionLabel(state.session)}</span>
                <span className="ml-auto flex items-center gap-1 text-[11px] text-muted">
                  <IconClock size={12} /> {state.period} · {state.session.time}
                </span>
              </div>
              {state.session.description.trim() && (
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{state.session.description}</p>
              )}
            </div>
          ) : (
            <>
              <div className={labelCls.replace("mt-4", "mt-0")}>What did you do?</div>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Easy shakeout run"
                className={inputCls}
              />
              <div className={labelCls}>Type</div>
              <div className="grid grid-cols-3 gap-1.5">
                {extraCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 ${
                      category === c ? "border-primary bg-primary/10" : "border-border bg-surface"
                    }`}
                  >
                    <Dot color={catMeta[c].color} />
                    <span className="text-[12px] font-semibold text-text">{catMeta[c].label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {category === "erg" && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleScan(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={scanning}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/[0.06] py-3 text-[13px] font-semibold text-primary disabled:opacity-60"
              >
                <IconCamera size={16} /> {scanning ? "Reading photo…" : "Scan C2 / RP3 monitor"}
              </button>
              {scanMsg && <p className="mt-1.5 text-[11px] text-muted">{scanMsg}</p>}
            </>
          )}

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Result</span>
            {fromPlan && (
              <span className="text-[10px] text-accent">Estimated from the plan · edit if needed</span>
            )}
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] text-muted">Minutes</label>
              <input
                value={minutes}
                onChange={(e) => setMinutes(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="—"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted">Metres</label>
              <input
                value={metres}
                onChange={(e) => setMetres(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="—"
                className={inputCls}
              />
            </div>
          </div>
          <div className="mt-2">
            <label className="mb-1 block text-[10px] text-muted">Split /500m (optional)</label>
            <input
              value={split}
              onChange={(e) => setSplit(e.target.value)}
              placeholder="e.g. 1:52"
              className={inputCls}
            />
          </div>

          <div className={labelCls}>Note (optional)</div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything to remember…"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border bg-background px-4 pb-6 pt-3">
        <div className="mx-auto flex max-w-screen-sm gap-2.5">
          {existing && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="rounded-xl border border-border bg-surface px-4 py-3.5 text-[13px] font-medium text-danger disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={busy || !valid}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[14px] font-semibold text-primary-contrast disabled:opacity-40"
          >
            <IconCheck size={16} /> {busy ? "Saving…" : existing ? "Save changes" : "Save log"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(<ThemeProvider tokens={varsityTheme}>{overlay}</ThemeProvider>, document.body);
}

/* ─────────────────────────  list rows  ───────────────────────── */
function PrescribedRow({
  label,
  detail,
  period,
  time,
  color,
  log,
  onLog,
}: {
  label: string;
  detail: string;
  period: string;
  time: string;
  color: string;
  log?: LogEntry;
  onLog: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onLog}
      className={`flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left ${
        log ? "border-success/40 bg-success/[0.06]" : "border-border bg-surface active:bg-surface-2"
      }`}
    >
      <span className="mt-1">
        <Dot color={color} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-text">{label}</span>
          <span className="flex items-center gap-1 text-[10px] text-muted">
            <IconClock size={11} /> {period} · {time}
          </span>
        </div>
        {detail && <div className="mt-0.5 truncate text-[11px] text-muted">{detail}</div>}
        {log && formatMetrics(log.minutes, log.metres, log.split) && (
          <div className="mt-1 text-[12px] font-medium text-text/90">
            {formatMetrics(log.minutes, log.metres, log.split)}
          </div>
        )}
      </div>
      {log ? (
        <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-semibold text-success">
          <IconCheckCircle size={14} /> Logged
        </span>
      ) : (
        <span className="flex-shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-contrast">
          Log
        </span>
      )}
    </button>
  );
}

function ExtraRow({ log, onEdit }: { log: LogEntry; onEdit: () => void }) {
  const meta = catMeta[log.category ?? "other"] ?? catMeta.other;
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-start gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 text-left active:bg-surface-2"
    >
      <span className="mt-1">
        <Dot color={meta.color} />
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[14px] font-semibold text-text">{log.title}</span>
        {formatMetrics(log.minutes, log.metres, log.split) && (
          <div className="mt-0.5 text-[12px] text-text/90">
            {formatMetrics(log.minutes, log.metres, log.split)}
          </div>
        )}
        {log.note && <div className="mt-0.5 truncate text-[11px] text-muted">{log.note}</div>}
      </div>
      <span className="flex-shrink-0 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted">
        {meta.label}
      </span>
    </button>
  );
}

/* ─────────────────────────  day picker  ───────────────────────── */
type DayStat = { prescribed: number; loggedPlan: number; extra: number };

function DayChip({
  date,
  selected,
  isToday,
  stat,
  onPick,
}: {
  date: Date;
  selected: boolean;
  isToday: boolean;
  stat: DayStat;
  onPick: () => void;
}) {
  // amber = prescribed but not all logged · green = all logged · accent = only extra
  let dot = "bg-transparent";
  if (stat.prescribed > 0) dot = stat.loggedPlan >= stat.prescribed ? "bg-success" : "bg-warn";
  else if (stat.extra > 0) dot = "bg-accent";
  return (
    <button
      type="button"
      onClick={onPick}
      className={`flex w-[3.1rem] flex-shrink-0 flex-col items-center gap-1 rounded-xl border py-2 ${
        selected
          ? "border-primary bg-primary/15"
          : isToday
            ? "border-primary/40 bg-surface"
            : "border-border bg-surface"
      }`}
    >
      <span className="text-[9px] font-semibold uppercase tracking-wide text-muted">
        {isToday ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" })}
      </span>
      <span className={`text-[15px] font-semibold leading-none ${selected ? "text-primary" : "text-text"}`}>
        {date.getDate()}
      </span>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
    </button>
  );
}

/* ─────────────────────────  screen  ───────────────────────── */
const DAYS_BACK = 7; // today + the past 6 days

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function LogScreen() {
  const { userId } = useAppState();
  const today = useMemo(() => startOfDay(new Date()), []);
  // The last 7 days, oldest → newest (today on the right).
  const days = useMemo(
    () =>
      Array.from({ length: DAYS_BACK }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (DAYS_BACK - 1 - i));
        return d;
      }),
    [today],
  );
  const rangeFrom = toISO(days[0]);
  const rangeTo = toISO(today);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Date>(today);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const reloadLogs = async () => {
    if (userId) setLogs(await fetchLogsInRange(userId, rangeFrom, rangeTo));
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const [p, rangeLogs] = await Promise.all([
        fetchPlan(),
        userId ? fetchLogsInRange(userId, rangeFrom, rangeTo) : Promise.resolve([]),
      ]);
      if (!active) return;
      setPlan(p);
      setLogs(rangeLogs);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId, rangeFrom, rangeTo]);

  const selectedIso = toISO(selected);
  const isToday = selectedIso === rangeTo;
  const selectedLogs = useMemo(() => logs.filter((l) => l.logDate === selectedIso), [logs, selectedIso]);

  const planLogByKey = useMemo(() => {
    const m: Record<string, LogEntry> = {};
    for (const l of selectedLogs) if (l.source === "plan" && l.dayKey) m[l.dayKey] = l;
    return m;
  }, [selectedLogs]);
  const extraLogs = useMemo(() => selectedLogs.filter((l) => l.source === "extra"), [selectedLogs]);

  const prescribed: { period: Period; dayKey: string; session: Session }[] = useMemo(
    () => (plan ? prescribedForDay(plan, selected) : []),
    [plan, selected],
  );

  // Per-day status for the strip dots.
  const dayStat = useMemo(() => {
    const out: Record<string, DayStat> = {};
    for (const d of days) {
      const iso = toISO(d);
      const dl = logs.filter((l) => l.logDate === iso);
      out[iso] = {
        prescribed: plan ? prescribedForDay(plan, d).length : 0,
        loggedPlan: dl.filter((l) => l.source === "plan").length,
        extra: dl.filter((l) => l.source === "extra").length,
      };
    }
    return out;
  }, [days, plan, logs]);

  const dateLabel = selected.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
        <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">Log a session</div>
        <h1 className="mt-0.5 text-2xl font-semibold text-text">{isToday ? "Today" : dateLabel.split(",")[0]}</h1>
        <p className="mt-0.5 text-[12px] text-muted">{dateLabel}</p>

        {/* day picker — pick today or a recent day to log */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {days.map((d) => {
            const iso = toISO(d);
            return (
              <DayChip
                key={iso}
                date={d}
                selected={iso === selectedIso}
                isToday={iso === rangeTo}
                stat={dayStat[iso] ?? { prescribed: 0, loggedPlan: 0, extra: 0 }}
                onPick={() => setSelected(d)}
              />
            );
          })}
        </div>

        {/* C2 photo — opens an erg log with the photo scanner ready */}
        <button
          type="button"
          onClick={() => setEditor({ mode: "extra" })}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/[0.06] px-4 py-3.5 text-left active:bg-primary/10"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <IconCamera size={20} />
          </span>
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-text">Scan C2 / RP3 monitor</div>
            <div className="text-[11px] text-muted">Snap the screen — splits read automatically</div>
          </div>
          <IconChevronRight size={16} />
        </button>

        {/* prescribed plan for the selected day */}
        <div className="mt-6">
          <SectionLabel hint="from your coach">{isToday ? "Today's plan" : "Plan this day"}</SectionLabel>
          {loading ? (
            <div className="py-6 text-center text-[12px] text-muted">Loading…</div>
          ) : prescribed.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted">
              Nothing prescribed this day. Add any training below.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {prescribed.map((p) => {
                const meta = catMeta[p.session.category] ?? catMeta.other;
                return (
                  <PrescribedRow
                    key={p.dayKey}
                    label={sessionLabel(p.session)}
                    detail={p.session.description.trim()}
                    period={p.period}
                    time={p.session.time}
                    color={meta.color}
                    log={planLogByKey[p.dayKey]}
                    onLog={() =>
                      setEditor({
                        mode: "plan",
                        period: p.period,
                        dayKey: p.dayKey,
                        session: p.session,
                        existing: planLogByKey[p.dayKey],
                      })
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Extra training */}
        <div className="mt-6">
          <SectionLabel>Extra training</SectionLabel>
          {extraLogs.length > 0 && (
            <div className="mb-2 flex flex-col gap-2">
              {extraLogs.map((l) => (
                <ExtraRow key={l.id} log={l} onEdit={() => setEditor({ mode: "extra", existing: l })} />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setEditor({ mode: "extra" })}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface py-3.5 text-[13px] font-medium text-muted active:border-primary/40 active:text-primary"
          >
            <IconPlus size={16} /> Add extra session
          </button>
        </div>
      </div>

      {editor && userId && (
        <LogEditor
          state={editor}
          athleteId={userId}
          logDate={selectedIso}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            await reloadLogs();
            setEditor(null);
          }}
        />
      )}
    </>
  );
}

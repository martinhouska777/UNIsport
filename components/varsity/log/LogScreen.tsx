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
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { varsityTheme } from "@/lib/varsity/theme";
import { useAppState } from "@/components/AppState";
import { fetchPlan } from "@/lib/varsity/planStore";
import { prescribedForToday } from "@/lib/varsity/athleteHome";
import {
  sessionLabel,
  categoryMeta,
  toISO,
  type Session,
  type Period,
} from "@/lib/varsity/coachPlan";
import {
  fetchLogsForDate,
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
const feelings = [1, 2, 3, 4, 5];

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

function FeelingPicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5">
        {feelings.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f)}
            className={`rounded-xl border py-2.5 text-[15px] font-semibold ${
              value === f ? "border-primary bg-primary/15 text-text" : "border-border bg-surface text-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted">
        <span>1 · easy</span>
        <span>5 · maxed out</span>
      </div>
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
  const [title, setTitle] = useState(
    existing?.title ?? (state.mode === "plan" ? sessionLabel(state.session) : ""),
  );
  const [category, setCategory] = useState<string>(
    existing?.category ?? (state.mode === "plan" ? state.session.category : "erg"),
  );
  const [result, setResult] = useState(existing?.result ?? "");
  const [feeling, setFeeling] = useState<number | null>(existing?.feeling ?? null);
  const [note, setNote] = useState(existing?.note ?? "");
  const [busy, setBusy] = useState(false);

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
      result: result.trim(),
      feeling,
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

          <div className={labelCls}>Result</div>
          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={2}
            placeholder="Distance, splits, time… (a photo will fill this in later)"
            className={`${inputCls} resize-none`}
          />

          <div className={labelCls}>How did it feel?</div>
          <FeelingPicker value={feeling} onChange={setFeeling} />

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
        {log?.result && <div className="mt-1 text-[12px] font-medium text-text/90">{log.result}</div>}
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
        {log.result && <div className="mt-0.5 text-[12px] text-text/90">{log.result}</div>}
        {log.note && <div className="mt-0.5 truncate text-[11px] text-muted">{log.note}</div>}
      </div>
      <span className="flex-shrink-0 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted">
        {meta.label}
      </span>
    </button>
  );
}

/* ─────────────────────────  screen  ───────────────────────── */
export default function LogScreen() {
  const { userId } = useAppState();
  const today = useMemo(() => new Date(), []);
  const todayIso = toISO(today);

  const [prescribed, setPrescribed] = useState<
    { period: Period; dayKey: string; session: Session }[] | null
  >(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [showSoon, setShowSoon] = useState(false);

  const loadLogs = async () => {
    if (!userId) return;
    setLogs(await fetchLogsForDate(userId, todayIso));
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const [plan, dayLogs] = await Promise.all([
        fetchPlan(),
        userId ? fetchLogsForDate(userId, todayIso) : Promise.resolve([]),
      ]);
      if (!active) return;
      setPrescribed(prescribedForToday(plan, today));
      setLogs(dayLogs);
    })();
    return () => {
      active = false;
    };
  }, [userId, todayIso, today]);

  const planLogByKey = useMemo(() => {
    const m: Record<string, LogEntry> = {};
    for (const l of logs) if (l.source === "plan" && l.dayKey) m[l.dayKey] = l;
    return m;
  }, [logs]);
  const extraLogs = useMemo(() => logs.filter((l) => l.source === "extra"), [logs]);

  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
        <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">Log a session</div>
        <h1 className="mt-0.5 text-2xl font-semibold text-text">Today</h1>
        <p className="mt-0.5 text-[12px] text-muted">{dateLabel}</p>

        {/* C2 photo — placeholder for the auto-read coming later */}
        <button
          type="button"
          onClick={() => setShowSoon((s) => !s)}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/[0.06] px-4 py-3.5 text-left active:bg-primary/10"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <IconCamera size={20} />
          </span>
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-text">Scan C2 / RP3 monitor</div>
            <div className="text-[11px] text-muted">Snap the screen — splits read automatically</div>
          </div>
          <span className="flex-shrink-0 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-accent">
            Soon
          </span>
        </button>
        {showSoon && (
          <p className="mt-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[11px] leading-relaxed text-muted">
            Photo auto-reading is coming soon. For now, tap a session below and type the result by hand.
          </p>
        )}

        {/* Today's plan */}
        <div className="mt-6">
          <SectionLabel hint="from your coach">Today&apos;s plan</SectionLabel>
          {prescribed === null ? (
            <div className="py-6 text-center text-[12px] text-muted">Loading…</div>
          ) : prescribed.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted">
              Nothing prescribed today. Add any training below.
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
          logDate={todayIso}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            await loadLogs();
            setEditor(null);
          }}
        />
      )}
    </>
  );
}

"use client";

/*
  Coach TRAINING PLAN BUILDER (interactive, built from scratch).
  A small screen state-machine:
    blocks → create → block (weeks overview) → week (days) → [session editor sheet]

  Create a block (name + dates, usually before a race) → it shows the weeks → tap a
  week to see its 7 days → tap a day's AM/PM to open the editor → pick a category
  (Water/Erg/Weights/Off/Flex), an intensity for Water/Erg (UT2/UT1/Hard), fill the
  description (free text, or tap one of 5 suggestions) and an optional note. No
  duration, no location; the time is a preset. Plan lives in local state (saves to
  the DB later). Colors are theme tokens; workout colors are content colors from
  lib/varsity/coachPlan.ts (rule-1 exception), applied via inline style.
*/
import { useEffect, useMemo, useState } from "react";
import Button, { buttonClass } from "@/components/ui/Button";
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import {
  categories,
  categoryMeta,
  intensities,
  intensityMeta,
  periods,
  presetTime,
  suggestionsFor,
  optionsLabel,
  sessionKey,
  sessionColor,
  sessionLabel,
  boardOptions,
  defaultBoard,
  canBeTeamWorkout,
  buildWeeks,
  blockRangeLabel,
  daysToRace,
  toISO,
  addDays,
  type Block,
  type Session,
  type SessionMap,
  type Category,
  type Intensity,
  type Period,
  type WeekRow,
  type BoardKind,
} from "@/lib/varsity/coachPlan";
import { fetchPlan, savePlan } from "@/lib/varsity/planStore";
import {
  IconPlus,
  IconArrowLeft,
  IconChevronRight,
  IconFlag,
  IconClipboard,
  IconCheck,
  IconCalendar,
  IconRepeat,
  IconSend,
  IconTrash,
  IconTrophy,
} from "@/components/icons";

type View =
  | { name: "blocks" }
  | { name: "create" }
  | { name: "block"; blockId: string }
  | { name: "week"; blockId: string; weekIdx: number };

type Form = {
  category?: Category;
  intensity?: Intensity;
  description: string;
  time: string;
  note: string;
  repeat: "once" | "weekly";
  teamWorkout: boolean;
  board: BoardKind;
};

function Dot({ color }: { color: string }) {
  return <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />;
}


function DraftBadge() {
  return (
    <span className="rounded border border-warn-line bg-warn-tint px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-warn">
      Draft
    </span>
  );
}

function PublishedBadge() {
  return (
    <span className="rounded border border-success-line bg-success-tint px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-success">
      Published
    </span>
  );
}

export default function TrainingPlanScreen() {
  const vTheme = useVarsityTheme();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [sessions, setSessions] = useState<SessionMap>({});
  const [view, setView] = useState<View>({ name: "blocks" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load the shared plan from the database (or localStorage fallback) on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      const plan = await fetchPlan();
      if (!active) return;
      setBlocks(plan.blocks);
      setSessions(plan.sessions);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist the whole plan (manual Save button, accessible while building).
  // Returns false if the save failed so callers (e.g. Publish) can react.
  const persist = async (next?: { blocks?: Block[]; sessions?: SessionMap }) => {
    setSaving(true);
    const { error } = await savePlan({
      blocks: next?.blocks ?? blocks,
      sessions: next?.sessions ?? sessions,
    });
    setSaving(false);
    if (error) {
      console.error("savePlan:", error);
      return false;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
    return true;
  };

  const saveButton = (
    <button
      type="button"
      onClick={() => persist()}
      disabled={saving}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50 ${
        saved ? "border-success-line bg-success-tint text-success" : "border-primary-line text-primary"
      }`}
    >
      <IconCheck size={14} /> {saving ? "Saving…" : saved ? "Saved" : "Save"}
    </button>
  );

  // Publish a draft block: flip it to published, then persist so athletes see it.
  const publishBlock = async (blockId: string) => {
    const next = blocks.map((b) =>
      b.id === blockId ? { ...b, status: "published" as const } : b,
    );
    setBlocks(next);
    await persist({ blocks: next });
  };

  // Move a published block back to draft (hides it from athletes again).
  const unpublishBlock = async (blockId: string) => {
    const next = blocks.map((b) =>
      b.id === blockId ? { ...b, status: "draft" as const } : b,
    );
    setBlocks(next);
    await persist({ blocks: next });
  };

  // delete / reset confirmation
  const [confirm, setConfirm] = useState<
    | { kind: "block"; blockId: string }
    | { kind: "week"; blockId: string; weekIdx: number }
    | null
  >(null);

  // Every session-slot key inside a block's date range.
  const blockKeys = (b: Block) => {
    const keys = new Set<string>();
    for (const w of buildWeeks(b)) for (const d of w.days) for (const p of periods) keys.add(sessionKey(d.date, p));
    return keys;
  };

  // Delete a block + its sessions (keeping any slot another block still covers).
  const deleteBlock = async (blockId: string) => {
    const b = blocks.find((x) => x.id === blockId);
    if (!b) return;
    const nextBlocks = blocks.filter((x) => x.id !== blockId);
    const otherKeys = new Set<string>();
    for (const ob of nextBlocks) for (const k of blockKeys(ob)) otherKeys.add(k);
    const nextSessions = { ...sessions };
    for (const k of blockKeys(b)) if (!otherKeys.has(k)) delete nextSessions[k];
    setBlocks(nextBlocks);
    setSessions(nextSessions);
    setConfirm(null);
    setView({ name: "blocks" });
    await persist({ blocks: nextBlocks, sessions: nextSessions });
  };

  // Clear every session in one week (block + other weeks stay intact).
  const resetWeek = async (blockId: string, weekIdx: number) => {
    const b = blocks.find((x) => x.id === blockId);
    if (!b) return;
    const w = buildWeeks(b)[weekIdx];
    if (!w) return;
    const nextSessions = { ...sessions };
    for (const d of w.days) for (const p of periods) delete nextSessions[sessionKey(d.date, p)];
    setSessions(nextSessions);
    setConfirm(null);
    await persist({ sessions: nextSessions });
  };

  // editor sheet
  const [editor, setEditor] = useState<{ date: Date; period: Period } | null>(null);
  const [form, setForm] = useState<Form>({
    description: "",
    time: "",
    note: "",
    repeat: "once",
    teamWorkout: false,
    board: "average",
  });

  // create-block form
  const todayISO = toISO(new Date());
  const [draft, setDraft] = useState({
    name: "",
    start: todayISO,
    end: addDays(todayISO, 48),
    raceName: "",
    raceDate: "",
  });

  const block = "blockId" in view ? blocks.find((b) => b.id === view.blockId) : undefined;
  const weeks: WeekRow[] = useMemo(() => (block ? buildWeeks(block) : []), [block]);

  const weekSessionCount = (w: WeekRow) =>
    w.days.reduce((n, d) => n + periods.filter((p) => sessions[sessionKey(d.date, p)]).length, 0);

  /* ── create a block ── */
  const createBlock = () => {
    if (!draft.name.trim() || !draft.start || !draft.end || draft.end < draft.start) return;
    const b: Block = {
      id: `blk-${Date.now()}`,
      name: draft.name.trim(),
      start: draft.start,
      end: draft.end,
      status: "draft",
      raceName: draft.raceName.trim() || undefined,
      raceDate: draft.raceDate || undefined,
    };
    setBlocks((bs) => [b, ...bs]);
    setView({ name: "block", blockId: b.id });
  };

  /* ── session editor ── */
  const openEditor = (date: Date, period: Period) => {
    const existing = sessions[sessionKey(date, period)];
    setForm({
      category: existing?.category,
      intensity: existing?.intensity,
      description: existing?.description ?? "",
      time: existing?.time ?? presetTime[period],
      note: existing?.note ?? "",
      repeat: "once",
      teamWorkout: existing?.teamWorkout ?? false,
      board: existing?.board ?? defaultBoard(existing?.intensity),
    });
    setEditor({ date, period });
  };

  const editorValid =
    !!form.category && (!categoryMeta[form.category].hasIntensity || !!form.intensity);

  const saveSession = () => {
    if (!editor || !form.category || !editorValid) return;
    const s: Session = {
      category: form.category,
      intensity: categoryMeta[form.category].hasIntensity ? form.intensity : undefined,
      description: form.description.trim(),
      time: form.time.trim() || presetTime[editor.period],
      note: form.note.trim() || undefined,
      // Only erg sessions can carry a board (see canBeTeamWorkout), so a
      // session that isn't one never keeps a stale flag.
      teamWorkout: canBeTeamWorkout(form.category) ? form.teamWorkout : false,
      board: form.board,
    };
    if (form.repeat === "weekly") {
      // apply to the same weekday + period across every week in the block
      const weekday = editor.date.getDay();
      setSessions((prev) => {
        const next = { ...prev };
        for (const w of weeks) {
          for (const d of w.days) {
            if (d.date.getDay() === weekday) next[sessionKey(d.date, editor.period)] = s;
          }
        }
        return next;
      });
    } else {
      setSessions((prev) => ({ ...prev, [sessionKey(editor.date, editor.period)]: s }));
    }
    setEditor(null);
  };

  const clearSession = () => {
    if (!editor) return;
    setSessions((prev) => {
      const next = { ...prev };
      delete next[sessionKey(editor.date, editor.period)];
      return next;
    });
    setEditor(null);
  };

  // Shared delete/reset confirmation (portalled so it sits above everything).
  const confirmModal =
    confirm && typeof document !== "undefined"
      ? createPortal(
          <ThemeProvider tokens={vTheme.dark} light={vTheme.light}>
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-6"
              onClick={() => setConfirm(null)}
            >
              <div
                className="w-full max-w-xs rounded-2xl border border-border bg-surface p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-tint text-danger">
                  <IconTrash size={18} />
                </div>
                <h2 className="mt-3 text-[16px] font-semibold text-text">
                  {confirm.kind === "block" ? "Delete this block?" : "Clear this week?"}
                </h2>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">
                  {confirm.kind === "block"
                    ? "This removes the block and all of its sessions. It can't be undone."
                    : "This removes every AM/PM session in this week. The block stays."}
                </p>
                <div className="mt-4 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    className="flex-1 rounded-xl border border-border bg-surface py-3 text-[13px] font-medium text-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      confirm.kind === "block"
                        ? deleteBlock(confirm.blockId)
                        : resetWeek(confirm.blockId, confirm.weekIdx)
                    }
                    className="flex-1 rounded-xl border border-danger-line bg-danger-tint py-3 text-[13px] font-semibold text-danger disabled:opacity-50"
                  >
                    {confirm.kind === "block" ? "Delete" : "Clear week"}
                  </button>
                </div>
              </div>
            </div>
          </ThemeProvider>,
          document.body,
        )
      : null;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pt-10 text-center text-[13px] text-muted">
        Loading plan…
      </div>
    );
  }

  /* ─────────────  view: blocks list  ───────────── */
  if (view.name === "blocks") {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
        {/* data-tour: the console tour lights this pair (lib/varsity/coachTour.ts). */}
        <div data-tour="coach-plan-header">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Training Plan</div>
          <h1 className="mt-0.5 text-2xl font-semibold text-text">Blocks</h1>
          <p className="mt-1 text-[12px] text-muted">A block is a stretch of training, usually up to a race.</p>
        </div>

        {blocks.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-tint text-primary">
              <IconCalendar size={22} />
            </div>
            <div className="text-[14px] font-semibold text-text">No training blocks yet</div>
            <p className="mx-auto mt-1 max-w-[16rem] text-[12px] text-muted">
              Create your first block to start planning the weeks ahead.
            </p>
            {/* data-tour: whichever of the two "new block" buttons is on
                screen is the one the tour lights — see visibleAnchor(). */}
            <Button size="md" onClick={() => setView({ name: "create" })} className="mt-5" data-tour="coach-plan-new-block">
              <IconPlus size={16} /> New training block
            </Button>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-2.5">
            {blocks.map((b, bi) => (
              <div
                key={b.id}
                className="flex items-stretch overflow-hidden rounded-2xl border border-border bg-surface"
              >
                {/* data-tour: the console tour opens the FIRST block to walk the
                    draft → week → workout path (lib/varsity/coachTour.ts). */}
                <button
                  type="button"
                  data-tour={bi === 0 ? "coach-plan-first-block" : undefined}
                  onClick={() => setView({ name: "block", blockId: b.id })}
                  className="flex flex-1 items-center gap-3 px-4 py-3.5 text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-text">{b.name}</span>
                      {b.status === "draft" ? <DraftBadge /> : <PublishedBadge />}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">{blockRangeLabel(b)}</div>
                    {b.raceName && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-accent">
                        <IconFlag size={11} /> {b.raceName}
                      </div>
                    )}
                  </div>
                  <IconChevronRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm({ kind: "block", blockId: b.id })}
                  aria-label={`Delete ${b.name}`}
                  className="flex items-center border-l border-border px-3.5 text-muted active:bg-danger-tint active:text-danger"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setView({ name: "create" })}
              data-tour="coach-plan-new-block"
              className="mt-1 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface py-3.5 text-[13px] font-medium text-muted active:border-primary-line active:text-primary"
            >
              <IconPlus size={16} /> New training block
            </button>
          </div>
        )}
        {confirmModal}
      </div>
    );
  }

  /* ─────────────  view: create block  ───────────── */
  if (view.name === "create") {
    const valid = draft.name.trim() && draft.start && draft.end && draft.end >= draft.start;
    const inputCls =
      "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-base text-text outline-none focus:border-primary placeholder:text-muted";
    const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted";
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
        <button onClick={() => setView({ name: "blocks" })} className="flex items-center gap-1 text-[13px] text-muted">
          <IconArrowLeft size={16} /> Blocks
        </button>
        <h1 className="mt-1 text-2xl font-semibold text-text">New training block</h1>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className={labelCls}>Block name</label>
            <input
              className={inputCls}
              placeholder="e.g. Spring 2026 — to Sprints"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>From</label>
              <input type="date" className={inputCls} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
            </div>
            <div className="flex-1">
              <label className={labelCls}>To</label>
              <input type="date" className={inputCls} value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-3.5">
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold text-accent">
              <IconFlag size={13} /> Goal race <span className="font-normal text-muted">(optional)</span>
            </div>
            <div className="flex flex-col gap-3">
              <input
                className={inputCls}
                placeholder="Race name — e.g. Eastern Sprints"
                value={draft.raceName}
                onChange={(e) => setDraft({ ...draft, raceName: e.target.value })}
              />
              <div>
                <label className={labelCls}>Race date</label>
                <input type="date" className={inputCls} value={draft.raceDate} onChange={(e) => setDraft({ ...draft, raceDate: e.target.value })} />
              </div>
            </div>
          </div>

          <Button size="lg" full disabled={!valid} onClick={createBlock} className="mt-1">
            Create block
          </Button>
        </div>
      </div>
    );
  }

  /* ─────────────  view: block overview (weeks)  ───────────── */
  if (view.name === "block" && block) {
    const race = daysToRace(block);
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
        <div className="sticky top-0 z-20 -mx-4 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur">
          <button onClick={() => setView({ name: "blocks" })} className="flex items-center gap-1 text-[13px] text-muted">
            <IconArrowLeft size={16} /> Blocks
          </button>
          {saveButton}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-text">{block.name}</h1>
          {block.status === "draft" && <DraftBadge />}
        </div>
        <div className="mt-1 text-[11px] text-muted">{blockRangeLabel(block)}</div>

        {block.raceName && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary-line bg-gradient-to-r from-primary/20 to-accent/10 px-3.5 py-2.5">
            <span className="text-primary">
              <IconFlag size={18} />
            </span>
            <div className="flex-1 text-[12px] font-medium text-text">{block.raceName}</div>
            {race !== null && (
              <div className="text-right">
                <div className="text-xl font-semibold leading-none text-accent">{race}</div>
                <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">days</div>
              </div>
            )}
          </div>
        )}

        {/* publish status — controls whether athletes can see this block */}
        <div
          data-tour="coach-plan-status"
          className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3"
        >
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-text">
              <span
                className={`h-2 w-2 rounded-full ${
                  block.status === "published" ? "bg-success" : "bg-warn"
                }`}
              />
              {block.status === "published" ? "Published" : "Draft"}
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              {block.status === "published"
                ? "Athletes can see this week on their Home."
                : "Only you can see this — publish to share it with the team."}
            </div>
          </div>
          {block.status === "published" ? (
            <button
              type="button"
              onClick={() => unpublishBlock(block.id)}
              disabled={saving}
              className="rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-muted disabled:opacity-50"
            >
              Unpublish
            </button>
          ) : (
            <Button size="sm" onClick={() => publishBlock(block.id)} disabled={saving}>
              <IconSend size={13} /> Publish to team
            </Button>
          )}
        </div>

        <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Weeks</div>
        <div className="mt-2.5 flex flex-col gap-2">
          {weeks.map((w, i) => {
            const count = weekSessionCount(w);
            return (
              <button
                key={w.index}
                type="button"
                data-tour={i === 0 ? "coach-plan-first-week" : undefined}
                onClick={() => setView({ name: "week", blockId: block.id, weekIdx: i })}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left"
              >
                <div className="flex h-9 w-9 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-surface-2">
                  <span className="text-[7px] font-semibold uppercase tracking-[0.1em] text-muted">Wk</span>
                  <span className="text-[13px] font-semibold leading-none text-text">{w.index}</span>
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-text">{w.rangeLabel}</div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    {count > 0 ? `${count} session${count > 1 ? "s" : ""} set` : "Empty"}
                  </div>
                </div>
                <IconChevronRight size={16} />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setConfirm({ kind: "block", blockId: block.id })}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-danger-line bg-danger-tint py-3 text-[13px] font-semibold text-danger"
        >
          <IconTrash size={15} /> Delete block
        </button>
        {confirmModal}
      </div>
    );
  }

  /* ─────────────  view: week (days)  ───────────── */
  if (view.name === "week" && block) {
    const week = weeks[view.weekIdx];
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
        <div className="sticky top-0 z-20 -mx-4 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur">
          <button
            onClick={() => setView({ name: "block", blockId: block.id })}
            className="flex items-center gap-1 text-[13px] text-muted"
          >
            <IconArrowLeft size={16} /> {block.name}
          </button>
          {saveButton}
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-text">Week {week.index}</h1>
        <div className="mt-0.5 text-[11px] text-muted">{week.rangeLabel}</div>

        {/* week jump chips */}
        <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {weeks.map((w, i) => (
            <button
              key={w.index}
              type="button"
              onClick={() => setView({ name: "week", blockId: block.id, weekIdx: i })}
              className={`flex-shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium ${
                i === view.weekIdx ? "border-text bg-text text-background" : "border-border bg-surface text-muted"
              }`}
            >
              Week {w.index}
            </button>
          ))}
        </div>

        {/* day cards */}
        {/* data-tour: the tour lights the FIRST day card — seven of them are
            taller than the screen, and a ring that size lights nothing. */}
        <div className="mt-3 flex flex-col gap-2">
          {week.days.map((d, di) => (
            <div
              key={d.date.toISOString()}
              data-tour={di === 0 ? "coach-plan-first-day" : undefined}
              className={`overflow-hidden rounded-xl border bg-surface ${d.today ? "border-primary/50" : "border-border"}`}
            >
              <div className={`flex items-center justify-between px-3 py-2 ${d.today ? "bg-primary-tint" : "bg-surface-2"}`}>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {d.weekday} {d.month}
                </span>
                <span className={`text-sm font-semibold ${d.today ? "text-primary" : "text-text"}`}>{d.dayNum}</span>
              </div>
              <div className="flex flex-col gap-1.5 p-2">
                {periods.map((p, pi) => {
                  const s = sessions[sessionKey(d.date, p)];
                  // The tour presses this to open the workout editor. Named on
                  // BOTH shapes, because the first slot may be empty or filled.
                  const tour = di === 0 && pi === 0 ? "coach-plan-first-slot" : undefined;
                  if (!s) {
                    return (
                      <button
                        key={p}
                        type="button"
                        data-tour={tour}
                        onClick={() => openEditor(d.date, p)}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-border px-2.5 py-2 text-muted active:border-primary-line active:text-primary"
                      >
                        <span className="text-[8px] font-bold tracking-[0.12em]">{p}</span>
                        <span className="flex items-center gap-1 text-[11px] italic">
                          <IconPlus size={12} /> add session
                        </span>
                      </button>
                    );
                  }
                  return (
                    <button
                      key={p}
                      type="button"
                      data-tour={tour}
                      onClick={() => openEditor(d.date, p)}
                      className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-2.5 pr-2.5 text-left"
                      style={{ borderLeft: `3px solid ${sessionColor(s)}` }}
                    >
                      <div className="mb-0.5 flex items-center justify-between">
                        <span className="text-[8px] font-bold tracking-[0.12em] text-muted">{p}</span>
                        <span
                          className="rounded px-1.5 py-px text-[8px] font-bold tracking-[0.05em]"
                          style={{ background: `${sessionColor(s)}22`, color: sessionColor(s) }}
                        >
                          {sessionLabel(s)}
                        </span>
                      </div>
                      <div className="text-[11px] font-medium leading-snug text-text">
                        {s.description || sessionLabel(s)}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                        <span>{s.time}</span>
                        {s.note && (
                          <span className="flex items-center gap-1">
                            <IconClipboard size={9} /> note
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setConfirm({ kind: "week", blockId: block.id, weekIdx: view.weekIdx })}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-danger-line bg-danger-tint py-3 text-[13px] font-semibold text-danger"
        >
          <IconTrash size={15} /> Clear this week
        </button>

        {editor && renderEditor()}
        {confirmModal}
      </div>
    );
  }

  return null;

  /* ─────────────  session editor — FULL SCREEN (inlined, not a child component,
     so the description/note inputs keep focus while typing)  ───────────── */
  function renderEditor() {
    // editor only opens on a click (client) — never during SSR, so document exists
    if (!editor || typeof document === "undefined") return null;
    const cat = form.category;
    const sugg = cat ? suggestionsFor(cat, form.intensity) : [];
    const weekday = editor.date.toLocaleDateString("en-US", { weekday: "long" });
    const longDate = editor.date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const existing = !!sessions[sessionKey(editor.date, editor.period)];
    const inputCls =
      "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-base text-text outline-none focus:border-primary placeholder:text-muted";
    const labelCls = "mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted";
    const overlay = (
      <div className="fixed inset-0 z-[60] flex h-dvh flex-col bg-background">
        {/* header with back */}
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          {/* data-tour: the tour presses this to leave the editor again —
              and closeOnExit presses it if the walk is abandoned inside. */}
          <button
            type="button"
            data-tour="coach-plan-editor-back"
            onClick={() => setEditor(null)}
            className="flex items-center gap-1 text-[13px] text-muted"
          >
            <IconArrowLeft size={18} /> Back
          </button>
          <div className="ml-1">
            <div className="text-[15px] font-semibold leading-none text-text">
              {weekday} {editor.period}
            </div>
            <div className="mt-1 text-[11px] text-muted">{longDate}</div>
          </div>
        </div>

        {/* scrollable content */}
        <div className="mx-auto w-full max-w-screen-sm flex-1 overflow-y-auto px-5 pb-6 pt-4">
          {/* category */}
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Type</div>
          {/* data-tour: every field below this one only exists once a type is
              chosen, so the tour presses "erg" — the one type that shows the
              whole form — and the rest of the walk has something to point at. */}
          <div data-tour="coach-plan-type" className="grid grid-cols-5 gap-1.5">
            {categories.map((c) => {
              const active = cat === c;
              return (
                <button
                  key={c}
                  type="button"
                  data-tour={`coach-plan-cat-${c}`}
                  onClick={() => setForm((f) => ({ ...f, category: c, intensity: undefined, description: "" }))}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 ${
                    active ? "border-primary bg-primary-tint" : "border-border bg-surface"
                  }`}
                >
                  <Dot color={categoryMeta[c].color} />
                  <span className="text-[11px] font-semibold text-text">{categoryMeta[c].label}</span>
                </button>
              );
            })}
          </div>

          {/* intensity (water/erg) */}
          {cat && categoryMeta[cat].hasIntensity && (
            <>
              <div className={labelCls}>Intensity</div>
              <div data-tour="coach-plan-intensity" className="grid grid-cols-3 gap-1.5">
                {intensities.map((it) => {
                  const active = form.intensity === it;
                  return (
                    <button
                      key={it}
                      type="button"
                      data-tour={`coach-plan-int-${it}`}
                      onClick={() => setForm((f) => ({ ...f, intensity: it }))}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 ${
                        active ? "border-primary bg-primary-tint" : "border-border bg-surface"
                      }`}
                    >
                      <Dot color={intensityMeta[it].color} />
                      <span className="text-[12px] font-semibold text-text">{intensityMeta[it].label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* quick options (Most used / flex length) */}
          {cat && sugg.length > 0 && (
            <>
              <div className={labelCls}>{optionsLabel(cat)}</div>
              {/* data-tour: the tour taps the FIRST chip, so the description
                  fills in front of you (and Confirm stops being greyed out). */}
              <div data-tour="coach-plan-options" className="flex flex-wrap gap-1.5">
                {sugg.map((text, si) => {
                  const active = form.description === text;
                  return (
                    <button
                      key={text}
                      type="button"
                      data-tour={si === 0 ? "coach-plan-opt-first" : undefined}
                      onClick={() => setForm((f) => ({ ...f, description: text }))}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] text-text ${
                        active ? "border-primary bg-primary-tint" : "border-border bg-surface"
                      }`}
                    >
                      {text}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* description (not for Off) */}
          {cat && cat !== "off" && (
            <>
              <div className={labelCls}>Description</div>
              <textarea
                data-tour="coach-plan-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Type the workout…"
                className={`${inputCls} resize-none`}
              />
            </>
          )}

          {/* time — preset but editable (not for Off) */}
          {cat && cat !== "off" && (
            <>
              <div className={labelCls}>Time</div>
              <input
                data-tour="coach-plan-time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                placeholder={presetTime[editor.period]}
                className={inputCls}
              />
            </>
          )}

          {/* note */}
          <div className={labelCls}>Note (optional)</div>
          <input
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="A note for the athletes…"
            className={inputCls}
          />

          {/* team workout — the switch that gives this session a shared board */}
          {canBeTeamWorkout(cat) && (
            <>
              <div className={labelCls}>Team workout</div>
              <button
                type="button"
                data-tour="coach-plan-team"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    teamWorkout: !f.teamWorkout,
                    // First time on, suggest the board that fits the intensity.
                    board: f.teamWorkout ? f.board : defaultBoard(f.intensity),
                  }))
                }
                className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left ${
                  form.teamWorkout ? "border-primary bg-primary-tint" : "border-border bg-surface"
                }`}
              >
                <span className={form.teamWorkout ? "text-primary" : "text-muted"}>
                  <IconTrophy size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold text-text">
                    Share results with the squad
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                    Everyone who logs this session lands on one board the whole team can see.
                  </span>
                </span>
                <span
                  className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
                    form.teamWorkout ? "bg-primary" : "bg-surface-2 border border-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all ${
                      form.teamWorkout ? "left-[1.15rem]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>

              {form.teamWorkout && (
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {boardOptions.map((o) => {
                    const active = form.board === o.key;
                    return (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, board: o.key }))}
                        className={`rounded-xl border px-3 py-2.5 text-left ${
                          active ? "border-primary bg-primary-tint" : "border-border bg-surface"
                        }`}
                      >
                        <span className="block text-[12px] font-semibold text-text">{o.label}</span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                          {o.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* repeat weekly — lots of sessions recur (e.g. every Tue/Thu) */}
          {cat && (
            <>
              <div className={labelCls}>Repeat</div>
              <div data-tour="coach-plan-repeat" className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ["once", "Just this day"],
                    ["weekly", "Every week"],
                  ] as const
                ).map(([key, label]) => {
                  const active = form.repeat === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, repeat: key }))}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[12px] font-semibold ${
                        active ? "border-primary bg-primary-tint text-text" : "border-border bg-surface text-muted"
                      }`}
                    >
                      {key === "weekly" && <IconRepeat size={14} />}
                      {label}
                    </button>
                  );
                })}
              </div>
              {form.repeat === "weekly" && (
                <p className="mt-1.5 text-[11px] text-muted">
                  Adds this to every {editor.date.toLocaleDateString("en-US", { weekday: "long" })} {editor.period}{" "}
                  in the block.
                </p>
              )}
            </>
          )}
        </div>

        {/* footer with confirm */}
        <div className="flex-shrink-0 border-t border-border bg-background px-4 pb-6 pt-3">
          <div className="mx-auto flex max-w-screen-sm gap-2.5">
            {existing && (
              <button
                type="button"
                onClick={clearSession}
                className={buttonClass({ variant: "secondary", size: "lg" })}
              >
                Remove
              </button>
            )}
            <Button
              size="lg"
              disabled={!editorValid}
              onClick={saveSession}
              data-tour="coach-plan-confirm"
              className="flex-1"
            >
              <IconCheck size={16} /> Confirm session
            </Button>
          </div>
        </div>
      </div>
    );
    // Portal to <body> with the varsity theme, so the full-screen editor sits
    // above the coach top bar + nav (escaping main's stacking context) and its
    // colors still resolve.
    return createPortal(
      <ThemeProvider tokens={vTheme.dark} light={vTheme.light}>
        {overlay}
      </ThemeProvider>,
      document.body,
    );
  }
}

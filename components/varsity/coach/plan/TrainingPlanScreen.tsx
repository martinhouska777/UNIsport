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
import { useMemo, useState } from "react";
import {
  categories,
  categoryMeta,
  intensities,
  intensityMeta,
  periods,
  presetTime,
  suggestionsFor,
  sessionKey,
  sessionColor,
  sessionLabel,
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
} from "@/lib/varsity/coachPlan";
import {
  IconPlus,
  IconArrowLeft,
  IconChevronRight,
  IconFlag,
  IconClipboard,
  IconCheck,
  IconCalendar,
} from "@/components/icons";

type View =
  | { name: "blocks" }
  | { name: "create" }
  | { name: "block"; blockId: string }
  | { name: "week"; blockId: string; weekIdx: number };

type Form = { category?: Category; intensity?: Intensity; description: string; note: string };

function Dot({ color }: { color: string }) {
  return <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />;
}

export default function TrainingPlanScreen() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [sessions, setSessions] = useState<SessionMap>({});
  const [view, setView] = useState<View>({ name: "blocks" });

  // editor sheet
  const [editor, setEditor] = useState<{ date: Date; period: Period } | null>(null);
  const [form, setForm] = useState<Form>({ description: "", note: "" });

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
      note: existing?.note ?? "",
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
      note: form.note.trim() || undefined,
    };
    setSessions((prev) => ({ ...prev, [sessionKey(editor.date, editor.period)]: s }));
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

  /* ─────────────  view: blocks list  ───────────── */
  if (view.name === "blocks") {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
        <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">Training Plan</div>
        <h1 className="mt-0.5 text-2xl font-semibold text-text">Blocks</h1>
        <p className="mt-1 text-[12px] text-muted">A block is a stretch of training, usually up to a race.</p>

        {blocks.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <IconCalendar size={22} />
            </div>
            <div className="text-[14px] font-semibold text-text">No training blocks yet</div>
            <p className="mx-auto mt-1 max-w-[16rem] text-[12px] text-muted">
              Create your first block to start planning the weeks ahead.
            </p>
            <button
              type="button"
              onClick={() => setView({ name: "create" })}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-[13px] font-semibold text-primary-contrast"
            >
              <IconPlus size={16} /> New training block
            </button>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-2.5">
            {blocks.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setView({ name: "block", blockId: b.id })}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left"
              >
                <div className="flex-1">
                  <div className="text-[15px] font-semibold text-text">{b.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted">{blockRangeLabel(b)}</div>
                  {b.raceName && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-accent">
                      <IconFlag size={11} /> {b.raceName}
                    </div>
                  )}
                </div>
                <IconChevronRight size={16} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setView({ name: "create" })}
              className="mt-1 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface py-3.5 text-[13px] font-medium text-muted active:border-primary/40 active:text-primary"
            >
              <IconPlus size={16} /> New training block
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ─────────────  view: create block  ───────────── */
  if (view.name === "create") {
    const valid = draft.name.trim() && draft.start && draft.end && draft.end >= draft.start;
    const inputCls =
      "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-base text-text outline-none focus:border-primary placeholder:text-muted";
    const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted";
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

          <button
            type="button"
            disabled={!valid}
            onClick={createBlock}
            className="mt-1 rounded-xl bg-primary py-3.5 text-[14px] font-semibold text-primary-contrast disabled:opacity-40"
          >
            Create block
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────  view: block overview (weeks)  ───────────── */
  if (view.name === "block" && block) {
    const race = daysToRace(block);
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
        <button onClick={() => setView({ name: "blocks" })} className="flex items-center gap-1 text-[13px] text-muted">
          <IconArrowLeft size={16} /> Blocks
        </button>
        <h1 className="mt-1 text-2xl font-semibold text-text">{block.name}</h1>
        <div className="mt-1 text-[11px] text-muted">{blockRangeLabel(block)}</div>

        {block.raceName && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/35 bg-gradient-to-r from-primary/20 to-accent/10 px-3.5 py-2.5">
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

        <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Weeks</div>
        <div className="mt-2.5 flex flex-col gap-2">
          {weeks.map((w, i) => {
            const count = weekSessionCount(w);
            return (
              <button
                key={w.index}
                type="button"
                onClick={() => setView({ name: "week", blockId: block.id, weekIdx: i })}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left"
              >
                <div className="flex h-9 w-9 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-surface-2">
                  <span className="text-[7px] font-semibold uppercase tracking-[0.1em] text-muted">Wk</span>
                  <span className="text-[13px] font-semibold leading-none text-text">{w.index}</span>
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-text">{w.rangeLabel}</div>
                  <div className="mt-0.5 text-[10px] text-muted">
                    {count > 0 ? `${count} session${count > 1 ? "s" : ""} set` : "Empty"}
                  </div>
                </div>
                <IconChevronRight size={16} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ─────────────  view: week (days)  ───────────── */
  if (view.name === "week" && block) {
    const week = weeks[view.weekIdx];
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
        <button
          onClick={() => setView({ name: "block", blockId: block.id })}
          className="flex items-center gap-1 text-[13px] text-muted"
        >
          <IconArrowLeft size={16} /> {block.name}
        </button>
        <h1 className="mt-1 text-2xl font-semibold text-text">Week {week.index}</h1>
        <div className="mt-0.5 text-[11px] text-muted">{week.rangeLabel}</div>

        {/* week jump chips */}
        <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {weeks.map((w, i) => (
            <button
              key={w.index}
              type="button"
              onClick={() => setView({ name: "week", blockId: block.id, weekIdx: i })}
              className={`flex-shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium ${
                i === view.weekIdx ? "border-primary bg-primary text-primary-contrast" : "border-border bg-surface text-muted"
              }`}
            >
              Week {w.index}
            </button>
          ))}
        </div>

        {/* day cards */}
        <div className="mt-3 flex flex-col gap-2">
          {week.days.map((d) => (
            <div
              key={d.date.toISOString()}
              className={`overflow-hidden rounded-xl border bg-surface ${d.today ? "border-primary/50" : "border-border"}`}
            >
              <div className={`flex items-center justify-between px-3 py-2 ${d.today ? "bg-primary/15" : "bg-surface-2"}`}>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                  {d.weekday} {d.month}
                </span>
                <span className={`text-sm font-semibold ${d.today ? "text-primary" : "text-text"}`}>{d.dayNum}</span>
              </div>
              <div className="flex flex-col gap-1.5 p-2">
                {periods.map((p) => {
                  const s = sessions[sessionKey(d.date, p)];
                  if (!s) {
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => openEditor(d.date, p)}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-border px-2.5 py-2 text-muted active:border-primary/40 active:text-primary"
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
                      <div className="mt-0.5 flex items-center gap-2 text-[9px] text-muted">
                        <span>{presetTime[p]}</span>
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

        {editor && renderEditor()}
      </div>
    );
  }

  return null;

  /* ─────────────  session editor sheet (inlined, not a child component, so the
     description/note inputs keep focus while typing)  ───────────── */
  function renderEditor() {
    if (!editor) return null;
    const cat = form.category;
    const sugg = cat ? suggestionsFor(cat, form.intensity) : [];
    const weekday = editor.date.toLocaleDateString("en-US", { weekday: "long" });
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setEditor(null)}>
        <div
          className="flex max-h-[88vh] w-full max-w-screen-sm flex-col rounded-t-3xl border-t border-border bg-background"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mt-3 h-1 w-9 flex-shrink-0 rounded-full bg-border" />
          <div className="overflow-y-auto px-5 pb-5 pt-3">
            <h2 className="text-lg font-semibold text-text">
              {weekday} {editor.period}
            </h2>
            <p className="mb-4 text-[11px] text-muted">{presetTime[editor.period]} · no duration or location needed</p>

            {/* category */}
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Type</div>
            <div className="grid grid-cols-5 gap-1.5">
              {categories.map((c) => {
                const active = cat === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: c, intensity: undefined }))}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 ${
                      active ? "border-primary bg-primary/10" : "border-border bg-surface"
                    }`}
                  >
                    <Dot color={categoryMeta[c].color} />
                    <span className="text-[10px] font-semibold text-text">{categoryMeta[c].label}</span>
                  </button>
                );
              })}
            </div>

            {/* intensity (water/erg) */}
            {cat && categoryMeta[cat].hasIntensity && (
              <>
                <div className="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Intensity</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {intensities.map((it) => {
                    const active = form.intensity === it;
                    return (
                      <button
                        key={it}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, intensity: it }))}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 ${
                          active ? "border-primary bg-primary/10" : "border-border bg-surface"
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

            {/* suggestions */}
            {sugg.length > 0 && (
              <>
                <div className="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Most used · tap to fill
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sugg.map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, description: text }))}
                      className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] text-text active:border-primary/40 active:bg-primary/10"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* description + note */}
            {cat && cat !== "off" && (
              <>
                <div className="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Description</div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Type the workout…"
                  className="w-full resize-none rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-base text-text outline-none focus:border-primary placeholder:text-muted"
                />
              </>
            )}

            <div className="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Note (optional)</div>
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="A note for the athletes…"
              className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-base text-text outline-none focus:border-primary placeholder:text-muted"
            />

            {/* actions */}
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={clearSession}
                className="rounded-xl border border-border bg-surface px-4 py-3 text-[13px] font-medium text-muted"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={!editorValid}
                onClick={saveSession}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[14px] font-semibold text-primary-contrast disabled:opacity-40"
              >
                <IconCheck size={16} /> Save session
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

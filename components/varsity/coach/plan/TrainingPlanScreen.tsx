"use client";

/*
  Coach TRAINING PLAN BUILDER (interactive, built from scratch).
  A small screen state-machine:
    blocks → create → block (weeks overview) → week (days) → [session editor sheet]

  Create a block (name + dates, usually before a race) → it shows the weeks → tap a
  week to see its 7 days → tap a day's AM/PM to open the editor → pick a type, an
  intensity if that type asks for one, fill the description (free text, or tap one
  of the most-used chips), an optional place to be, and an optional note. No
  duration; the time is a preset.

  NOTHING IN THE EDITOR IS HARDCODED ANY MORE. The types, the zones, the chips and
  the preset times all come from the squad's own config, which the coach edits at
  /varsity/coach/settings/training (lib/varsity/trainingConfig.ts). Until that
  loads — and for a team that never opened Settings — it is the rowing default,
  which is exactly what this screen shipped with. Colors are theme tokens; the
  session colours are content colours from that config (rule-1 exception),
  applied via inline style.
*/
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button, { buttonClass } from "@/components/ui/Button";
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import {
  periods,
  sessionKey,
  parseSessionKey,
  boardOptions,
  defaultBoard,
  buildWeeks,
  blockRangeLabel,
  daysToRace,
  toISO,
  addDays,
  type Block,
  type Session,
  type SessionMap,
  type Period,
  type WeekRow,
  type BoardKind,
} from "@/lib/varsity/coachPlan";
import {
  configSessionColor,
  configSessionLabel,
  defaultConfig,
  configCanBoard,
  findType,
  workoutsFor,
  type TrainingConfig,
} from "@/lib/varsity/trainingConfig";
import { fetchTrainingConfig } from "@/lib/varsity/configStore";
import { useMembership } from "@/components/varsity/useMembership";
import { fetchPlan, savePlan } from "@/lib/varsity/planStore";
import { notifySquad } from "@/lib/push/client";
import SaveState from "@/components/varsity/coach/SaveState";
import PublishBar from "@/components/varsity/coach/PublishBar";
import {
  IconPlus,
  IconArrowLeft,
  IconChevronRight,
  IconFlag,
  IconClipboard,
  IconCheck,
  IconCalendar,
  IconRepeat,

  IconTrash,
  IconTrophy,
  IconPencil,
} from "@/components/icons";

/*
  THE TAB OPENS ON THE WEEK (owner, 2026-09-17: "I don't want to see the
  training box… open the training block with the week tab, so the current week
  will be shown, and then there will be the other weeks you can click. There's
  no point in having more blocks at once"). There used to be two screens in
  front of the weeks — a list of blocks, then the block with its weeks listed
  as rows — and a coach walked through both every time to reach the one week
  they were in. Both are gone. The tab lands on the current block's current
  week; the other weeks are the chips over the days; and the block itself —
  its dates, its race, the other blocks, a new one, and delete — is a section
  at the BOTTOM of the same page. "empty" is the console with no block yet.
*/
type View =
  | { name: "empty" }
  | { name: "create" }
  /* The same form as "create", filled with a block's own name, dates and race
     (owner, 2026-09-18: "I want to edit the current training block — name,
     race etc."). */
  | { name: "edit"; blockId: string }
  | { name: "week"; blockId: string; weekIdx: number };

/*
  WHERE THE TAB LANDS. The block that covers today; failing that the next one
  to start; failing that the last one that ran. Inside it, the week that holds
  today, or the first week of a block that has not started.
*/
const homeBlock = (bs: Block[], iso: string): Block | null =>
  bs.find((b) => b.start <= iso && iso <= b.end) ??
  [...bs].filter((b) => b.start > iso).sort((a, b) => a.start.localeCompare(b.start))[0] ??
  [...bs].sort((a, b) => b.end.localeCompare(a.end))[0] ??
  null;
const homeWeekIdx = (b: Block): number => {
  const i = buildWeeks(b).findIndex((w) => w.days.some((d) => d.today));
  return i >= 0 ? i : 0;
};

type Form = {
  category?: string;
  intensity?: string;
  description: string;
  time: string;
  location: string;
  note: string;
  repeat: "once" | "weekly";
  teamWorkout: boolean;
  board: BoardKind;
};

function Dot({ color }: { color: string }) {
  return <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />;
}

/* One string standing for the whole plan — this is how a real edit is told
   apart from a re-render, and what the autosave compares against. */
const snapshot = (blocks: Block[], sessions: SessionMap) =>
  JSON.stringify({ blocks, sessions });


/* Published / Draft, beside the title — THE SAME CHIP THE LINEUP BUILDER
   WEARS beside its day, so the two tabs say the same thing the same way
   (owner, 2026-09-17: "just like Published, like you have in lineups now"). */
function StatusChip({ live }: { live: boolean }) {
  return (
    <span
      className={`flex flex-shrink-0 items-center gap-1 rounded px-1.5 py-px text-[11px] font-semibold uppercase tracking-[0.12em] ${
        live
          ? "border border-success-line bg-success-tint text-success"
          : "border border-warn-line bg-warn-tint text-warn"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-success" : "bg-warn"}`} />
      {live ? "Published" : "Draft"}
    </span>
  );
}

export default function TrainingPlanScreen({
  openSlot = null,
}: {
  /** A slot to open the editor on straight away (?slot= from the Today screen). */
  openSlot?: string | null;
}) {
  const vTheme = useVarsityTheme();
  const { membership } = useMembership();
  /*
    The squad's own words for everything in the editor — the session types, the
    zones, the most-used workouts and the preset times. Until it arrives (and
    for a team that never opened Settings) this is the rowing default, which is
    exactly what the builder shipped with.
  */
  const [cfg, setCfg] = useState<TrainingConfig>(defaultConfig);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [sessions, setSessions] = useState<SessionMap>({});
  // null = wherever the tab lands (see homeBlock); set once the coach moves.
  const [picked, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(true);
  /*
    AUTOSAVE — there is no Save button on this screen any more.
    `writing` is a request in flight; `failed` is the one state worth a control
    (Retry); `lastSaved` is a snapshot of exactly what the database holds, so a
    real edit can be told apart from a re-render and nothing is ever written
    twice. Publishing still writes explicitly, because it must know it worked
    before it buzzes forty phones.
  */
  const [writing, setWriting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  /*
    THE PLAN NEVER ARRIVED. Not "this squad has no plan" — the read itself
    failed, and an empty grid is a lie. Saving prunes, so one edit on a lying
    grid would delete the real season. While this is set the screen shows what
    happened and refuses to write anything at all.
  */
  const [loadFailed, setLoadFailed] = useState(false);

  /*
    Load the shared plan from the database (or localStorage fallback). Its own
    callback rather than only an effect, so the "couldn't load" screen has
    something to put behind Try again.
  */
  const [reloads, setReloads] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const plan = await fetchPlan();
      if (!active) return;
      setLoadFailed(!!plan.failed);
      setBlocks(plan.blocks);
      setSessions(plan.sessions);
      // What the database holds right now — the baseline every later edit is
      // compared against. Set BEFORE loading flips, so the autosave below can
      // never fire on the plan it just read back.
      setLastSaved(snapshot(plan.blocks, plan.sessions));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [reloads]);

  /* The team's training vocabulary, once we know which team this is. Kept
     separate from the plan load so the grid is never held up by it. */
  useEffect(() => {
    const teamId = membership?.teamId;
    if (!teamId) return;
    let active = true;
    fetchTrainingConfig(teamId).then((c) => {
      if (active) setCfg(c);
    });
    return () => {
      active = false;
    };
  }, [membership?.teamId]);

  // Write the whole plan. Returns false if it failed, so callers that must be
  // sure (Publish) can hold their notification back.
  const persist = useCallback(
    async (
      next?: { blocks?: Block[]; sessions?: SessionMap },
      opts?: { allowEmpty?: boolean },
    ) => {
      // Never write on top of a plan we failed to read — see loadFailed above.
      if (loadFailed) return false;
      const b = next?.blocks ?? blocks;
      const s = next?.sessions ?? sessions;
      const snap = snapshot(b, s);
      setWriting(true);
      const { error } = await savePlan({ blocks: b, sessions: s }, opts);
      setWriting(false);
      if (error) {
        console.error("savePlan:", error);
        setFailed(true);
        return false;
      }
      setLastSaved(snap);
      setFailed(false);
      return true;
    },
    [blocks, sessions, loadFailed],
  );

  /* Is there anything the database hasn't got yet? */
  const dirty = useMemo(
    () => lastSaved !== null && lastSaved !== snapshot(blocks, sessions),
    [lastSaved, blocks, sessions],
  );

  /*
    THE AUTOSAVE. A short pause after the last edit, then it writes — so typing
    a description isn't one request per keystroke, and closing the app is never
    the thing that loses a week of training.
  */
  useEffect(() => {
    if (loading || !dirty || writing) return; // never two writes in the air at once
    const t = window.setTimeout(() => void persist(), 700);
    return () => window.clearTimeout(t);
  }, [loading, dirty, writing, persist]);

  /*
    Leaving the screen inside that pause (tapping another console tab) would
    outrun the timer, so the last state is kept in a ref and flushed on the way
    out. Not awaited — the component is going, the request isn't.
  */
  const pending = useRef<{ dirty: boolean; plan: { blocks: Block[]; sessions: SessionMap } }>({
    dirty: false,
    plan: { blocks: [], sessions: {} },
  });
  const pendingBlocked = useRef(false);
  useEffect(() => {
    pending.current = { dirty, plan: { blocks, sessions } };
  }, [dirty, blocks, sessions]);
  useEffect(() => {
    pendingBlocked.current = loadFailed;
  }, [loadFailed]);
  useEffect(
    () => () => {
      if (pending.current.dirty && !pendingBlocked.current) void savePlan(pending.current.plan);
    },
    [],
  );

  /*
    THE SAVE LINE ONLY WHEN IT FAILED (owner, 2026-09-21: "we know that it
    saves automatically when we change, so just cut the top").

    A sticky bar across the top of every week saying "Saved" is a bar that
    says nothing: the console has no Save button anywhere, so saving is not a
    thing the coach is waiting on. The one moment it IS worth a line is the one
    the coach can do something about — a save that did not go through, with its
    Retry. Then, and only then, the bar appears.
  */
  const saveFailed = failed;
  const saveState = saveFailed ? (
    <SaveState status="error" onRetry={() => void persist()} />
  ) : null;

  // Publish a draft block: flip it to published, then persist so athletes see it.
  // Publishing is the one moment worth a notification — the squad's week has just
  // changed under them. Only on success, and never on an autosave: a draft is
  // the coach thinking, and nobody should have their phone buzz for that.
  const publishBlock = async (blockId: string) => {
    const target = blocks.find((x) => x.id === blockId);
    if (!target) return;
    // What the squad is about to be told, written on the block itself so it
    // is still known next time the app opens (db/patch_announced.sql).
    const snap = blockSnapshot(target);
    const next = blocks.map((b) =>
      b.id === blockId ? { ...b, status: "published" as const, announced: snap } : b,
    );
    setBlocks(next);
    if (!(await persist({ blocks: next }))) return;
    setAnnounced((prev) => ({ ...prev, [blockId]: snap }));
    notifySquad({ kind: "team_plan", preview: target.name });
  };

  /*
    The block is already live and already changed on their Home — this buzzes
    the phones and writes down that it did. Anything still in the autosave's
    pause goes with it, so the squad never gets told about work the database
    hasn't got.
  */
  const tellSquad = async (blockId: string) => {
    const target = blocks.find((x) => x.id === blockId);
    if (!target) return;
    const snap = blockSnapshot(target);
    const next = blocks.map((b) => (b.id === blockId ? { ...b, announced: snap } : b));
    setBlocks(next);
    if (!(await persist({ blocks: next }))) return;
    setAnnounced((prev) => ({ ...prev, [blockId]: snap }));
    notifySquad({ kind: "team_plan", preview: target.name });
  };

  // Move a published block back to draft (hides it from athletes again).
  const unpublishBlock = async (blockId: string) => {
    const next = blocks.map((b) =>
      b.id === blockId ? { ...b, status: "draft" as const, announced: null } : b,
    );
    setBlocks(next);
    setAnnounced((prev) => {
      const rest = { ...prev };
      delete rest[blockId];
      return rest;
    });
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

  /*
    WHAT THE SQUAD HAS ALREADY BEEN TOLD.
    A published block is live: it autosaves, so every edit reaches the athletes'
    Home as it is made. The only thing left to decide is whether their phones
    should buzz — so we remember what each block looked like the last time it
    was announced, and offer "Tell the squad" only once it actually differs.

    The memory is on the block row (`announced`, db/patch_announced.sql), so
    an edit made to a live block and then closed still offers the buzz next
    time — this map is just the row's value held for rendering. A block
    published before that was recorded (null) is taken as up to date.
  */
  const [announced, setAnnounced] = useState<Record<string, string>>({});
  const blockSnapshot = (b: Block) =>
    JSON.stringify([
      b.name,
      b.start,
      b.end,
      b.raceName ?? "",
      b.raceDate ?? "",
      [...blockKeys(b)].sort().map((k) => [k, sessions[k] ?? null]),
    ]);
  const blockChanged = (b: Block) =>
    announced[b.id] !== undefined && announced[b.id] !== blockSnapshot(b);

  /* A block that was ALREADY published when the screen opened starts from
     what the squad was last told (on the row) — or, for a block published
     before that was recorded, from what it looks like now. */
  useEffect(() => {
    if (loading) return;
    setAnnounced((prev) => {
      let next = prev;
      for (const b of blocks) {
        if (b.status !== "published" || prev[b.id] !== undefined) continue;
        if (next === prev) next = { ...prev };
        next[b.id] = b.announced ?? blockSnapshot(b);
      }
      return next;
    });
    // Only when the set of blocks changes — the snapshot itself must NOT be a
    // dependency, or every edit would quietly re-baseline what was announced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, blocks]);

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
    setView(null); // land on whatever block is left — or the empty console
    // The one place that may legitimately leave the database with no plan.
    await persist({ blocks: nextBlocks, sessions: nextSessions }, { allowEmpty: true });
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
    location: "",
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

  /* Nothing picked yet: the current block's current week, or the empty console. */
  const view: View = useMemo<View>(() => {
    if (picked) return picked;
    const home = homeBlock(blocks, todayISO);
    return home ? { name: "week", blockId: home.id, weekIdx: homeWeekIdx(home) } : { name: "empty" };
  }, [picked, blocks, todayISO]);
  const block = "blockId" in view ? blocks.find((b) => b.id === view.blockId) : undefined;
  const weeks: WeekRow[] = useMemo(() => (block ? buildWeeks(block) : []), [block]);

  /* ── create a block ── */
  const freshDraft = () => ({ name: "", start: todayISO, end: addDays(todayISO, 48), raceName: "", raceDate: "" });
  const openCreate = () => {
    setDraft(freshDraft());
    setView({ name: "create" });
  };
  /* ── edit a block: the create form, filled from the block ── */
  const openEditBlock = (b: Block) => {
    setDraft({ name: b.name, start: b.start, end: b.end, raceName: b.raceName ?? "", raceDate: b.raceDate ?? "" });
    setView({ name: "edit", blockId: b.id });
  };
  const saveBlockEdit = (id: string) => {
    if (!draft.name.trim() || !draft.start || !draft.end || draft.end < draft.start) return;
    const patch = {
      name: draft.name.trim(),
      start: draft.start,
      end: draft.end,
      raceName: draft.raceName.trim() || undefined,
      raceDate: draft.raceDate || undefined,
    };
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    // Sessions keep their dates; a block that moved or shrank simply shows the
    // weeks it now covers. Land on the week that holds today, as the tab does.
    const cur = blocks.find((b) => b.id === id);
    setView({ name: "week", blockId: id, weekIdx: cur ? homeWeekIdx({ ...cur, ...patch }) : 0 });
  };
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
    setView({ name: "week", blockId: b.id, weekIdx: homeWeekIdx(b) });
  };

  /* ── session editor ── */
  const openEditor = (date: Date, period: Period) => {
    const existing = sessions[sessionKey(date, period)];
    setForm({
      category: existing?.category,
      intensity: existing?.intensity,
      description: existing?.description ?? "",
      time: existing?.time ?? cfg.times[period],
      location: existing?.location ?? "",
      note: existing?.note ?? "",
      repeat: "once",
      teamWorkout: existing?.teamWorkout ?? false,
      board: existing?.board ?? defaultBoard(existing?.intensity),
    });
    setEditor({ date, period });
  };

  /*
    ARRIVING FROM TODAY. In the first render that has the plan, land on the
    week that holds the slot and open its editor — once per link. A slot no
    block covers falls back to wherever the tab lands, where "New training
    block" is at the bottom of the page. This is React's adjust-state-during-render pattern (the
    one useMembership uses): the state is set in the render that first sees
    the loaded plan, and React re-renders before anything is painted. Not an
    effect, because the repo's lint forbids setState inside one. Sits after
    openEditor, which it calls.
  */
  const [arrived, setArrived] = useState<string | null>(null);
  if (!loading && openSlot && arrived !== openSlot) {
    setArrived(openSlot);
    const parsed = parseSessionKey(openSlot);
    if (parsed) {
      const iso = toISO(parsed.date);
      const b = blocks.find((x) => x.start <= iso && iso <= x.end);
      const idx = b ? buildWeeks(b).findIndex((w) => w.days.some((d) => toISO(d.date) === iso)) : -1;
      if (b && idx !== -1) {
        setView({ name: "week", blockId: b.id, weekIdx: idx });
        openEditor(parsed.date, parsed.period);
      }
    }
  }

  /* A type only asks for a zone if the coach said it does, AND there are zones
     to pick from — a squad that deleted them all must still be able to save. */
  const asksZone = (typeKey?: string) =>
    !!typeKey && findType(cfg, typeKey).hasZones && cfg.zones.length > 0;

  const editorValid = !!form.category && (!asksZone(form.category) || !!form.intensity);

  /* A session's colour and words, read through the squad's own config. */
  const sColor = (s: Session) => configSessionColor(cfg, s.category, s.intensity);
  const sLabel = (s: Session) => configSessionLabel(cfg, s.category, s.intensity);

  /*
    WHERE "EVERY WEEK" LANDS: the same weekday and period, from the day being
    edited FORWARD to the end of the block — never backwards. It used to write
    every week of the block, so changing Tuesday AM in week five rewrote weeks
    one to four as well: training that had already happened and been logged
    against. A repeat is a decision about the weeks still to come.
  */
  const weeklyTargets = (from: Date, period: Period): string[] => {
    const weekday = from.getDay();
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const keys: string[] = [];
    for (const w of weeks) {
      for (const d of w.days) {
        if (d.date.getDay() === weekday && d.date >= start) keys.push(sessionKey(d.date, period));
      }
    }
    return keys;
  };

  const saveSession = () => {
    if (!editor || !form.category || !editorValid) return;
    const s: Session = {
      category: form.category,
      intensity: asksZone(form.category) ? form.intensity : undefined,
      description: form.description.trim(),
      time: form.time.trim() || cfg.times[editor.period],
      location: form.location.trim() || undefined,
      note: form.note.trim() || undefined,
      // Weights / Off never carry a board, so they never keep a stale flag.
      teamWorkout: configCanBoard(cfg, form.category) ? form.teamWorkout : false,
      board: form.board,
    };
    if (form.repeat === "weekly") {
      setSessions((prev) => {
        const next = { ...prev };
        for (const key of weeklyTargets(editor.date, editor.period)) next[key] = s;
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
                    disabled={writing}
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

  /*
    THE PLAN DIDN'T LOAD. Deliberately NOT the empty console: an empty grid
    here would say "you have no plan", which may be untrue, and one edit on it
    would delete the real one (savePlan prunes). So the screen says what
    actually happened and gives the one useful button.
  */
  if (loadFailed) {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
        <h1 className="sr-only">Training plan</h1>
        <div className="mt-2 rounded-2xl border border-danger-line bg-danger-tint px-5 py-10 text-center">
          <div className="text-[14px] font-semibold text-text">Couldn&apos;t load the plan</div>
          <p className="mx-auto mt-1 max-w-[18rem] text-[12px] text-muted">
            Your training is safe — this screen just couldn&apos;t reach it, so it
            won&apos;t let anything be changed until it can.
          </p>
          <Button size="md" onClick={() => setReloads((n) => n + 1)} className="mt-5">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  /* ─────────────  view: the empty console (no block yet)  ───────────── */
  if (view.name === "empty") {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
        <h1 className="sr-only">Training plan</h1>
        <div className="mt-2 rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-tint text-primary">
            <IconCalendar size={22} />
          </div>
          <div className="text-[14px] font-semibold text-text">No training blocks yet</div>
          <p className="mx-auto mt-1 max-w-[16rem] text-[12px] text-muted">
            Create your first block to start planning the weeks ahead.
          </p>
          {/* data-tour: whichever "new block" button is on screen is the one
              the tour lights — see visibleAnchor(). */}
          <Button size="md" onClick={openCreate} className="mt-5" data-tour="coach-plan-new-block">
            <IconPlus size={16} /> New training block
          </Button>
        </div>
        {confirmModal}
      </div>
    );
  }

  /* ─────────────  view: create block  ───────────── */
  if (view.name === "create" || view.name === "edit") {
    const editing = view.name === "edit" ? blocks.find((b) => b.id === view.blockId) : undefined;
    const valid = draft.name.trim() && draft.start && draft.end && draft.end >= draft.start;
    const inputCls =
      "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-base text-text outline-none focus:border-primary placeholder:text-muted";
    const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted";
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
        <button onClick={() => setView(null)} className="flex items-center gap-1 text-[13px] text-muted">
          <IconArrowLeft size={16} /> Training plan
        </button>
        <h1 className="mt-1 text-2xl font-semibold text-text">{editing ? "Edit block" : "New training block"}</h1>

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

          <Button
            size="lg"
            full
            disabled={!valid}
            onClick={() => (editing ? saveBlockEdit(editing.id) : createBlock())}
            className="mt-1"
          >
            {editing ? "Save" : "Create block"}
          </Button>
        </div>
      </div>
    );
  }

  /* ─────────────  view: week (days)  ───────────── */
  if (view.name === "week" && block) {
    // A block that shrank under a picked index still shows its last week.
    const week = weeks[Math.min(view.weekIdx, weeks.length - 1)];
    const live = block.status === "published";
    const others = blocks.filter((b) => b.id !== block.id);
    const race = daysToRace(block);
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
        {/*
          THE TOP ROW IS GONE (owner, 2026-09-21). It held the save state and
          the publish button; publishing went DOWN into the block card on
          2026-09-20, which left a sticky bar whose whole job was to say
          "Saved" — about a screen that has no Save button and never had one.
          The block card is now the first thing under the tabs. What is left of
          the bar is the one line that is worth interrupting for: a save that
          DIDN'T go through, and its Retry.
        */}
        {saveState && (
          <div className="sticky top-0 z-20 -mx-4 flex items-center justify-end gap-2 border-b border-danger-line bg-background/95 px-4 py-2.5 backdrop-blur">
            {saveState}
          </div>
        )}
        {/*
          THE BLOCK, AT THE TOP (owner, 2026-09-18). It was a section at the
          bottom of the page for a day; the owner wanted to "start with the
          training block open": the block you are in first — its name, its
          dates, the race it runs to — then the other blocks there are (one or
          two at most, tap one to open it) and New training block, and only
          THEN the week. Delete block alone stays at the very bottom.
        */}
        <h1 className="sr-only">{block.name}</h1>
        {/*
          ONE RECTANGLE, NO LINES INSIDE IT (owner, 2026-09-20). What the block
          IS reads down the left — its name with Draft / Published pushed up
          against it, the week under that, and the race it runs to sitting at
          the bottom. What you can DO to it is a column of matching buttons on
          the right: Edit, then Publish (or Unpublish, or both once a live
          block has been edited). The two sides are the same height, which is
          what stopped the card looking lopsided.
        */}
        <div
          data-tour="coach-plan-status"
          className="mt-3 flex w-full items-stretch gap-4 rounded-xl border border-border bg-surface px-4 py-3.5"
        >
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate text-[17px] font-semibold text-text">{block.name}</span>
                <StatusChip live={live} />
              </div>
              <div className="mt-1 text-[11px] text-muted">{week.rangeLabel}</div>
            </div>
            {/* The race in a pill of its own, down at the foot of the left
                column so it answers the buttons across from it. */}
            {block.raceName && (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 self-start rounded-full border border-border px-3 py-1.5 text-[11px] text-muted">
                <span className="flex-shrink-0 text-primary">
                  <IconFlag size={12} />
                </span>
                <span className="truncate font-medium text-text">{block.raceName}</span>
                {race !== null && (
                  <span className="flex-shrink-0">
                    · <span className="font-semibold text-accent">{race}</span> days
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex w-[120px] flex-shrink-0 flex-col gap-2">
            <Button
              variant="secondary"
              size="md"
              full
              onClick={() => openEditBlock(block)}
              aria-label={`Edit ${block.name}`}
            >
              <IconPencil size={13} /> Edit
            </Button>
            <PublishBar
              stack
              what="block"
              live={live}
              changed={blockChanged(block)}
              busy={writing}
              onPublish={() => publishBlock(block.id)}
              onNotify={() => tellSquad(block.id)}
              onUnpublish={() => unpublishBlock(block.id)}
            />
          </div>
        </div>

        {others.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {others.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setView({ name: "week", blockId: b.id, weekIdx: homeWeekIdx(b) })}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-text">{b.name}</span>
                    <StatusChip live={b.status === "published"} />
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted">{blockRangeLabel(b)}</div>
                </div>
                <IconChevronRight size={16} className="flex-shrink-0 text-muted" />
              </button>
            ))}
          </div>
        )}

        {/* THE OTHER WEEKS — one chip each, the week you are in filled. This
            row is the whole way between weeks now that the list of week rows
            is gone. data-tour: the console tour points here. */}
        <div
          data-tour="coach-plan-weeks"
          className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
        >
          {weeks.map((w, i) => (
            <button
              key={w.index}
              type="button"
              onClick={() => setView({ name: "week", blockId: block.id, weekIdx: i })}
              className={`flex-shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium ${
                w.index === week.index ? "border-text bg-text text-background" : "border-border bg-surface text-muted"
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
                {/* Just the day, written out — the owner crossed out the month
                    (2026-09-18): the week range above already says it. */}
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {d.date.toLocaleDateString("en-US", { weekday: "long" })}
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
                      className="w-full rounded-lg border border-border bg-surface py-2 pl-2.5 pr-2.5 text-left"
                      style={{ borderLeft: `3px solid ${sColor(s)}` }}
                    >
                      {/*
                        THE OWNER’S CARD (2026-09-18). White, not grey. The top
                        row is the session’s name on the left where "AM" was, and
                        the time on the right where the name was — the time says
                        AM or PM itself, so the period label is gone from a filled
                        slot. The name is written in ordinary dark text with a dot
                        of the workout’s colour beside it: painting the word in the
                        colour made a grey Erg, and a lime UT2, unreadable.
                      */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text">
                          <span
                            aria-hidden
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ background: sColor(s) }}
                          />
                          <span className="truncate">{sLabel(s)}</span>
                        </span>
                        <span className="flex-shrink-0 text-[11px] font-semibold tabular-nums text-text">{s.time}</span>
                      </div>
                      {s.description && (
                        <div className="mt-1 text-[11px] font-medium leading-snug text-text">{s.description}</div>
                      )}
                      {(s.location || s.note) && (
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                          {s.location && <span className="truncate">{s.location}</span>}
                          {s.note && (
                            <span className="flex items-center gap-1">
                              <IconClipboard size={9} /> note
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* THE THREE ACTIONS, ONE ROW OF SMALL BUTTONS at the foot of the page
            (owner, 2026-09-18: "doesn't need to be three big tabs"), in the
            owner's order left to right. */}
        <div className="mt-5 flex gap-1">
          <button
            type="button"
            onClick={() => setConfirm({ kind: "block", blockId: block.id })}
            className="flex flex-auto items-center justify-center gap-0.5 whitespace-nowrap rounded-lg border border-danger-line bg-danger-tint px-1 py-2 text-center text-[11px] font-semibold leading-tight text-danger"
          >
            <IconTrash size={12} className="flex-shrink-0" /> Delete block
          </button>
          <button
            type="button"
            onClick={() => setConfirm({ kind: "week", blockId: block.id, weekIdx: weeks.indexOf(week) })}
            className="flex flex-auto items-center justify-center gap-0.5 whitespace-nowrap rounded-lg border border-danger-line bg-danger-tint px-1 py-2 text-center text-[11px] font-semibold leading-tight text-danger"
          >
            <IconTrash size={12} className="flex-shrink-0" /> Clear this week
          </button>
          <button
            type="button"
            onClick={openCreate}
            data-tour="coach-plan-new-block"
            className="flex flex-auto items-center justify-center gap-0.5 whitespace-nowrap rounded-lg border border-dashed border-border bg-surface px-1 py-2 text-center text-[11px] font-semibold leading-tight text-muted active:border-primary-line active:text-primary"
          >
            <IconPlus size={12} className="flex-shrink-0" /> New training block
          </button>
        </div>

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
    const sugg = workoutsFor(cfg, cat, form.intensity);
    /* The tour presses the first zoned type and the first zone, so the walk
       works whatever a squad has called them (lib/varsity/coachTour.ts). */
    const firstZonedType = cfg.types.find((t) => t.hasZones && cfg.zones.length > 0)?.key;
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
              chosen, so the tour presses the first type that asks for a zone —
              the one that shows the whole form — and the rest of the walk has
              something to point at. The types themselves come from the squad's
              settings, so the anchor cannot name one.
              The column count follows the list rather than being fixed at five,
              so three types are not three fifths of a row and seven wrap. */}
          <div
            data-tour="coach-plan-type"
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${Math.min(cfg.types.length, 5)}, minmax(0, 1fr))` }}
          >
            {cfg.types.map((t) => {
              const active = cat === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  data-tour={t.key === firstZonedType ? "coach-plan-cat-first" : undefined}
                  onClick={() =>
                    setForm((f) => ({ ...f, category: t.key, intensity: undefined, description: "" }))
                  }
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 ${
                    active ? "border-primary bg-primary-tint" : "border-border bg-surface"
                  }`}
                >
                  <Dot color={t.color} />
                  <span className="text-[11px] font-semibold text-text">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* intensity — only for the types the coach said should ask */}
          {asksZone(cat) && (
            <>
              <div className={labelCls}>Intensity</div>
              <div
                data-tour="coach-plan-intensity"
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${Math.min(cfg.zones.length, 4)}, minmax(0, 1fr))` }}
              >
                {cfg.zones.map((z, zi) => {
                  const active = form.intensity === z.key;
                  return (
                    <button
                      key={z.key}
                      type="button"
                      data-tour={zi === 0 ? "coach-plan-int-first" : undefined}
                      onClick={() => setForm((f) => ({ ...f, intensity: z.key }))}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 ${
                        active ? "border-primary bg-primary-tint" : "border-border bg-surface"
                      }`}
                    >
                      <Dot color={z.color} />
                      <span className="text-[12px] font-semibold text-text">{z.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* the coach's own most-used workouts for this type + zone */}
          {cat && sugg.length > 0 && (
            <>
              <div className={labelCls}>Most used · tap to fill</div>
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
                placeholder={cfg.times[editor.period]}
                className={inputCls}
              />
            </>
          )}

          {/* WHERE TO BE — optional, free text, and EMPTY BY DEFAULT (not for
              Off). It used to be filled in on every session, which meant every
              card on every screen said the squad's own boathouse back at it.
              Nobody reads that (owner, 2026-09-21). It is left blank unless the
              coach types somewhere else, and only then does anyone see it. */}
          {cat && cat !== "off" && (
            <>
              <div className={labelCls}>Somewhere else? (optional)</div>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Only if it's not the usual place"
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
          {configCanBoard(cfg, cat) && (
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
              {form.repeat === "weekly" &&
                (() => {
                  /* Say exactly what is about to be written, and what it is
                     about to write OVER — a count the coach can check against
                     the weeks list before pressing Done. */
                  const targets = weeklyTargets(editor.date, editor.period);
                  const others = targets.filter((k) => k !== sessionKey(editor.date, editor.period));
                  const replaced = others.filter((k) => !!sessions[k]).length;
                  return (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                      Puts this on every {weekday} {editor.period} from this week to the end of the
                      block — {others.length} more {others.length === 1 ? "week" : "weeks"}
                      {replaced > 0 && (
                        <>
                          , <span className="text-warn">{replaced} already set</span> and replaced
                        </>
                      )}
                      . Earlier weeks are left alone.
                    </p>
                  );
                })()}
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
              <IconCheck size={16} /> Done
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

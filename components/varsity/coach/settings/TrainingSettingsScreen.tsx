"use client";

/*
  TRAINING SETTINGS — the screen where a coach makes the plan builder their own.
  ---------------------------------------------------------------------------
  Everything the builder used to have hardcoded is edited here:

    1. SPORT PRESET   — start from rowing / swimming / running / team sport /
                        blank, then change anything.
    2. SESSION TYPES  — the words on the five buttons at the top of the session
                        editor. Name, colour, and three rules: does it ask for
                        an intensity, can its results go to a squad board, does
                        it need a lineup.
    3. INTENSITY ZONES— UT2 / UT1 / Hard, or Easy / Tempo / Race, or nothing.
    4. WORKOUT LIBRARY— the "Most used · tap to fill" chips. This is the coach's
                        own list of favourite workouts, per type and zone.
    5. SESSION TIMES  — when the morning and afternoon sessions usually start.

  RENAMING IS SAFE, DELETING IS NOT. A session stores its type by KEY, and a
  rename never changes the key, so every session already planned simply follows
  the new name. Deleting a type leaves those sessions pointing at a key that no
  longer exists — they still render (findType() falls back to the raw key) but
  they read as their key, so the delete confirmation counts them first.

  Coach only: the layout bounces a captain, and varsity_save_team_config()
  refuses them in the database. All colours are theme tokens; the workout
  colours are content colours from lib/varsity/trainingConfig.ts (rule-1
  exception), applied via inline style.
*/
import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Sheet from "@/components/varsity/Sheet";
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconPlus,
  IconTrash,
} from "@/components/icons";
import type { Membership } from "@/lib/varsity/membership";
import { fetchTrainingConfig, saveTrainingConfig } from "@/lib/varsity/configStore";
import { fetchPlan } from "@/lib/varsity/planStore";
import {
  defaultConfig,
  findType,
  keyFromLabel,
  libraryKey,
  paletteColors,
  presetLabel,
  presets,
  periods,
  type SessionType,
  type TrainingConfig,
  type Zone,
} from "@/lib/varsity/trainingConfig";

/* ── small shared pieces ─────────────────────────────────────────────────── */

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border px-3.5 py-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</h2>
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-muted">{hint}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: color }} />;
}

const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-base text-text outline-none focus:border-primary placeholder:text-muted";
const labelCls = "mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted";

/* A row that can be moved up and down. Arrows rather than drag: this is a
   phone, the lists are short, and a dropped drag on a list of five is worse
   than two taps. */
function OrderRow({
  children,
  onUp,
  onDown,
  onOpen,
}: {
  children: React.ReactNode;
  onUp?: () => void;
  onDown?: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="flex items-stretch gap-1 border-b border-border last:border-0">
      <button type="button" onClick={onOpen} className="flex flex-1 items-center gap-2.5 py-3 text-left">
        {children}
        <IconChevronRight size={16} />
      </button>
      <div className="flex flex-col justify-center">
        <button
          type="button"
          onClick={onUp}
          disabled={!onUp}
          aria-label="Move up"
          className="tap44 flex h-6 w-8 items-center justify-center text-muted disabled:opacity-25"
        >
          <IconChevronUp size={14} />
        </button>
        <button
          type="button"
          onClick={onDown}
          disabled={!onDown}
          aria-label="Move down"
          className="tap44 flex h-6 w-8 items-center justify-center text-muted disabled:opacity-25"
        >
          <IconChevronDown size={14} />
        </button>
      </div>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {paletteColors.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Colour ${c}`}
          onClick={() => onChange(c)}
          className={`flex h-10 items-center justify-center rounded-xl border ${
            value === c ? "border-primary" : "border-border"
          }`}
        >
          <span className="h-5 w-5 rounded-full" style={{ background: c }} />
        </button>
      ))}
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`mt-2 flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left ${
        on ? "border-primary bg-primary-tint" : "border-border bg-surface"
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
          on ? "border-primary bg-primary-live text-primary-contrast" : "border-border"
        }`}
      >
        {on && <IconCheck size={12} />}
      </span>
      <span>
        <span className="block text-[13px] font-semibold text-text">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{hint}</span>
      </span>
    </button>
  );
}

/* ── which editor is open ────────────────────────────────────────────────── */
type Editing =
  | null
  | { kind: "preset" }
  | { kind: "type"; index: number | "new" }
  | { kind: "zone"; index: number | "new" }
  | { kind: "library"; typeKey: string; zoneKey?: string };

export default function TrainingSettingsScreen({ membership }: { membership: Membership }) {
  const { teamId } = membership;
  const [cfg, setCfg] = useState<TrainingConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Editing>(null);
  /* How many planned sessions use each type — read once, only so the delete
     confirmation can say what it would orphan. */
  const [usage, setUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const [loaded, plan] = await Promise.all([fetchTrainingConfig(teamId), fetchPlan()]);
      if (!active) return;
      setCfg(loaded);
      const counts: Record<string, number> = {};
      for (const s of Object.values(plan.sessions)) counts[s.category] = (counts[s.category] ?? 0) + 1;
      setUsage(counts);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [teamId]);

  const update = useCallback((fn: (c: TrainingConfig) => TrainingConfig) => {
    setCfg((c) => fn(c));
    setDirty(true);
    setSaved(false);
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    const { error: err } = await saveTrainingConfig(teamId, cfg);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setDirty(false);
    setSaved(true);
  };

  /* ── list moves ── */
  const move = <T,>(list: T[], i: number, dir: -1 | 1): T[] => {
    const next = [...list];
    const j = i + dir;
    if (j < 0 || j >= next.length) return next;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };

  /* Every list the workout library holds, in the order the coach reads them:
     a zoned type contributes one row per zone, everything else a single row. */
  const libraryRows = useMemo(
    () =>
      cfg.types.flatMap((t) =>
        t.hasZones && cfg.zones.length
          ? cfg.zones.map((z) => ({ type: t, zone: z as Zone | undefined }))
          : [{ type: t, zone: undefined as Zone | undefined }],
      ),
    [cfg.types, cfg.zones],
  );

  if (loading) {
    return <p className="px-4 py-16 text-center text-sm text-muted">Loading your settings…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-28">
      <Section
        title="Sport"
        hint="A starting point for everything below. You can change any part of it afterwards."
      >
        <button
          type="button"
          onClick={() => setEditing({ kind: "preset" })}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3"
        >
          <span className="text-[14px] font-semibold text-text">{presetLabel(cfg.preset)}</span>
          <span className="flex items-center gap-1 text-[12px] text-muted">
            Change <IconChevronRight size={15} />
          </span>
        </button>
      </Section>

      <Section
        title="Session types"
        hint="The buttons across the top of the session editor. Renaming one is safe — sessions you have already planned follow the new name."
      >
        <div className="rounded-xl border border-border bg-surface px-3.5">
          {cfg.types.map((t, i) => (
            <OrderRow
              key={t.key}
              onOpen={() => setEditing({ kind: "type", index: i })}
              onUp={i > 0 ? () => update((c) => ({ ...c, types: move(c.types, i, -1) })) : undefined}
              onDown={
                i < cfg.types.length - 1
                  ? () => update((c) => ({ ...c, types: move(c.types, i, 1) }))
                  : undefined
              }
            >
              <Dot color={t.color} />
              <span className="flex-1 text-[14px] font-semibold text-text">{t.label}</span>
              <span className="text-[11px] text-muted">
                {[t.hasZones && "intensity", t.canBoard && "board", t.needsLineup && "lineup"]
                  .filter(Boolean)
                  .join(" · ") || "plain"}
              </span>
            </OrderRow>
          ))}
        </div>
        <Button
          variant="secondary"
          size="md"
          className="mt-2.5 w-full"
          onClick={() => setEditing({ kind: "type", index: "new" })}
        >
          <IconPlus size={15} /> Add a type
        </Button>
      </Section>

      <Section
        title="Intensity zones"
        hint="Only types with intensity switched on ask for these. Leave the list empty if your sport does not plan that way."
      >
        {cfg.zones.length > 0 && (
          <div className="rounded-xl border border-border bg-surface px-3.5">
            {cfg.zones.map((z, i) => (
              <OrderRow
                key={z.key}
                onOpen={() => setEditing({ kind: "zone", index: i })}
                onUp={i > 0 ? () => update((c) => ({ ...c, zones: move(c.zones, i, -1) })) : undefined}
                onDown={
                  i < cfg.zones.length - 1
                    ? () => update((c) => ({ ...c, zones: move(c.zones, i, 1) }))
                    : undefined
                }
              >
                <Dot color={z.color} />
                <span className="flex-1 text-[14px] font-semibold text-text">{z.label}</span>
              </OrderRow>
            ))}
          </div>
        )}
        <Button
          variant="secondary"
          size="md"
          className="mt-2.5 w-full"
          onClick={() => setEditing({ kind: "zone", index: "new" })}
        >
          <IconPlus size={15} /> Add a zone
        </Button>
      </Section>

      <Section
        title="Workout library"
        hint="Your own most-used workouts. They appear as the tap-to-fill chips in the session editor, in this order."
      >
        <div className="rounded-xl border border-border bg-surface px-3.5">
          {libraryRows.map(({ type, zone }) => {
            const list = cfg.library[libraryKey(type.key, zone?.key)] ?? [];
            return (
              <button
                key={`${type.key}:${zone?.key ?? ""}`}
                type="button"
                onClick={() => setEditing({ kind: "library", typeKey: type.key, zoneKey: zone?.key })}
                className="flex w-full items-center gap-2.5 border-b border-border py-3 text-left last:border-0"
              >
                <Dot color={zone?.color ?? type.color} />
                <span className="flex-1 text-[14px] text-text">
                  {type.label}
                  {zone && <span className="text-muted"> · {zone.label}</span>}
                </span>
                <span className="text-[11px] text-muted">
                  {list.length === 0 ? "none" : `${list.length} saved`}
                </span>
                <IconChevronRight size={16} />
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Session times" hint="The time a slot is filled in with. Every session can still be changed one by one.">
        <div className="grid grid-cols-2 gap-2.5">
          {periods.map((p) => (
            <label key={p} className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {p}
              </span>
              <input
                value={cfg.times[p]}
                onChange={(e) =>
                  update((c) => ({ ...c, times: { ...c.times, [p]: e.target.value } }))
                }
                placeholder="7:00 AM"
                className={inputCls}
              />
            </label>
          ))}
        </div>
      </Section>

      {/* save bar — only in the way once there is something to save */}
      {(dirty || saved || error) && (
        <div className="fixed inset-x-0 bottom-[76px] z-20 px-3.5">
          <div className="mx-auto flex max-w-screen-sm items-center gap-2.5 rounded-2xl border border-border bg-surface p-2.5 shadow-lg">
            <span className="flex-1 px-1 text-[12px] text-muted">
              {error ? <span className="text-danger">{error}</span> : saved ? "Saved for the squad." : "Unsaved changes"}
            </span>
            {dirty && (
              <Button size="md" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            )}
          </div>
        </div>
      )}

      {editing?.kind === "preset" && (
        <PresetSheet
          current={cfg.preset}
          onClose={() => setEditing(null)}
          onPick={(built) => {
            update(() => built);
            setEditing(null);
          }}
        />
      )}
      {editing?.kind === "type" && (
        <TypeSheet
          cfg={cfg}
          index={editing.index}
          usage={usage}
          onClose={() => setEditing(null)}
          onSave={(t, index) => {
            update((c) => ({
              ...c,
              types: index === "new" ? [...c.types, t] : c.types.map((x, i) => (i === index ? t : x)),
            }));
            setEditing(null);
          }}
          onDelete={(index) => {
            update((c) => {
              const gone = c.types[index];
              const library = { ...c.library };
              // Take its workout lists with it — an orphaned list is invisible
              // and would silently come back if the key were ever reused.
              for (const k of Object.keys(library)) {
                if (k === gone.key || k.startsWith(`${gone.key}:`)) delete library[k];
              }
              return { ...c, types: c.types.filter((_, i) => i !== index), library };
            });
            setEditing(null);
          }}
        />
      )}
      {editing?.kind === "zone" && (
        <ZoneSheet
          cfg={cfg}
          index={editing.index}
          onClose={() => setEditing(null)}
          onSave={(z, index) => {
            update((c) => ({
              ...c,
              zones: index === "new" ? [...c.zones, z] : c.zones.map((x, i) => (i === index ? z : x)),
            }));
            setEditing(null);
          }}
          onDelete={(index) => {
            update((c) => {
              const gone = c.zones[index];
              const library = { ...c.library };
              for (const k of Object.keys(library)) {
                if (k.endsWith(`:${gone.key}`)) delete library[k];
              }
              return { ...c, zones: c.zones.filter((_, i) => i !== index), library };
            });
            setEditing(null);
          }}
        />
      )}
      {editing?.kind === "library" && (
        <LibrarySheet
          cfg={cfg}
          typeKey={editing.typeKey}
          zoneKey={editing.zoneKey}
          onClose={() => setEditing(null)}
          onChange={(list) =>
            update((c) => ({
              ...c,
              library: { ...c.library, [libraryKey(editing.typeKey, editing.zoneKey)]: list },
            }))
          }
        />
      )}
    </div>
  );
}

/* ── Sport preset ────────────────────────────────────────────────────────── */
function PresetSheet({
  current,
  onClose,
  onPick,
}: {
  current: string;
  onClose: () => void;
  onPick: (cfg: TrainingConfig) => void;
}) {
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const pending = presets.find((p) => p.key === confirmKey);

  return (
    <Sheet title="Start from a sport" onClose={onClose}>
      {pending ? (
        <>
          <p className="text-[13px] leading-relaxed text-text">
            Switching to <strong>{pending.label}</strong> replaces your session types, zones,
            workout library and times.
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            Sessions you have already planned are not deleted, but any that used a type this
            preset does not have will show that type by its raw name until you add it back.
          </p>
          <div className="mt-4 flex gap-2.5">
            <Button variant="secondary" size="md" className="flex-1" onClick={() => setConfirmKey(null)}>
              Cancel
            </Button>
            <Button size="md" className="flex-1" onClick={() => onPick(pending.build())}>
              Use {pending.label}
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-border bg-surface px-3.5">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setConfirmKey(p.key)}
              className="flex w-full items-center gap-2.5 border-b border-border py-3 text-left last:border-0"
            >
              <span className="flex-1">
                <span className="block text-[14px] font-semibold text-text">{p.label}</span>
                <span className="mt-0.5 block text-[11px] text-muted">{p.sub}</span>
              </span>
              {p.key === current && <IconCheck size={16} />}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/* ── One session type ────────────────────────────────────────────────────── */
function TypeSheet({
  cfg,
  index,
  usage,
  onClose,
  onSave,
  onDelete,
}: {
  cfg: TrainingConfig;
  index: number | "new";
  usage: Record<string, number>;
  onClose: () => void;
  onSave: (t: SessionType, index: number | "new") => void;
  onDelete: (index: number) => void;
}) {
  const existing = index === "new" ? undefined : cfg.types[index];
  const [label, setLabel] = useState(existing?.label ?? "");
  const [color, setColor] = useState(existing?.color ?? paletteColors[4]);
  const [hasZones, setHasZones] = useState(existing?.hasZones ?? false);
  const [canBoard, setCanBoard] = useState(existing?.canBoard ?? false);
  const [needsLineup, setNeedsLineup] = useState(existing?.needsLineup ?? false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const inUse = existing ? (usage[existing.key] ?? 0) : 0;

  const commit = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onSave(
      {
        // The key is written into every session row, so it is minted ONCE and
        // never re-derived — a rename must not orphan the plan.
        key: existing?.key ?? keyFromLabel(trimmed, cfg.types.map((t) => t.key)),
        label: trimmed,
        color,
        hasZones,
        canBoard,
        needsLineup,
      },
      index,
    );
  };

  return (
    <Sheet title={existing ? `Edit ${existing.label}` : "New session type"} onClose={onClose}>
      {confirmDelete && existing ? (
        <>
          <p className="text-[13px] leading-relaxed text-text">
            Delete <strong>{existing.label}</strong>?
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            {inUse > 0
              ? `${inUse} session${inUse === 1 ? "" : "s"} in your plan use this type. They are not deleted — they will show as "${existing.key}" until you add the type back.`
              : "Nothing in your plan uses it. Its saved workouts go with it."}
          </p>
          <div className="mt-4 flex gap-2.5">
            <Button variant="secondary" size="md" className="flex-1" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              onClick={() => index !== "new" && onDelete(index)}
            >
              Delete
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Name</div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Water, Pool, Practice…"
            className={inputCls}
          />

          <div className={labelCls}>Colour</div>
          <ColorPicker value={color} onChange={setColor} />

          <div className={labelCls}>Rules</div>
          <Toggle
            label="Asks for an intensity"
            hint="The editor offers your zones after this type is picked."
            on={hasZones}
            onChange={setHasZones}
          />
          <Toggle
            label="Can be a team workout"
            hint="Everyone's result lands on one shared squad board."
            on={canBoard}
            onChange={setCanBoard}
          />
          <Toggle
            label="Needs a lineup"
            hint="Shows up in the Lineup builder to be crewed."
            on={needsLineup}
            onChange={setNeedsLineup}
          />

          <Button size="lg" className="mt-5 w-full" onClick={commit} disabled={!label.trim()}>
            {existing ? "Save type" : "Add type"}
          </Button>
          {existing && (
            <Button
              variant="dangerSoft"
              size="md"
              className="mt-2.5 w-full"
              onClick={() => setConfirmDelete(true)}
            >
              <IconTrash size={15} /> Delete this type
            </Button>
          )}
        </>
      )}
    </Sheet>
  );
}

/* ── One intensity zone ──────────────────────────────────────────────────── */
function ZoneSheet({
  cfg,
  index,
  onClose,
  onSave,
  onDelete,
}: {
  cfg: TrainingConfig;
  index: number | "new";
  onClose: () => void;
  onSave: (z: Zone, index: number | "new") => void;
  onDelete: (index: number) => void;
}) {
  const existing = index === "new" ? undefined : cfg.zones[index];
  const [label, setLabel] = useState(existing?.label ?? "");
  const [color, setColor] = useState(existing?.color ?? paletteColors[0]);

  const commit = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onSave(
      { key: existing?.key ?? keyFromLabel(trimmed, cfg.zones.map((z) => z.key)), label: trimmed, color },
      index,
    );
  };

  return (
    <Sheet title={existing ? `Edit ${existing.label}` : "New zone"} onClose={onClose}>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Name</div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="UT2, Easy, Race…"
        className={inputCls}
      />

      <div className={labelCls}>Colour</div>
      <ColorPicker value={color} onChange={setColor} />

      <Button size="lg" className="mt-5 w-full" onClick={commit} disabled={!label.trim()}>
        {existing ? "Save zone" : "Add zone"}
      </Button>
      {existing && (
        <Button
          variant="dangerSoft"
          size="md"
          className="mt-2.5 w-full"
          onClick={() => index !== "new" && onDelete(index)}
        >
          <IconTrash size={15} /> Delete this zone
        </Button>
      )}
    </Sheet>
  );
}

/* ── The favourite workouts for one type (and zone) ──────────────────────── */
function LibrarySheet({
  cfg,
  typeKey,
  zoneKey,
  onClose,
  onChange,
}: {
  cfg: TrainingConfig;
  typeKey: string;
  zoneKey?: string;
  onClose: () => void;
  onChange: (list: string[]) => void;
}) {
  const type = findType(cfg, typeKey);
  const zone = zoneKey ? cfg.zones.find((z) => z.key === zoneKey) : undefined;
  const list = cfg.library[libraryKey(typeKey, zoneKey)] ?? [];
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim();
    if (!t || list.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...list, t]);
    setDraft("");
  };
  const edit = (i: number, text: string) => onChange(list.map((w, n) => (n === i ? text : w)));
  const remove = (i: number) => onChange(list.filter((_, n) => n !== i));
  const shift = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <Sheet title={zone ? `${type.label} · ${zone.label}` : type.label} onClose={onClose}>
      <p className="text-[12px] leading-relaxed text-muted">
        These appear as tap-to-fill chips when you write a {zone ? `${zone.label.toLowerCase()} ` : ""}
        {type.label.toLowerCase()} session, in this order.
      </p>

      <div className="mt-3 space-y-2">
        {list.map((w, i) => (
          <div key={`${i}-${w}`} className="flex items-center gap-1.5">
            <input
              value={w}
              onChange={(e) => edit(i, e.target.value)}
              className={`${inputCls} py-2.5`}
            />
            <button
              type="button"
              onClick={() => shift(i, -1)}
              disabled={i === 0}
              aria-label="Move up"
              className="tap44 flex h-9 w-7 items-center justify-center text-muted disabled:opacity-25"
            >
              <IconChevronUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => shift(i, 1)}
              disabled={i === list.length - 1}
              aria-label="Move down"
              className="tap44 flex h-9 w-7 items-center justify-center text-muted disabled:opacity-25"
            >
              <IconChevronDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove"
              className="tap44 flex h-9 w-7 items-center justify-center text-danger"
            >
              <IconTrash size={14} />
            </button>
          </div>
        ))}
        {list.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-3.5 py-4 text-center text-[12px] text-muted">
            Nothing saved yet. Add the sessions you write most often.
          </p>
        )}
      </div>

      <div className="mt-3 flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a workout…"
          className={`${inputCls} py-2.5`}
        />
        <Button size="md" onClick={add} disabled={!draft.trim()}>
          <IconPlus size={15} />
        </Button>
      </div>
    </Sheet>
  );
}

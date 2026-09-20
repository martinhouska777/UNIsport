"use client";

/*
  TRAINING SETTINGS — the screen where a coach makes the plan builder their own.
  ---------------------------------------------------------------------------
  Everything the builder used to have hardcoded is edited here:

    1. SESSION TYPES  — the words on the buttons at the top of the session
                        editor. Name, colour, and one rule: does it ask for an
                        intensity. Only Water needs a lineup — a fact of rowing,
                        not a setting (owner, 2026-09-18).
    2. INTENSITY ZONES— UT2 / UT1 / Hard, and any the coach adds.
    3. BOATS          — what Add Boat offers on the Lineup tab.
    4. WORKOUT LIBRARY— the "Most used · tap to fill" chips. This is the coach's
                        own list of favourite workouts, per type and zone.
    5. SESSION TIMES  — when the morning and afternoon sessions usually start.

  ROWING ONLY, AND NO EXPLAINING (owner, 2026-09-18): the sport picker, every
  grey hint line, the per-row rule summaries, the crew sizes ("every coach
  knows what a 4+ is") and all the up/down arrows are gone. The presets for
  other sports still live in trainingConfig.ts; nothing on screen offers them.
  A list keeps the order its items were added in.

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
  IconChevronRight,
  IconPlus,
  IconTrash,
} from "@/components/icons";
import type { Membership } from "@/lib/varsity/membership";
import { fetchTrainingConfig, saveTrainingConfig } from "@/lib/varsity/configStore";
import { applyTeamColors, cacheTeamColors, teamColorMap } from "@/lib/varsity/teamColors";
import { fetchPlan } from "@/lib/varsity/planStore";
import {
  defaultConfig,
  findType,
  keyFromLabel,
  libraryKey,
  paletteColors,
  periods,
  type SessionType,
  type TrainingConfig,
  type Zone,
} from "@/lib/varsity/trainingConfig";
import type { BoatKind } from "@/lib/varsity/coachLineup";

/* ── small shared pieces ─────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border px-3.5 py-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</h2>
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

/* One tappable row of a list. */
function ListRow({ children, onOpen }: { children: React.ReactNode; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2.5 border-b border-border py-3 text-left last:border-0"
    >
      {children}
      <IconChevronRight size={16} />
    </button>
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
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`mt-2 flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left ${
        on ? "border-primary bg-primary-tint" : "border-border bg-surface"
      }`}
    >
      <span
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
          on ? "border-primary bg-primary-live text-primary-contrast" : "border-border"
        }`}
      >
        {on && <IconCheck size={12} />}
      </span>
      <span className="text-[13px] font-semibold text-text">{label}</span>
    </button>
  );
}

/* ── which editor is open ────────────────────────────────────────────────── */
type Editing =
  | null
  | { kind: "type"; index: number | "new" }
  | { kind: "zone"; index: number | "new" }
  | { kind: "boat"; index: number | "new" }
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

  const save = useCallback(async () => {
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
    // The squad sees the new colours too (lib/varsity/teamColors.ts).
    const map = teamColorMap(cfg);
    applyTeamColors(map);
    if (teamId) cacheTeamColors(teamId, map);
  }, [teamId, cfg]);

  /*
    AUTOSAVE — the same rule as the Plan and Lineup tabs: the coach's work
    saves itself, and there is no Save button anywhere in the console. A short
    pause after the last change, so renaming a session type isn't one write per
    keystroke.
  */
  useEffect(() => {
    if (loading || !dirty || saving) return;
    const t = window.setTimeout(() => void save(), 700);
    return () => window.clearTimeout(t);
  }, [loading, dirty, saving, save]);

  /* "Saved for the squad." is worth showing, but not worth keeping on screen —
     it steps out of the way a couple of seconds after it lands. */
  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 2200);
    return () => window.clearTimeout(t);
  }, [saved]);

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
      <Section title="Session types">
        <div className="rounded-xl border border-border bg-surface px-3.5">
          {cfg.types.map((t, i) => (
            <ListRow key={t.key} onOpen={() => setEditing({ kind: "type", index: i })}>
              <Dot color={t.color} />
              <span className="flex-1 text-[14px] font-semibold text-text">{t.label}</span>
            </ListRow>
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

      <Section title="Intensity zones">
        {cfg.zones.length > 0 && (
          <div className="rounded-xl border border-border bg-surface px-3.5">
            {cfg.zones.map((z, i) => (
              <ListRow key={z.key} onOpen={() => setEditing({ kind: "zone", index: i })}>
                <Dot color={z.color} />
                <span className="flex-1 text-[14px] font-semibold text-text">{z.label}</span>
              </ListRow>
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

      {/*
        BOATS. The four sweep riggings were hardcoded until the owner said the
        obvious thing about them: "this is just a preset" (2026-09-17). A squad
        with a quad, a single or a coxed pair adds it here and it appears on the
        Lineup tab's Add Boat row, on the same footing as the four.
      */}
      <Section title="Boats">
        {cfg.boats.length > 0 && (
          <div className="rounded-xl border border-border bg-surface px-3.5">
            {cfg.boats.map((b, i) => (
              <ListRow key={b.key} onOpen={() => setEditing({ kind: "boat", index: i })}>
                <span className="w-8 flex-shrink-0 text-[14px] font-semibold text-text">{b.symbol}</span>
                <span className="flex-1 text-[14px] text-text">{b.name}</span>
              </ListRow>
            ))}
          </div>
        )}
        <Button
          variant="secondary"
          size="md"
          className="mt-2.5 w-full"
          onClick={() => setEditing({ kind: "boat", index: "new" })}
        >
          <IconPlus size={15} /> Add a boat
        </Button>
      </Section>

      <Section title="Workout library">
        <div className="rounded-xl border border-border bg-surface px-3.5">
          {libraryRows.map(({ type, zone }) => (
            <ListRow
              key={`${type.key}:${zone?.key ?? ""}`}
              onOpen={() => setEditing({ kind: "library", typeKey: type.key, zoneKey: zone?.key })}
            >
              <Dot color={zone?.color ?? type.color} />
              <span className="flex-1 text-[14px] text-text">
                {type.label}
                {zone && <span className="text-muted"> · {zone.label}</span>}
              </span>
            </ListRow>
          ))}
        </div>
      </Section>

      <Section title="Session times">
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

      {/* The save line — never a button, and only on screen while it has
          something to say. Retry is the exception: a save that failed is the
          one moment the coach can do something about it. */}
      {(dirty || saving || saved || error) && (
        <div className="fixed inset-x-0 bottom-[76px] z-20 px-3.5 lg:bottom-5 lg:left-56">
          <div className="mx-auto flex max-w-screen-sm items-center gap-2.5 rounded-2xl border border-border bg-surface p-3 shadow-lg">
            <span className="flex-1 px-1 text-[12px] text-muted">
              {error ? (
                <span className="text-danger">Not saved — {error}</span>
              ) : saved ? (
                "Saved for the squad."
              ) : (
                "Saving…"
              )}
            </span>
            {error && (
              <Button size="md" onClick={() => void save()} disabled={saving}>
                Retry
              </Button>
            )}
          </div>
        </div>
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
      {editing?.kind === "boat" && (
        <BoatSheet
          cfg={cfg}
          index={editing.index}
          onClose={() => setEditing(null)}
          onSave={(b, index) => {
            update((c) => ({
              ...c,
              boats: index === "new" ? [...c.boats, b] : c.boats.map((x, i) => (i === index ? b : x)),
            }));
            setEditing(null);
          }}
          onDelete={(index) => {
            update((c) => ({ ...c, boats: c.boats.filter((_, i) => i !== index) }));
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
        // Unused — a board is chosen per session in the plan (configCanBoard).
        canBoard: existing?.canBoard ?? false,
        // Only Water is crewed — not a setting, so not on screen.
        needsLineup: existing?.key === "water",
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
            placeholder="Bike, Triathlon…"
            className={inputCls}
          />

          <div className={labelCls}>Colour</div>
          <ColorPicker value={color} onChange={setColor} />

          <div className={labelCls}>Rules</div>
          <Toggle label="Asks for an intensity" on={hasZones} onChange={setHasZones} />

          <Button size="lg" className="mt-5 w-full" onClick={commit} disabled={!label.trim()}>
            {existing ? "Done" : "Add type"}
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
        {existing ? "Done" : "Add zone"}
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

/* ── One rigging ─────────────────────────────────────────────────────────── */
function BoatSheet({
  cfg,
  index,
  onClose,
  onSave,
  onDelete,
}: {
  cfg: TrainingConfig;
  index: number | "new";
  onClose: () => void;
  onSave: (b: BoatKind, index: number | "new") => void;
  onDelete: (index: number) => void;
}) {
  const existing = index === "new" ? undefined : cfg.boats[index];
  const [symbol, setSymbol] = useState(existing?.symbol ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [rowers, setRowers] = useState(existing?.rowers ?? 4);
  const [cox, setCox] = useState(existing?.cox ?? false);

  const commit = () => {
    const sym = symbol.trim();
    if (!sym || rowers < 1) return;
    onSave(
      {
        // The key is what every saved boat carries as its badge, so an existing
        // rigging keeps its own for ever — only a new one gets one made.
        key: existing?.key ?? keyFromLabel(sym, cfg.boats.map((b) => b.key)),
        symbol: sym,
        name: name.trim() || sym,
        rowers,
        cox,
      },
      index,
    );
  };

  return (
    <Sheet title={existing ? `Edit ${existing.symbol}` : "New boat"} onClose={onClose}>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Written on the boat
      </div>
      <input
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        placeholder="8+, 4−, 2x, 1x…"
        className={inputCls}
      />

      <div className={labelCls}>Name</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Eight, Quad, Single…"
        className={inputCls}
      />

      <div className={labelCls}>Seats</div>
      <div className="flex items-center gap-2">
        {[1, 2, 4, 8].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRowers(n)}
            className={`h-11 flex-1 rounded-xl border text-[14px] font-semibold ${
              rowers === n ? "border-primary bg-primary-tint text-text" : "border-border bg-surface text-muted"
            }`}
          >
            {n}
          </button>
        ))}
        {/* Anything else — a six, or whatever a squad has — typed in. */}
        <input
          value={[1, 2, 4, 8].includes(rowers) ? "" : String(rowers)}
          onChange={(e) => setRowers(Math.max(0, Math.min(12, Number(e.target.value.replace(/\D/g, "")) || 0)))}
          inputMode="numeric"
          aria-label="Other number of seats"
          placeholder="…"
          className="h-11 w-14 rounded-xl border border-border bg-surface-2 text-center text-base text-text outline-none focus:border-primary placeholder:text-muted"
        />
      </div>

      <Toggle label="Has a cox" on={cox} onChange={setCox} />

      <Button size="lg" className="mt-5 w-full" onClick={commit} disabled={!symbol.trim() || rowers < 1}>
        {existing ? "Done" : "Add boat"}
      </Button>
      {existing && (
        <Button
          variant="dangerSoft"
          size="md"
          className="mt-2.5 w-full"
          onClick={() => index !== "new" && onDelete(index)}
        >
          <IconTrash size={15} /> Delete this boat
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

  return (
    <Sheet title={zone ? `${type.label} · ${zone.label}` : type.label} onClose={onClose}>
      <div className="space-y-2">
        {list.map((w, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              value={w}
              onChange={(e) => edit(i, e.target.value)}
              className={`${inputCls} py-2.5`}
            />
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

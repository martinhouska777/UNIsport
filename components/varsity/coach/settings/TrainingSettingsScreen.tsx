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
import { Toggle as Switch } from "@/components/onboarding/controls";
import { Group, Row, RowFrame, SettingsBody } from "@/components/settings/SettingsShell";
import SettingsHeader from "@/components/varsity/coach/settings/SettingsHeader";
import type { ProfileSaveState } from "@/components/profile/useProfileData";
import { IconPlus, IconTrash } from "@/components/icons";
import type { Membership } from "@/lib/varsity/membership";
import { fetchTrainingConfigResult, saveTrainingConfig } from "@/lib/varsity/configStore";
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
import { markColor } from "@/lib/colorMarks";

/* ── small shared pieces ─────────────────────────────────────────────────── */

function Dot({ color }: { color: string }) {
  return <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: markColor(color) }} />;
}

const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-base text-text outline-none focus:border-primary placeholder:text-faint";
const labelCls = "mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted";

/* The last row of a list's card: "+ Add a type", in the school colour — the
   way WhatsApp ends a list with its add row, rather than a grey button under
   the card. */
function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-stretch text-left transition-colors active:bg-surface-2"
    >
      <RowFrame
        icon={
          <span className="text-primary">
            <IconPlus size={20} />
          </span>
        }
      >
        <span className="flex-1 text-[15px] font-medium text-primary">{label}</span>
      </RowFrame>
    </button>
  );
}

/*
  The grey swatch. It was var(--muted), which turned black when the app's grey
  words did (2026-09-30: muted now equals the text colour), so the picker
  offered a black dot and no grey at all. A colour saved before then still
  reads as this swatch.
*/
const GREY = "var(--faint)";
const sameSwatch = (value: string, swatch: string) =>
  value === swatch || (swatch === GREY && value === "var(--muted)");

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
            sameSwatch(value, c) ? "border-primary" : "border-border"
          }`}
        >
          <span className="h-5 w-5 rounded-full" style={{ background: c }} />
        </button>
      ))}
    </div>
  );
}

/* A yes/no inside an editor sheet: the label and the app's own switch, in a
   card — the same switch every Settings page uses (it was a tick box tinted
   in the school colour). */
function SwitchCard({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="mt-2 flex min-h-[52px] items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5">
      <span className="flex-1 text-[15px] text-text">{label}</span>
      <Switch on={on} onChange={() => onChange(!on)} ariaLabel={label} />
    </div>
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
  // The settings never arrived — see the load below.
  const [loadFailed, setLoadFailed] = useState(false);
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
      const [loaded, plan] = await Promise.all([fetchTrainingConfigResult(teamId), fetchPlan()]);
      if (!active) return;
      /*
        A FAILED READ IS NOT "this squad uses the defaults". The two look
        identical from here, and saving the defaults back would replace the
        team's real vocabulary with the shipped one — so when the read failed
        the screen says so and refuses to write (same trap as the plan).
      */
      setLoadFailed(loaded.failed);
      setCfg(loaded.config);
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
    // Never write settings on top of settings we failed to read.
    if (loadFailed) return;
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
  }, [teamId, cfg, loadFailed]);

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

  /* "Saved ✓" in the title bar is worth showing, but not worth keeping on
     screen — it steps out of the way a couple of seconds after it lands. */
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

  // The save line in the title bar, like every other Settings page. "Saving…"
  // covers the short pause before an autosave, too.
  const saveState: ProfileSaveState = error ? "error" : saving || dirty ? "saving" : saved ? "saved" : "idle";
  const header = <SettingsHeader title="Training settings" saveState={saveState} />;

  if (loading) {
    return (
      <>
        {header}
        <p className="px-4 py-16 text-center text-sm text-muted">Loading your settings…</p>
      </>
    );
  }

  /*
    Showing the shipped defaults here would be a lie that overwrites the truth:
    this screen autosaves, so one tap would replace the squad's own vocabulary
    with the factory one. Say what happened instead.
  */
  if (loadFailed) {
    return (
      <>
        {header}
        <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
          <div className="mt-2 rounded-2xl border border-danger-line bg-danger-tint px-5 py-10 text-center">
            <div className="text-[14px] font-semibold text-text">Couldn&apos;t load your settings</div>
            <p className="mx-auto mt-1 max-w-[18rem] text-[12px] text-muted">
              Your squad&apos;s session types and boats are safe — this screen
              couldn&apos;t reach them, so it won&apos;t change anything until it can.
            </p>
            <Button size="md" onClick={() => window.location.reload()} className="mt-5">
              Try again
            </Button>
          </div>
        </div>
      </>
    );
  }

  /*
    Round 2's look (owner, 2026-09-30: "like WhatsApp or Instagram"): each list
    is one white card, rows split by a hairline, and the card ends with its own
    "+ Add" row. A list keeps the order its items were added in.
  */
  return (
    <>
      {header}
      <SettingsBody>
        <Group title="Session types">
          {cfg.types.map((t, i) => (
            <Row
              key={t.key}
              icon={<Dot color={t.color} />}
              label={t.label}
              onClick={() => setEditing({ kind: "type", index: i })}
            />
          ))}
          <AddRow label="Add a type" onClick={() => setEditing({ kind: "type", index: "new" })} />
        </Group>

        <Group title="Intensity zones">
          {cfg.zones.map((z, i) => (
            <Row
              key={z.key}
              icon={<Dot color={z.color} />}
              label={z.label}
              onClick={() => setEditing({ kind: "zone", index: i })}
            />
          ))}
          <AddRow label="Add a zone" onClick={() => setEditing({ kind: "zone", index: "new" })} />
        </Group>

        {/*
          BOATS. The four sweep riggings were hardcoded until the owner said the
          obvious thing about them: "this is just a preset" (2026-09-17). A squad
          with a quad, a single or a coxed pair adds it here and it appears on the
          Lineup tab's Add Boat row, on the same footing as the four.
        */}
        <Group title="Boats">
          {cfg.boats.map((b, i) => (
            <Row
              key={b.key}
              icon={<span className="text-[15px] font-semibold">{b.symbol}</span>}
              label={b.name}
              onClick={() => setEditing({ kind: "boat", index: i })}
            />
          ))}
          <AddRow label="Add a boat" onClick={() => setEditing({ kind: "boat", index: "new" })} />
        </Group>

        <Group title="Workout library">
          {libraryRows.map(({ type, zone }) => (
            <Row
              key={`${type.key}:${zone?.key ?? ""}`}
              icon={<Dot color={zone?.color ?? type.color} />}
              label={zone ? `${type.label} · ${zone.label}` : type.label}
              onClick={() => setEditing({ kind: "library", typeKey: type.key, zoneKey: zone?.key })}
            />
          ))}
        </Group>

        <Group title="Session times">
          {periods.map((p) => (
            <label key={p} className="flex w-full items-stretch">
              <RowFrame>
                <span className="flex-1 text-[15px] text-text">{p}</span>
                <input
                  value={cfg.times[p]}
                  onChange={(e) =>
                    update((c) => ({ ...c, times: { ...c.times, [p]: e.target.value } }))
                  }
                  /* text-base so phones don't zoom the page on focus */
                  className="w-28 rounded-lg border border-border bg-surface-2 px-3 py-2 text-right text-base text-text outline-none focus:border-primary"
                />
              </RowFrame>
            </label>
          ))}
        </Group>
      </SettingsBody>

      {/* A save that failed — the one moment the coach can do something about
          it, so it gets a card with Retry. "Saving…" and "Saved ✓" sit in the
          title bar. */}
      {error && (
        <div className="fixed inset-x-0 bottom-[76px] z-20 px-3.5 lg:bottom-5 lg:left-56">
          <div className="mx-auto flex max-w-screen-sm items-center gap-2.5 rounded-2xl border border-danger-line bg-surface p-3 shadow-lg">
            <span className="flex-1 px-1 text-[12px] text-danger">Not saved — {error}</span>
            <Button size="md" onClick={() => void save()} disabled={saving}>
              Retry
            </Button>
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
    </>
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
            className={inputCls}
          />

          <div className={labelCls}>Colour</div>
          <ColorPicker value={color} onChange={setColor} />

          <div className={labelCls}>Rules</div>
          <SwitchCard label="Asks for an intensity" on={hasZones} onChange={setHasZones} />

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
        className={inputCls}
      />

      <div className={labelCls}>Name</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
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
          className="h-11 w-14 rounded-xl border border-border bg-surface-2 text-center text-base text-text outline-none focus:border-primary placeholder:text-faint"
        />
      </div>

      <SwitchCard label="Has a cox" on={cox} onChange={setCox} />

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

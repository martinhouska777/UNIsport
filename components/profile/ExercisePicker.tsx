"use client";

/*
  EXERCISE PICKER — the Hevy-style library used by the gym logger. Full-screen
  over the Log editor (z above it). Search by name/muscle/equipment, filter by a
  muscle chip, tap an exercise to add it. If your search doesn't match anything
  in the catalog, you can add it as a custom exercise. All colors are theme
  tokens (rule 1); inputs stay text-base so phones don't auto-zoom.
*/
import { useEffect, useState } from "react";
import {
  searchExercises,
  muscleGroups,
  type CatalogExercise,
  type MuscleGroup,
} from "@/lib/exercises";
import { IconArrowLeft, IconSearch, IconPlus } from "@/components/icons";

export default function ExercisePicker({
  onPick,
  onClose,
}: {
  // Picks a catalog exercise, or a custom one (muscle null) when typed by hand.
  onPick: (e: { name: string; muscle: MuscleGroup | null }) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = searchExercises(query, muscle);
  const typed = query.trim();
  // Offer "add custom" only when the typed name isn't already an exact match.
  const showCustom =
    typed.length > 0 && !results.some((r) => r.name.toLowerCase() === typed.toLowerCase());

  const pickCatalog = (e: CatalogExercise) => onPick({ name: e.name, muscle: e.muscle });

  // The results in their own order, gathered under each muscle as it first appears.
  const groups: { muscle: MuscleGroup; items: CatalogExercise[] }[] = [];
  for (const r of results) {
    const g = groups.find((x) => x.muscle === r.muscle);
    if (g) g.items.push(r);
    else groups.push({ muscle: r.muscle, items: [r] });
  }

  return (
    <div className="fixed inset-0 z-[60] flex h-dvh flex-col bg-background">
      {/* Header — the round back button, as on the Log editor under it. */}
      <div className="flex flex-shrink-0 items-center gap-2.5 bg-surface px-3.5 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel"
          className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-text"
        >
          <IconArrowLeft size={16} />
        </button>
        <h1 className="text-base font-semibold text-text">Add exercise</h1>
      </div>

      {/* Search + muscle filter */}
      <div className="flex-shrink-0 border-b border-border bg-surface px-4 pb-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-transparent bg-surface-2 px-3 focus-within:border-primary">
          <IconSearch size={15} className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            className="w-full bg-transparent py-2.5 text-base text-text outline-none placeholder:text-faint"
          />
        </div>
        <div className="mt-2 chip-row flex gap-1.5 overflow-x-auto pb-1">
          <FilterChip label="All" active={muscle === null} onClick={() => setMuscle(null)} />
          {muscleGroups.map((m) => (
            <FilterChip key={m} label={m} active={muscle === m} onClick={() => setMuscle(m)} />
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <div className="mx-auto w-full max-w-screen-sm">
          {showCustom && (
            <button
              type="button"
              onClick={() => onPick({ name: typed, muscle })}
              className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary-line bg-surface px-3.5 py-3 text-left active:bg-surface-2"
            >
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-text">
                Add “{typed}”{muscle ? ` · ${muscle}` : ""}
              </span>
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
                <IconPlus size={16} />
              </span>
            </button>
          )}

          {results.length === 0 && !showCustom ? (
            <div className="py-10 text-center text-[12px] text-muted">No exercises found.</div>
          ) : (
            /* Grouped under their muscle, one white card each — the heading
               says "Chest" once instead of a "Che" tile on every row. */
            groups.map((g) => (
              <section key={g.muscle} className="mb-4">
                <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {g.muscle}
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                  {g.items.map((e) => (
                    <button
                      key={e.name}
                      type="button"
                      onClick={() => pickCatalog(e)}
                      className="flex min-h-[52px] w-full items-center gap-3 border-b border-border px-3.5 py-2 text-left last:border-b-0 active:bg-surface-2"
                    >
                      {/* Just the name — no "Barbell" / "Machine" under it
                          (owner, 2026-09-27). Search still finds by it. */}
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-text">{e.name}</span>
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
                        <IconPlus size={16} />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap44 flex-shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium ${
        active ? "border-primary bg-primary-tint text-primary" : "border-border bg-surface text-muted"
      }`}
    >
      {label}
    </button>
  );
}

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

  return (
    <div className="fixed inset-0 z-[60] flex h-dvh flex-col bg-background">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-3">
        <button type="button" onClick={onClose} className="flex items-center gap-1 text-[13px] text-muted">
          <IconArrowLeft size={18} /> Cancel
        </button>
        <span className="ml-1 text-[15px] font-semibold text-text">Add exercise</span>
      </div>

      {/* Search + muscle filter */}
      <div className="flex-shrink-0 border-b border-border bg-surface px-4 pb-2.5 pt-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3">
          <IconSearch size={15} className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            className="w-full bg-transparent py-2.5 text-base text-text outline-none placeholder:text-muted"
          />
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          <FilterChip label="All" active={muscle === null} onClick={() => setMuscle(null)} />
          {muscleGroups.map((m) => (
            <FilterChip key={m} label={m} active={muscle === m} onClick={() => setMuscle(m)} />
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mx-auto w-full max-w-screen-sm">
          {showCustom && (
            <button
              type="button"
              onClick={() => onPick({ name: typed, muscle })}
              className="mb-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/[0.06] px-3.5 py-3 text-left"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <IconPlus size={16} />
              </span>
              <span className="text-[13px] font-medium text-text">
                Add “{typed}”{muscle ? ` · ${muscle}` : ""}
              </span>
            </button>
          )}

          {results.length === 0 && !showCustom ? (
            <div className="py-10 text-center text-[12px] text-muted">No exercises found.</div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {results.map((e) => (
                <button
                  key={e.name}
                  type="button"
                  onClick={() => pickCatalog(e)}
                  className="flex items-center gap-3 py-2.5 text-left active:bg-surface-2"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[10px] font-semibold text-muted">
                    {e.muscle.slice(0, 3)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-text">{e.name}</span>
                    <span className="block text-[11px] text-muted">
                      {e.muscle} · {e.equipment}
                    </span>
                  </span>
                  <IconPlus size={16} className="flex-shrink-0 text-primary" />
                </button>
              ))}
            </div>
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
      className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium ${
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted"
      }`}
    >
      {label}
    </button>
  );
}

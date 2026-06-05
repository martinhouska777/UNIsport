"use client";

/*
  LOG SESSION editor — create or edit one workout log.

  A full-screen overlay (rendered inside the app's themed tree, so theme tokens
  apply — same approach as SessionSheet, no portal). Captures the date, activity,
  optional gym + partner, a structured list of exercises (name / sets / reps /
  weight), and a note. Saves through lib/supabase/workouts.ts. All colors are
  theme tokens (rule 1); inputs stay text-base so phones don't auto-zoom.
*/
import { useEffect, useRef, useState } from "react";
import { primaryActivities, cardioTypes, verifiedGyms } from "@/lib/onboarding";
import {
  saveWorkout,
  updateWorkout,
  type DistanceUnit,
  type WeightUnit,
  type WorkoutDraft,
  type WorkoutExercise,
  type WorkoutSet,
  type WorkoutLog,
} from "@/lib/supabase/workouts";
import ExercisePicker from "@/components/profile/ExercisePicker";
import { fileToDataUrl } from "@/lib/image";
import { IconArrowLeft, IconCheck, IconPlus, IconTrash, IconX } from "@/components/icons";

const todayIso = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // local date, not UTC
  return d.toISOString().slice(0, 10);
};

const emptySet = (): WorkoutSet => ({ weight: "", reps: "" });

// Tapping a set's number cycles its type: Normal → Warmup → Drop → Failure → …
const SET_TYPE_CYCLE: (SetType | undefined)[] = [undefined, "W", "D", "F"];
const SET_TYPE_LABEL: Record<SetType, string> = { W: "W", N: "N", D: "D", F: "F" };
type SetType = NonNullable<WorkoutSet["type"]>;

export default function LogSessionSheet({
  userId,
  existing,
  initialDate,
  onClose,
  onSaved,
}: {
  userId: string;
  existing?: WorkoutLog;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(existing?.date ?? initialDate ?? todayIso());
  const [activity, setActivity] = useState(existing?.activity ?? "gym");
  const [gym, setGym] = useState(existing?.gym ?? "");
  const [partner, setPartner] = useState(existing?.partner ?? "");
  const [exercises, setExercises] = useState<WorkoutExercise[]>(existing?.exercises ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Weight unit for the gym sets (kg / lb), per workout.
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(existing?.metrics.weightUnit ?? "kg");
  // Running / cardio metrics.
  const [cardioType, setCardioType] = useState(existing?.metrics.cardioType ?? "");
  const [distance, setDistance] = useState(existing?.metrics.distance ?? "");
  const [unit, setUnit] = useState<DistanceUnit>(existing?.metrics.unit ?? "km");
  const [duration, setDuration] = useState(existing?.metrics.duration ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRunning = activity === "running";
  const isCardio = activity === "cardio";
  const usesExercises = !isRunning && !isCardio; // gym / other
  // Running uses km/mi; cardio also allows metres (rowing, swimming).
  const unitOptions: DistanceUnit[] = isCardio ? ["km", "mi", "m"] : ["km", "mi"];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const removeExercise = (i: number) =>
    setExercises((prev) => prev.filter((_, idx) => idx !== i));

  // Add a picked exercise (from the catalog, or a custom name) with one blank set.
  const addExercise = (e: { name: string; muscle: string | null }) => {
    setExercises((prev) => [
      ...prev,
      { name: e.name, ...(e.muscle ? { muscle: e.muscle } : {}), sets: [emptySet()] },
    ]);
    setPickerOpen(false);
  };

  // ── Per-set editing ──
  const patchSet = (i: number, j: number, patch: Partial<WorkoutSet>) =>
    setExercises((prev) =>
      prev.map((e, idx) =>
        idx === i ? { ...e, sets: e.sets.map((s, sj) => (sj === j ? { ...s, ...patch } : s)) } : e,
      ),
    );
  // New set carries the previous set's weight + reps forward (Hevy convenience).
  const addSet = (i: number) =>
    setExercises((prev) =>
      prev.map((e, idx) => {
        if (idx !== i) return e;
        const last = e.sets[e.sets.length - 1];
        const seed: WorkoutSet = last ? { weight: last.weight, reps: last.reps } : emptySet();
        return { ...e, sets: [...e.sets, seed] };
      }),
    );
  const removeSet = (i: number, j: number) =>
    setExercises((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, sets: e.sets.filter((_, sj) => sj !== j) } : e)),
    );
  const cycleSetType = (i: number, j: number, current: SetType | undefined) => {
    const next = SET_TYPE_CYCLE[(SET_TYPE_CYCLE.indexOf(current ?? undefined) + 1) % SET_TYPE_CYCLE.length];
    patchSet(i, j, { type: next });
  };

  // Photos ("memories"): downscale each picked image to a data URL (same as the
  // profile gallery), append; the corner X removes one.
  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setPhotoBusy(true);
    const added: string[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        added.push(await fileToDataUrl(f));
      } catch {
        // skip anything that won't decode
      }
    }
    setPhotoBusy(false);
    if (added.length) setPhotos((prev) => [...prev, ...added]);
  };
  const removePhoto = (i: number) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!date || busy) return;
    setBusy(true);
    setError(null);
    const draft: WorkoutDraft = {
      date,
      activity,
      gym,
      partner,
      exercises,
      metrics: { cardioType, distance, unit, duration, weightUnit },
      photos,
      note,
    };
    const res = existing
      ? await updateWorkout(userId, existing.id, draft)
      : await saveWorkout(userId, draft);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onSaved();
  };

  const inputCls =
    "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-base text-text outline-none focus:border-primary placeholder:text-muted";
  const labelCls = "mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted";

  return (
    <div className="fixed inset-0 z-50 flex h-dvh flex-col bg-background">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-3">
        <button type="button" onClick={onClose} className="flex items-center gap-1 text-[13px] text-muted">
          <IconArrowLeft size={18} /> Cancel
        </button>
        <span className="ml-1 text-[15px] font-semibold text-text">
          {existing ? "Edit session" : "Log session"}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <div className="mx-auto w-full max-w-screen-sm">
          <div className={labelCls}>Date</div>
          <input
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />

          <div className={`${labelCls} mt-4`}>Activity</div>
          <div className="grid grid-cols-4 gap-1.5">
            {primaryActivities.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setActivity(a.key)}
                className={`rounded-xl border py-2.5 text-[12px] font-semibold ${
                  activity === a.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-text"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className={`${labelCls} mt-4`}>
            {usesExercises ? "Gym (optional)" : "Where (optional)"}
          </div>
          <input
            list="gym-options"
            value={gym}
            onChange={(e) => setGym(e.target.value)}
            placeholder={isRunning ? "Route or area" : "Where did you train?"}
            className={inputCls}
          />
          <datalist id="gym-options">
            {verifiedGyms.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>

          <div className={`${labelCls} mt-4`}>Training partner (optional)</div>
          <input
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
            placeholder="Solo, or a name"
            className={inputCls}
          />

          {/* Exercises — gym / other (Hevy-style per-set logging) */}
          {usesExercises && (
            <>
              <div className="mt-5 flex items-center justify-between">
                <span className={labelCls.replace("mb-1.5", "mb-0")}>Exercises</span>
                {/* kg / lb toggle for this workout */}
                <div className="flex overflow-hidden rounded-lg border border-border">
                  {(["kg", "lb"] as WeightUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setWeightUnit(u)}
                      className={`px-2.5 py-1 text-[11px] font-semibold ${
                        weightUnit === u ? "bg-primary text-primary-contrast" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-3">
                {exercises.map((ex, i) => {
                  let normalNo = 0; // running number of "normal" sets within this exercise
                  return (
                    <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
                      {/* Exercise header */}
                      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold text-text">{ex.name}</div>
                          {ex.muscle && <div className="text-[11px] text-muted">{ex.muscle}</div>}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExercise(i)}
                          aria-label="Remove exercise"
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted hover:text-danger"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>

                      {/* Column header */}
                      <div className="flex items-center gap-2 px-3 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                        <span className="w-8 text-center">Set</span>
                        <span className="flex-1 text-center">{weightUnit}</span>
                        <span className="flex-1 text-center">Reps</span>
                        <span className="w-8 text-center" aria-hidden />
                        <span className="w-6" aria-hidden />
                      </div>

                      {/* Set rows */}
                      <div className="flex flex-col">
                        {ex.sets.map((s, j) => {
                          if (!s.type) normalNo += 1;
                          const setLabel = s.type ? SET_TYPE_LABEL[s.type] : String(normalNo);
                          const isWarm = s.type === "W";
                          return (
                            <div
                              key={j}
                              className={`flex items-center gap-2 px-3 py-1.5 ${
                                s.done ? "bg-primary/10" : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => cycleSetType(i, j, s.type)}
                                aria-label="Set type"
                                className={`h-8 w-8 flex-shrink-0 rounded-lg text-[12px] font-semibold ${
                                  s.type
                                    ? isWarm
                                      ? "bg-warn/20 text-warn"
                                      : "bg-accent/20 text-accent"
                                    : "bg-surface-2 text-text"
                                }`}
                              >
                                {setLabel}
                              </button>
                              <input
                                value={s.weight}
                                onChange={(e) => patchSet(i, j, { weight: e.target.value.replace(/[^\d.]/g, "") })}
                                inputMode="decimal"
                                placeholder="0"
                                className="w-full flex-1 rounded-lg border border-border bg-surface-2 px-2 py-2 text-center text-base text-text outline-none focus:border-primary"
                              />
                              <input
                                value={s.reps}
                                onChange={(e) => patchSet(i, j, { reps: e.target.value.replace(/[^\d]/g, "") })}
                                inputMode="numeric"
                                placeholder="0"
                                className="w-full flex-1 rounded-lg border border-border bg-surface-2 px-2 py-2 text-center text-base text-text outline-none focus:border-primary"
                              />
                              <button
                                type="button"
                                onClick={() => patchSet(i, j, { done: !s.done })}
                                aria-label={s.done ? "Mark set not done" : "Mark set done"}
                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                                  s.done ? "bg-primary text-primary-contrast" : "bg-surface-2 text-muted"
                                }`}
                              >
                                <IconCheck size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSet(i, j)}
                                aria-label="Remove set"
                                className="flex h-8 w-6 flex-shrink-0 items-center justify-center text-muted hover:text-danger"
                              >
                                <IconX size={13} />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add set */}
                      <button
                        type="button"
                        onClick={() => addSet(i)}
                        className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2.5 text-[12px] font-medium text-muted active:text-primary"
                      >
                        <IconPlus size={14} /> Add set
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface py-3 text-[13px] font-medium text-muted active:border-primary/40 active:text-primary"
              >
                <IconPlus size={15} /> Add exercise
              </button>
            </>
          )}

          {/* Cardio type — cardio only */}
          {isCardio && (
            <>
              <div className={`${labelCls} mt-5`}>Cardio type</div>
              <div className="flex flex-wrap gap-1.5">
                {cardioTypes.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCardioType(c)}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
                      cardioType === c
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface text-text"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Distance + duration — running / cardio */}
          {(isRunning || isCardio) && (
            <>
              <div className={`${labelCls} mt-5`}>Distance (optional)</div>
              <div className="flex items-center gap-1.5">
                <input
                  value={distance}
                  onChange={(e) => setDistance(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="e.g. 5.2"
                  className={`${inputCls} flex-1`}
                />
                <div className="flex overflow-hidden rounded-xl border border-border">
                  {unitOptions.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={`px-3 py-2.5 text-[12px] font-semibold ${
                        unit === u ? "bg-primary text-primary-contrast" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${labelCls} mt-4`}>Duration (optional)</div>
              <input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 45 min or 1:05:00"
                className={inputCls}
              />
            </>
          )}

          {/* Photos — "memories" from the session */}
          <div className="mt-5 flex items-center justify-between">
            <span className={labelCls.replace("mb-1.5", "mb-0")}>Photos (optional)</span>
            <span className="text-[10px] text-muted">memories from the session</span>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addPhotos(e.target.files);
              e.target.value = ""; // allow re-picking the same file
            }}
          />
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {photos.map((src, i) => (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-md border border-border bg-surface-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-text backdrop-blur hover:text-danger"
                >
                  <IconX size={11} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoBusy}
              aria-label="Add photo"
              className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border bg-surface text-muted disabled:opacity-50"
            >
              <IconPlus size={20} />
            </button>
          </div>

          <div className={`${labelCls} mt-5`}>Note (optional)</div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How did it go?"
            className={inputCls}
          />

          {error && <p className="mt-3 text-[12px] text-danger">Couldn’t save: {error}</p>}
        </div>
      </div>

      {/* Save bar */}
      <div className="flex-shrink-0 border-t border-border bg-surface px-4 pb-6 pt-3">
        <div className="mx-auto max-w-screen-sm">
          <button
            type="button"
            onClick={save}
            disabled={busy || !date}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-[14px] font-semibold text-primary-contrast disabled:opacity-40"
          >
            <IconCheck size={16} /> {busy ? "Saving…" : existing ? "Save changes" : "Save session"}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <ExercisePicker onPick={addExercise} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}

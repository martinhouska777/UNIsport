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
  type WorkoutDraft,
  type WorkoutExercise,
  type WorkoutLog,
} from "@/lib/supabase/workouts";
import { fileToDataUrl } from "@/lib/image";
import { IconArrowLeft, IconCheck, IconPlus, IconTrash, IconX } from "@/components/icons";

const todayIso = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // local date, not UTC
  return d.toISOString().slice(0, 10);
};

const emptyExercise = (): WorkoutExercise => ({ name: "", sets: "", reps: "", weight: "" });

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
  const [exercises, setExercises] = useState<WorkoutExercise[]>(
    existing?.exercises.length ? existing.exercises : [emptyExercise()],
  );
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

  const setExercise = (i: number, patch: Partial<WorkoutExercise>) =>
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const addExercise = () => setExercises((prev) => [...prev, emptyExercise()]);
  const removeExercise = (i: number) =>
    setExercises((prev) => (prev.length === 1 ? [emptyExercise()] : prev.filter((_, idx) => idx !== i)));

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
      metrics: { cardioType, distance, unit, duration },
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

          {/* Exercises — gym / other */}
          {usesExercises && (
            <>
              <div className="mt-5 flex items-center justify-between">
                <span className={labelCls.replace("mb-1.5", "mb-0")}>Exercises</span>
                <span className="text-[10px] text-muted">name · sets · reps · weight</span>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {exercises.map((ex, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      value={ex.name}
                      onChange={(e) => setExercise(i, { name: e.target.value })}
                      placeholder="Exercise"
                      className={`${inputCls} flex-1`}
                    />
                    <input
                      value={ex.sets}
                      onChange={(e) => setExercise(i, { sets: e.target.value.replace(/[^\d]/g, "") })}
                      inputMode="numeric"
                      placeholder="Sets"
                      className={`${inputCls} w-[56px] px-2 text-center`}
                    />
                    <input
                      value={ex.reps}
                      onChange={(e) => setExercise(i, { reps: e.target.value.replace(/[^\d]/g, "") })}
                      inputMode="numeric"
                      placeholder="Reps"
                      className={`${inputCls} w-[56px] px-2 text-center`}
                    />
                    <input
                      value={ex.weight}
                      onChange={(e) => setExercise(i, { weight: e.target.value })}
                      placeholder="Wt"
                      className={`${inputCls} w-[64px] px-2 text-center`}
                    />
                    <button
                      type="button"
                      onClick={() => removeExercise(i)}
                      aria-label="Remove exercise"
                      className="flex h-9 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted hover:text-danger"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addExercise}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface py-2.5 text-[13px] font-medium text-muted active:border-primary/40 active:text-primary"
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
    </div>
  );
}

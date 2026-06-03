"use client";

/*
  LOG SESSION editor — create or edit one workout log.

  A full-screen overlay (rendered inside the app's themed tree, so theme tokens
  apply — same approach as SessionSheet, no portal). Captures the date, activity,
  optional gym + partner, a structured list of exercises (name / sets / reps /
  weight), and a note. Saves through lib/supabase/workouts.ts. All colors are
  theme tokens (rule 1); inputs stay text-base so phones don't auto-zoom.
*/
import { useEffect, useState } from "react";
import { primaryActivities } from "@/lib/onboarding";
import { verifiedGyms } from "@/lib/onboarding";
import {
  saveWorkout,
  updateWorkout,
  type WorkoutDraft,
  type WorkoutExercise,
  type WorkoutLog,
} from "@/lib/supabase/workouts";
import { IconArrowLeft, IconCheck, IconPlus, IconTrash } from "@/components/icons";

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
  const [note, setNote] = useState(existing?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const save = async () => {
    if (!date || busy) return;
    setBusy(true);
    setError(null);
    const draft: WorkoutDraft = { date, activity, gym, partner, exercises, note };
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

          <div className={`${labelCls} mt-4`}>Gym (optional)</div>
          <input
            list="gym-options"
            value={gym}
            onChange={(e) => setGym(e.target.value)}
            placeholder="Where did you train?"
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

          {/* Exercises */}
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

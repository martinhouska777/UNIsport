"use client";

/*
  LOG SESSION editor — create or edit one workout log.

  A full-screen overlay (rendered inside the app's themed tree, so theme tokens
  apply — same approach as SessionSheet, no portal). Captures the date, activity,
  optional gym + partner, what was trained, and a note.

  TWO WAYS TO LOG A GYM SESSION, and the quick one comes first: tap the body
  parts you hit and you are done — "Legs" is a leg day and counts as a full
  session. Under it is the written-out version (exercises, sets, reps, weight)
  for the days that are worth recording properly.

  Saves through lib/supabase/workouts.ts. All colors are theme tokens (rule 1);
  inputs stay text-base so phones don't auto-zoom.
*/
import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { primaryActivities, cardioTypes, verifiedGyms } from "@/lib/onboarding";
import {
  partnerStatusLine,
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
import { muscleGroups } from "@/lib/exercises";
import PartnerPicker from "@/components/profile/PartnerPicker";
import Avatar from "@/components/messages/Avatar";
import GymCheckInPrompt from "@/components/gyms/GymCheckInPrompt";
import { getGymByName } from "@/lib/gyms";
import { fileToDataUrl } from "@/lib/image";
import { notifyPartnerTag } from "@/lib/push/client";
import { confirmPlan } from "@/lib/supabase/sessionPlans";
import { PARTNER_CONFIRM_HOURS, sessionPoints } from "@/lib/points";
import { IconArrowLeft, IconCheck, IconChevronRight, IconPlus, IconTrash, IconX } from "@/components/icons";
import Segmented from "@/components/ui/Segmented";

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

/* One line of a details card: the name on the left, the answer on the right.
   A <label>, so a tap anywhere on the line lands in its field. */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-h-[52px] items-center gap-3 border-b border-border px-3.5 last:border-b-0">
      <span className="w-20 flex-shrink-0 text-[14px] font-medium text-text">{label}</span>
      <span className="flex min-w-0 flex-1 items-center justify-end">{children}</span>
    </label>
  );
}

export default function LogSessionSheet({
  userId,
  existing,
  initialDate,
  initialGym,
  initialActivity,
  initialPartner,
  plan,
  onClose,
  onSaved,
}: {
  userId: string;
  existing?: WorkoutLog;
  initialDate?: string;
  /** Prefilled by the log reminder's deep link — the person's usual gym. */
  initialGym?: string;
  initialActivity?: string;
  initialPartner?: { name: string; id: string };
  /*
    LOGGING A PLANNED SESSION (owner, 2026-09-27): "when you accept you can log
    it, and once the partner accepts you will have the partner there — you need
    to say what you did as well". "Yes, we trained" on the plan opens this sheet
    with the plan's day, activity, place and partner filled in. Saving writes
    YOUR session (plan_id set, partner pending) and then answers yes on the plan
    — saving IS the yes; closing without saving answers nothing. The partner is
    the plan's, so it can't be changed here; when they say yes too, plan_confirm
    confirms both people's sessions.
  */
  plan?: { planId: string; conversationId: string; scheduledAt: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(existing?.date ?? initialDate ?? todayIso());
  const [activity, setActivity] = useState(existing?.activity ?? initialActivity ?? "gym");
  const [gym, setGym] = useState(existing?.gym ?? initialGym ?? "");
  const [partner, setPartner] = useState(existing?.partner ?? initialPartner?.name ?? "");
  const [partnerId, setPartnerId] = useState<string | undefined>(
    existing?.partnerId ?? initialPartner?.id,
  );
  const [exercises, setExercises] = useState<WorkoutExercise[]>(existing?.exercises ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);
  // QUICK LOG — the body parts trained, for a session logged without writing
  // the exercises out. On its own it is a complete gym session.
  const [muscles, setMuscles] = useState<string[]>(existing?.metrics.muscles ?? []);
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
  // A planned session's row is written (see save): a retry only answers the plan.
  const planSaved = useRef(false);
  // After saving a session at a known gym, offer an optional rating + crowd check-in.
  const [checkIn, setCheckIn] = useState<{ slug: string; name: string } | null>(null);

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

  const toggleMuscle = (m: string) =>
    setMuscles((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

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
    // A planned session whose save went through but whose "yes" didn't (the
    // network dropped): Save again only retries the yes — never a second row.
    if (plan && planSaved.current) {
      try {
        await confirmPlan(plan.planId, true, {
          conversationId: plan.conversationId,
          scheduledAt: plan.scheduledAt,
        });
      } catch (e) {
        setBusy(false);
        setError((e as Error).message);
        return;
      }
      setBusy(false);
      onSaved();
      return;
    }
    /*
      The same partner kept on an edit keeps their answer (a confirmed session
      is not re-asked; a row from before tags had to be accepted stays counted).
      A new or changed partner is a new request — saveWorkout marks it pending.
    */
    const samePartner = !!partnerId && partnerId === existing?.partnerId;
    const draft: WorkoutDraft = {
      date,
      activity,
      gym,
      partner,
      partnerId,
      ...(samePartner ? { partnerStatus: existing?.partnerStatus ?? "confirmed" } : {}),
      ...(plan && !existing ? { planId: plan.planId } : {}),
      exercises,
      metrics: { cardioType, distance, unit, duration, weightUnit, muscles },
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
    // A planned session: saving was the "yes, we trained". The plan asks the
    // partner (and confirms both sessions on their yes), so no tag push here.
    if (plan && !existing) {
      planSaved.current = true;
      try {
        await confirmPlan(plan.planId, true, {
          conversationId: plan.conversationId,
          scheduledAt: plan.scheduledAt,
        });
      } catch (e) {
        setError((e as Error).message);
        return;
      }
    }
    // A fresh partner tag asks them — "Did you train with Sam today?" — and
    // counts for nobody until they say yes. Fire-and-forget, never blocks.
    else if (partnerId && !samePartner) {
      const newId = existing ? existing.id : (res as { id?: string }).id;
      if (newId && !newId.startsWith("local-")) notifyPartnerTag(newId, gym.trim() || undefined);
    }
    // If this session was at a recognised gym, offer the optional rating + crowd
    // check-in before closing; otherwise finish straight away.
    const matched = getGymByName(gym);
    if (matched) {
      setCheckIn({ slug: matched.slug, name: matched.name });
      return;
    }
    onSaved();
  };

  const inputCls =
    "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-primary placeholder:text-muted";
  const labelCls = "mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted";
  // A field inside a DetailRow: no box of its own, the answer on the right.
  const rowInput =
    "w-full min-w-0 bg-transparent py-3 text-right text-base text-text outline-none";

  return (
    <div className="fixed inset-0 z-50 flex h-dvh flex-col bg-background">
      {/* Header — the round back button every full screen in the app has. */}
      <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-border bg-surface px-3.5 py-3">
        {/* data-tour: the tour presses this to close the editor again when it
            has finished explaining it (lib/tour.ts). */}
        <button
          type="button"
          data-tour="log-cancel"
          onClick={onClose}
          aria-label="Cancel"
          className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-text"
        >
          <IconArrowLeft size={16} />
        </button>
        <h1 className="text-base font-semibold text-text">
          {existing ? "Edit session" : "Log session"}
        </h1>
      </div>

      {/* Body. THE ORDER (owner, 2026-09-27: "make the log a session UI
          better"): what you did first, because it decides the rest of the
          form; then the quick log — the body parts — which on its own is the
          whole session; then the when / where / who in one card; the extras
          last. No "(optional)" on every label: only the date is needed, and
          it is already filled in. */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <div className="mx-auto w-full max-w-screen-sm">
          {/* data-tour: the tour lights the activity picker (lib/tour.ts). */}
          <div data-tour="log-activity">
            <Segmented
              size="md"
              full
              ariaLabel="Activity"
              options={primaryActivities.map((a) => ({ key: a.key, label: a.label }))}
              value={activity}
              onChange={(a) => setActivity(a)}
            />
          </div>

          {/* Body parts — gym / other */}
          {usesExercises && (
            <>
              {/*
                THE QUICK LOG. Tapping body parts is a complete session on its
                own: "Legs" is a leg day, it fills the calendar tile with the
                same chips a written-out workout does, and it counts the same
                everywhere sessions are counted. Everything below it — the sets,
                the weights — is for the days you feel like writing them down.
                Owner (2026-09-09): "I would just write that I did leg day. I
                don't want to type it all out." The sentence that used to say
                so under the chips is gone (owner, 2026-09-27).
              */}
              <div className={`${labelCls} mt-6`}>What did you train?</div>
              <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-3">
                {muscleGroups.map((m) => {
                  const on = muscles.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMuscle(m)}
                      aria-pressed={on}
                      className={`tap44 flex items-center gap-1 rounded-full border px-3.5 py-2 text-[13px] font-medium ${
                        on
                          ? "border-primary bg-primary-tint text-primary"
                          : "border-transparent bg-surface-2 text-text"
                      }`}
                    >
                      {on && <IconCheck size={13} />}
                      {m}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Cardio type — cardio only */}
          {isCardio && (
            <>
              <div className={`${labelCls} mt-6`}>Cardio type</div>
              <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-3">
                {cardioTypes.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCardioType(c)}
                    className={`tap44 flex items-center gap-1 rounded-full border px-3.5 py-2 text-[13px] font-medium ${
                      cardioType === c
                        ? "border-primary bg-primary-tint text-primary"
                        : "border-transparent bg-surface-2 text-text"
                    }`}
                  >
                    {cardioType === c && <IconCheck size={13} />}
                    {c}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Distance + duration — running / cardio, one card */}
          {(isRunning || isCardio) && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
              <DetailRow label="Distance">
                <input
                  value={distance}
                  onChange={(e) => setDistance(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  className={rowInput}
                />
                <Segmented
                  ariaLabel="Distance unit"
                  className="ml-2"
                  options={unitOptions.map((u) => ({ key: u, label: u }))}
                  value={unit}
                  onChange={(u) => setUnit(u)}
                />
              </DetailRow>
              <DetailRow label="Duration">
                <input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={rowInput}
                />
              </DetailRow>
            </div>
          )}

          {/* WHEN, WHERE, WHO — one card, a line each. */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
            <DetailRow label="Date">
              <input
                type="date"
                value={date}
                max={todayIso()}
                onChange={(e) => setDate(e.target.value)}
                /* Its own width, not the row's: a date field ignores
                   text-align, so a full-width one sat mid-row. */
                className="min-w-0 bg-transparent py-3 text-right text-base text-text outline-none"
              />
            </DetailRow>
            <DetailRow label={usesExercises ? "Gym" : "Where"}>
              <input
                list="gym-options"
                value={gym}
                onChange={(e) => setGym(e.target.value)}
                className={rowInput}
              />
              <datalist id="gym-options">
                {verifiedGyms.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </DetailRow>
            <button
              type="button"
              onClick={() => setPartnerPickerOpen(true)}
              disabled={!!plan}
              className="flex min-h-[52px] w-full items-center gap-3 px-3.5 text-left enabled:active:bg-surface-2"
            >
              <span className="w-20 flex-shrink-0 text-[14px] font-medium text-text">Partner</span>
              <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
                {partnerId ? (
                  <>
                    <Avatar size={26} alt={partner} />
                    <span className="truncate text-base text-text">{partner}</span>
                  </>
                ) : (
                  <span className="text-base text-muted">Solo</span>
                )}
              </span>
              {!plan && (
                <span className="flex-shrink-0 text-muted">
                  <IconChevronRight size={16} />
                </span>
              )}
            </button>
          </div>
          {/* Said before the save, because it changes what the save does: the
              multiplier is not yours to take, it is theirs to confirm. Not on
              a planned session — the plan is what asks them. The same partner
              kept on an edit already has an answer (or is still being asked),
              and that answer is said in the detail screen's words — "has
              confirmed" only when they actually did. */}
          {partnerId && !plan && (
            <p className="mt-1.5 px-1 text-[11px] leading-snug text-muted">
              {existing && existing.partnerId === partnerId
                ? (partnerStatusLine(existing) ?? `${partner} has confirmed this session.`)
                : `${partner} will be asked to confirm. Once they say yes it counts for both of you (${sessionPoints.partner}–${sessionPoints.newPartner} pts each) and lands on their calendar too. No answer in ${PARTNER_CONFIRM_HOURS}h and it counts as solo.`}
            </p>
          )}

          {/* Exercises — gym / other (Hevy-style per-set logging) */}
          {usesExercises && (
            <>
              <div className="mb-2 mt-6 flex items-center justify-between">
                <span className={labelCls.replace("mb-2", "mb-0")}>Exercises</span>
                {/* kg / lb toggle for this workout */}
                <Segmented
                  ariaLabel="Weight unit"
                  options={(["kg", "lb"] as WeightUnit[]).map((u) => ({ key: u, label: u }))}
                  value={weightUnit}
                  onChange={(u) => setWeightUnit(u)}
                />
              </div>

              <div className="flex flex-col gap-3">
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
                          className="tap44 press-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted hover:text-danger"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>

                      {/* Column header */}
                      <div className="flex items-center gap-2 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
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
                                s.done ? "bg-primary-tint" : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => cycleSetType(i, j, s.type)}
                                aria-label="Set type"
                                className={`h-8 w-8 flex-shrink-0 rounded-lg text-[12px] font-semibold ${
                                  s.type
                                    ? isWarm
                                      ? "bg-warn-tint text-warn"
                                      : "bg-accent-tint text-accent"
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
                                className={`tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                                  s.done ? "bg-success text-background" : "bg-surface-2 text-muted"
                                }`}
                              >
                                <IconCheck size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSet(i, j)}
                                aria-label="Remove set"
                                className="tap44 press-icon flex h-8 w-6 flex-shrink-0 items-center justify-center text-muted hover:text-danger"
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

              {/* data-tour: on a fresh session the list above is empty, so this
                  IS the exercise section as far as the tour is concerned. */}
              <button
                type="button"
                data-tour="log-exercises"
                onClick={() => setPickerOpen(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface py-3 text-[13px] font-medium text-muted active:border-primary-line active:text-primary"
              >
                <IconPlus size={15} /> Add exercise
              </button>
            </>
          )}

          {/* Photos — they become Memories on the profile */}
          <div className={`${labelCls} mt-6`}>Photos</div>
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
          {/* data-tour: the tour explains that these become Memories. */}
          <div data-tour="log-photos" className="grid grid-cols-4 gap-2">
            {photos.map((src, i) => (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="tap44 press-icon absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-text backdrop-blur hover:text-danger"
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
              className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border bg-surface text-muted active:text-primary disabled:opacity-50"
            >
              <IconPlus size={20} />
            </button>
          </div>

          <div className={`${labelCls} mt-6`}>Note</div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputCls}
          />

          {error && <p className="mt-3 text-[12px] text-danger">Couldn’t save: {error}</p>}
        </div>
      </div>

      {/* Save bar */}
      <div className="flex-shrink-0 border-t border-border bg-surface px-4 pb-6 pt-3">
        {/* data-tour: the tour's last stop inside the editor (lib/tour.ts). */}
        <div data-tour="log-save" className="mx-auto max-w-screen-sm">
          <Button size="lg" full onClick={save} disabled={busy || !date}>
            <IconCheck size={16} /> {busy ? "Saving…" : existing ? "Save changes" : "Save session"}
          </Button>
        </div>
      </div>

      {pickerOpen && (
        <ExercisePicker onPick={addExercise} onClose={() => setPickerOpen(false)} />
      )}

      {partnerPickerOpen && (
        <PartnerPicker
          userId={userId}
          currentId={partnerId}
          onPick={(p) => {
            setPartner(p.name);
            setPartnerId(p.id);
          }}
          onClear={() => {
            setPartner("");
            setPartnerId(undefined);
          }}
          onClose={() => setPartnerPickerOpen(false)}
        />
      )}

      {checkIn && (
        <GymCheckInPrompt
          userId={userId}
          gymSlug={checkIn.slug}
          gymName={checkIn.name}
          onDone={onSaved}
        />
      )}
    </div>
  );
}

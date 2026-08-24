"use client";

/*
  THE SESSION, ON A FEED CARD.
  ---------------------------------------------------------------------------
  What somebody trained, in the shape you can read while scrolling: one line
  saying WHAT (the same line the Memories screen uses — lib/memories.ts), one
  line saying where and with whom, and three numbers.

  The numbers differ by activity because the interesting facts do. A gym
  session is exercises, sets and volume; a run is distance, time and pace.
  Showing "0 km" on a bench-press day is how a feed stops being read.

  The exercise-by-exercise detail is FOLDED AWAY behind one tap. That was the
  product owner's call from the start: the workout is optional to look at. A
  card that opens as a spreadsheet is a card nobody scrolls past.

  Colours are theme tokens (rule 1).
*/
import { useState } from "react";
import Link from "next/link";
import { IconChevronDown } from "@/components/icons";
import { trainedLine } from "@/lib/memories";
import {
  activityLabel,
  metricsSummary,
  type WeightUnit,
  type WorkoutLog,
} from "@/lib/supabase/workouts";
import type { PostWorkout } from "@/lib/supabase/posts";

/*
  The feed's public-safe session, in the shape every existing summary helper
  already understands. Photos are deliberately empty: the card draws the one
  photo itself, and these helpers never look at them.
*/
const asLog = (w: PostWorkout): WorkoutLog => ({
  id: w.id,
  date: w.date,
  activity: w.activity,
  gym: w.gym,
  partner: w.partner,
  ...(w.partnerId ? { partnerId: w.partnerId } : {}),
  exercises: w.exercises,
  metrics: w.metrics,
  photos: [],
  note: w.note,
});

/** Sets logged, and the weight moved — the two numbers a gym session is judged by. */
function gymTotals(w: PostWorkout): { sets: number; volume: number } {
  let sets = 0;
  let volume = 0;
  for (const exercise of w.exercises) {
    for (const set of exercise.sets) {
      sets += 1;
      const weight = parseFloat(set.weight);
      const reps = parseFloat(set.reps);
      if (Number.isFinite(weight) && Number.isFinite(reps)) volume += weight * reps;
    }
  }
  return { sets, volume };
}

export default function WorkoutAttachment({ workout }: { workout: PostWorkout }) {
  const [open, setOpen] = useState(false);
  const log = asLog(workout);
  const unit: WeightUnit = workout.metrics.weightUnit ?? "kg";
  const cardio = workout.activity === "running" || workout.activity === "cardio";
  const solo = !workout.partner || workout.partner.toLowerCase() === "solo";

  // What the session WAS, in one line — muscles for a gym day, distance and
  // time for a run. Never empty: it falls back to the activity's own name.
  const headline = trainedLine(log) || activityLabel(workout.activity);

  const totals = gymTotals(workout);
  const stats: { label: string; value: string }[] = cardio
    ? [
        { label: "Activity", value: activityLabel(workout.activity) },
        { label: "Distance", value: workout.metrics.distance
            ? `${workout.metrics.distance} ${workout.metrics.unit ?? "km"}`
            : "—" },
        { label: "Time", value: workout.metrics.duration || "—" },
      ]
    : [
        { label: "Exercises", value: String(workout.exercises.length) },
        { label: "Sets", value: String(totals.sets) },
        {
          label: "Volume",
          value: totals.volume > 0 ? `${Math.round(totals.volume).toLocaleString()} ${unit}` : "—",
        },
      ];

  // Where and who — the two things that turn a number into a session someone
  // could have joined. Nothing shows when neither is known.
  const context = [
    workout.gym,
    solo ? "" : `with ${workout.partner}`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="mt-2.5 overflow-hidden rounded-xl border border-border bg-surface-2">
      <div className="px-3 pt-2.5">
        <div className="text-[14px] font-semibold text-text">{headline}</div>
        {context && (
          <div className="mt-0.5 text-[11px] text-muted">
            {workout.partnerId && !solo ? (
              <>
                {workout.gym && <span>{workout.gym} · </span>}
                with{" "}
                <Link href={`/people/${workout.partnerId}`} className="text-primary">
                  {workout.partner}
                </Link>
              </>
            ) : (
              context
            )}
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-3 divide-x divide-border border-t border-border">
        {stats.map((s) => (
          <div key={s.label} className="px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
              {s.label}
            </div>
            <div className="mt-0.5 truncate text-[13px] font-semibold text-text">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Cardio has no exercise list to open; a run is already fully described. */}
      {!cardio && workout.exercises.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="tap44 flex w-full items-center justify-center gap-1 border-t border-border py-2 text-[12px] font-medium text-muted"
          >
            {open ? "Hide exercises" : "Show exercises"}
            <IconChevronDown
              size={13}
              className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <ul className="divide-y divide-border border-t border-border">
              {workout.exercises.map((exercise, i) => (
                <li key={`${exercise.name}-${i}`} className="px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-text">
                      {exercise.name || "Exercise"}
                    </span>
                    <span className="shrink-0 text-[11px] text-text-3">
                      {exercise.sets.length} ×
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-muted">
                    {exercise.sets.map((set, j) => (
                      <span key={j}>
                        {set.weight ? `${set.weight} ${unit}` : "—"}
                        {set.reps ? ` × ${set.reps}` : ""}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {cardio && metricsSummary(log) === "" && (
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted">
          No numbers logged for this one.
        </p>
      )}
    </div>
  );
}

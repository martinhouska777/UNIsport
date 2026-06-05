"use client";

import { useEffect, useState } from "react";
import {
  activityLabel,
  logMuscles,
  metricsSummary,
  type WeightUnit,
  type WorkoutLog,
  type WorkoutSet,
} from "@/lib/supabase/workouts";
import { IconArrowLeft, IconUser, IconPencil, IconTrash, IconCheck } from "@/components/icons";

const SET_TYPE_LABEL: Record<string, string> = { W: "W", N: "N", D: "D", F: "F" };

/*
  WORKOUT DETAIL — one logged workout on its own full screen, reached by tapping
  a session in the day sheet. Shows the Hevy-style per-exercise sets table (with
  the body parts trained), plus running/cardio metrics, partner, photos and note.
  Carries Edit / Delete. Colors are theme tokens (rule 1).
*/
export default function WorkoutDetail({
  log,
  onBack,
  onEdit,
  onDelete,
}: {
  log: WorkoutLog;
  onBack: () => void;
  onEdit: (log: WorkoutLog) => void;
  onDelete: (log: WorkoutLog) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onBack();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onBack]);

  const unit: WeightUnit = log.metrics.weightUnit ?? "kg";
  const muscles = logMuscles(log);
  const metrics = metricsSummary(log);
  const solo = !log.partner || log.partner.toLowerCase() === "solo";
  const dateLabel = new Date(`${log.date}T00:00:00`).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Set label: normal sets are numbered; warmup/drop/failure show their letter.
  const setLabels = (sets: WorkoutSet[]) => {
    let normalNo = 0;
    return sets.map((s) => {
      if (!s.type) normalNo += 1;
      return s.type ? SET_TYPE_LABEL[s.type] : String(normalNo);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background [animation:backdrop-in_0.2s_ease-out]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3.5 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-text"
        >
          <IconArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <div className="truncate text-base font-medium text-text">{activityLabel(log.activity)}</div>
          <div className="text-[11px] text-muted">{dateLabel}</div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4">
        {/* Body parts */}
        {muscles.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {muscles.map((m) => (
              <span
                key={m}
                className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary"
              >
                {m}
              </span>
            ))}
          </div>
        )}

        {/* Running / cardio metrics */}
        {metrics && (
          <div className="mb-4 inline-block rounded-xl border border-primary bg-primary/10 px-3 py-1.5 text-[14px] font-medium text-primary">
            {metrics}
          </div>
        )}

        {/* Gym */}
        {log.gym && (
          <div className="mb-4">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Gym</div>
            <div className="text-[13px] text-text">{log.gym}</div>
          </div>
        )}

        {/* Exercises — Hevy-style sets table */}
        {log.exercises.length > 0 && (
          <div className="mb-4 flex flex-col gap-3">
            {log.exercises.map((ex, i) => {
              const labels = setLabels(ex.sets);
              return (
                <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <div className="border-b border-border px-3 py-2.5">
                    <div className="text-[14px] font-semibold text-text">{ex.name}</div>
                    {ex.muscle && <div className="text-[11px] text-muted">{ex.muscle}</div>}
                  </div>
                  <div className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center px-3 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                    <span className="text-center">Set</span>
                    <span className="text-center">{unit}</span>
                    <span className="text-center">Reps</span>
                    <span aria-hidden />
                  </div>
                  {ex.sets.map((s, j) => (
                    <div
                      key={j}
                      className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center px-3 py-1.5 text-[13px] text-text"
                    >
                      <span
                        className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold ${
                          s.type === "W"
                            ? "bg-warn/20 text-warn"
                            : s.type
                              ? "bg-accent/20 text-accent"
                              : "bg-surface-2 text-text"
                        }`}
                      >
                        {labels[j]}
                      </span>
                      <span className="text-center tabular-nums">{s.weight.trim() || "—"}</span>
                      <span className="text-center tabular-nums">{s.reps.trim() || "—"}</span>
                      <span className="flex justify-center text-success">
                        {s.done && <IconCheck size={14} />}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Partner */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary bg-primary/15 text-primary">
            <IconUser size={15} />
          </div>
          <div>
            <div className="text-[10px] text-muted">{solo ? "Session" : "Training partner"}</div>
            <div className="text-[13px] font-medium text-primary">{solo ? "Solo session" : log.partner}</div>
          </div>
        </div>

        {/* Photos */}
        {log.photos.length > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Photos</div>
            <div className="grid grid-cols-3 gap-1.5">
              {log.photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setViewer(src)}
                  aria-label={`View photo ${i + 1}`}
                  className="aspect-square overflow-hidden rounded-lg border border-border bg-surface-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        {log.note && (
          <div className="mb-4">
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Note</div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[13px] leading-relaxed text-muted">
              {log.note}
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions: Edit / Delete */}
      <div className="flex gap-2.5 border-t border-border bg-surface px-3.5 py-3">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-full border border-border bg-surface-2 px-5 py-3 text-sm font-medium text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onDelete(log);
              }}
              className="flex-1 rounded-full bg-danger px-5 py-3 text-sm font-semibold text-primary-contrast disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete session"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface-2 px-5 py-3 text-sm font-medium text-danger"
            >
              <IconTrash size={15} />
              Delete
            </button>
            <button
              type="button"
              onClick={() => onEdit(log)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-contrast"
            >
              <IconPencil size={15} />
              Edit session
            </button>
          </>
        )}
      </div>

      {/* Full-screen photo viewer */}
      {viewer && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 p-6"
          onClick={() => setViewer(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewer} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  activityLabel,
  exerciseSummary,
  metricsSummary,
  type WorkoutLog,
} from "@/lib/supabase/workouts";
import { IconArrowLeft, IconUser, IconPencil, IconTrash } from "@/components/icons";

/*
  WORKOUT DETAIL — one logged workout on its own full screen. This is the
  "bigger" view reached by tapping a session in the day sheet, and the place the
  erg screen, Compare, and (later) Garmin/heart-rate data will live. For now it
  shows everything we already store and carries edit / delete. Colors are theme
  tokens (rule 1).
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
  // A tapped photo, shown full-screen.
  const [viewer, setViewer] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onBack();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onBack]);

  const solo = !log.partner || log.partner.toLowerCase() === "solo";
  const summary = metricsSummary(log);
  const dateLabel = new Date(`${log.date}T00:00:00`).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
        {/* Metrics (running / cardio) */}
        {summary && (
          <div className="mb-4 inline-block rounded-xl border border-primary bg-primary/10 px-3 py-1.5 text-[14px] font-medium text-primary">
            {summary}
          </div>
        )}

        {/* Gym */}
        {log.gym && (
          <div className="mb-4">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Gym</div>
            <div className="text-[13px] text-text">{log.gym}</div>
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

        {/* Exercises */}
        {log.exercises.length > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              Exercises
            </div>
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface px-3">
              {log.exercises.map((ex, i) => (
                <div key={i} className="py-2 text-[13px] text-text">
                  {exerciseSummary(ex) || "—"}
                </div>
              ))}
            </div>
          </div>
        )}

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
                // Parent unmounts this on delete; no need to reset state.
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

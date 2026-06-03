"use client";

import { useEffect, useState } from "react";
import {
  activityLabel,
  exerciseSummary,
  metricsSummary,
  type WorkoutLog,
} from "@/lib/supabase/workouts";
import { IconX, IconUser, IconPencil, IconTrash } from "@/components/icons";

/*
  Bottom sheet showing every workout logged on a given day. Closes on the X, on
  the backdrop, or on Escape. Each logged session can be edited (reopens it in
  the Log editor) or deleted (two-step confirm). Colors are theme tokens (rule 1).
*/
export default function SessionSheet({
  date,
  logs,
  onClose,
  onEdit,
  onDelete,
}: {
  date: string; // ISO yyyy-mm-dd
  logs: WorkoutLog[];
  onClose: () => void;
  onEdit: (log: WorkoutLog) => void;
  onDelete: (log: WorkoutLog) => Promise<void>;
}) {
  // Inline delete confirm + in-flight state, keyed by the log being acted on.
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="relative max-h-[82%] overflow-y-auto rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div className="flex justify-center pb-1.5 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-border" />
        </div>

        {/* Date header */}
        <div className="flex items-center justify-between border-b border-border px-4 pb-3">
          <div>
            <div className="text-[15px] font-medium text-text">{dateLabel}</div>
            <div className="mt-0.5 text-[11px] text-muted">
              {logs.length} session{logs.length === 1 ? "" : "s"} logged
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconX size={14} />
          </button>
        </div>

        {/* One block per logged session */}
        <div className="flex flex-col divide-y divide-border pb-6">
          {logs.map((log) => {
            const solo = !log.partner || log.partner.toLowerCase() === "solo";
            const summary = metricsSummary(log);
            return (
              <div key={log.id} className="px-4 py-3">
                {/* Activity + gym, with edit / delete actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-text">
                      {activityLabel(log.activity)}
                    </div>
                    {log.gym && <div className="mt-0.5 text-[11px] text-muted">{log.gym}</div>}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    {confirmId === log.id ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId === log.id}
                          onClick={async () => {
                            setBusyId(log.id);
                            await onDelete(log);
                            setConfirmId(null);
                            setBusyId(null);
                          }}
                          className="rounded-lg bg-danger/15 px-2.5 py-1 text-[11px] font-medium text-danger disabled:opacity-50"
                        >
                          {busyId === log.id ? "Deleting…" : "Delete"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="rounded-lg bg-surface-2 px-2.5 py-1 text-[11px] text-muted"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(log)}
                          aria-label="Edit session"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
                        >
                          <IconPencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(log.id)}
                          aria-label="Delete session"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
                        >
                          <IconTrash size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Running / cardio metrics */}
                {summary && (
                  <div className="mt-2 inline-block rounded-lg border border-primary bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary">
                    {summary}
                  </div>
                )}

                {/* Partner */}
                <div className="mt-2.5 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary bg-primary/15 text-primary">
                    <IconUser size={14} />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted">{solo ? "Session" : "Training partner"}</div>
                    <div className="text-xs font-medium text-primary">
                      {solo ? "Solo session" : log.partner}
                    </div>
                  </div>
                </div>

                {/* Exercises */}
                {log.exercises.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                      Exercises
                    </div>
                    <div className="flex flex-col divide-y divide-border">
                      {log.exercises.map((ex, i) => (
                        <div key={i} className="py-1.5 text-xs text-text">
                          {exerciseSummary(ex) || "—"}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Note */}
                {log.note && (
                  <div className="mt-3 rounded-xl border border-border bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-muted">
                    {log.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

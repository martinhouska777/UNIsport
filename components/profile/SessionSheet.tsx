"use client";

import { useEffect } from "react";
import {
  activityLabel,
  metricsSummary,
  type WorkoutLog,
} from "@/lib/supabase/workouts";
import { IconX, IconUser, IconChevronRight } from "@/components/icons";

/*
  Bottom sheet listing every workout logged on a given day as a compact,
  tappable row. Tapping a row opens that workout on its own full screen
  (WorkoutDetail), where edit / delete — and later the erg screen, Compare and
  Garmin data — live. Closes on the X, the backdrop, or Escape. Colors are
  theme tokens (rule 1).
*/
export default function SessionSheet({
  date,
  logs,
  onClose,
  onOpen,
}: {
  date: string; // ISO yyyy-mm-dd
  logs: WorkoutLog[];
  onClose: () => void;
  onOpen: (log: WorkoutLog) => void;
}) {
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

        {/* One tappable row per logged session */}
        <div className="flex flex-col divide-y divide-border pb-6">
          {logs.map((log) => {
            const solo = !log.partner || log.partner.toLowerCase() === "solo";
            // The most useful single line under the activity name.
            const subtitle =
              metricsSummary(log) ||
              log.gym ||
              (!solo ? `with ${log.partner}` : null) ||
              (log.exercises.length > 0
                ? `${log.exercises.length} exercise${log.exercises.length === 1 ? "" : "s"}`
                : "Solo session");
            const photo = log.photos[0];
            return (
              <button
                key={log.id}
                type="button"
                onClick={() => onOpen(log)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
              >
                {/* Thumbnail: first photo, or an activity avatar */}
                {photo ? (
                  <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  </span>
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary bg-primary/15 text-primary">
                    <IconUser size={18} />
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-text">
                    {activityLabel(log.activity)}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">{subtitle}</span>
                </span>

                <IconChevronRight size={16} className="shrink-0 text-muted" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

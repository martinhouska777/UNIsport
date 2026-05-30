"use client";

import { useEffect } from "react";
import type { Session } from "@/lib/currentUser";
import { IconX, IconUser } from "@/components/icons";

/*
  Bottom sheet that slides up with a session's details. Closes on the X, on the
  backdrop, or on Escape. All content reads from the session data.
*/
export default function SessionSheet({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), session.day);
  const dateLabel = date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const solo = !session.partner || session.partner.toLowerCase() === "solo";

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
              {session.activity} · {session.gym}
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

        {/* Partner */}
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary bg-primary/15 text-primary">
            <IconUser size={16} />
          </div>
          <div>
            <div className="text-[10px] text-muted">{solo ? "Session" : "Training partner"}</div>
            <div className="text-xs font-medium text-primary">
              {solo ? "Solo session" : session.partner}
            </div>
          </div>
        </div>

        {/* Exercises */}
        {session.exercises.length > 0 && (
          <div className="border-b border-border px-4 py-3">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              Exercises
            </div>
            <div className="flex flex-col divide-y divide-border">
              {session.exercises.map((ex) => (
                <div key={ex} className="py-2 text-xs text-text">
                  {ex}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        <div className="px-4 pb-6 pt-3">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
            Photos
          </div>
          {session.photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {session.photos.map((_, i) => (
                <div key={i} className="aspect-square rounded-md border border-border bg-surface-2" />
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-muted">No photos from this session.</div>
          )}
        </div>
      </div>
    </div>
  );
}

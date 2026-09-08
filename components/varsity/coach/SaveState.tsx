"use client";

/*
  THE QUIET SAVE LINE.
  ------------------------------------------------------------------
  One rule across the whole Coach Console: the coach's work saves itself, and a
  BUTTON is only ever for telling the squad. So no screen in here has a "Save"
  any more — they have this instead: a line that says what already happened.

  It is deliberately small and never a control, except in the one case that
  matters — a save that FAILED. Then it grows a Retry, because that is the only
  moment the coach can actually do something about it.
*/
import { IconCheck } from "@/components/icons";

export type SaveStatus = "saved" | "saving" | "error";

export default function SaveState({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry?: () => void;
}) {
  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-danger">
        Not saved
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-danger-line px-2 py-1 text-[11px] font-semibold text-danger"
          >
            Retry
          </button>
        )}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[12px] text-muted" aria-live="polite">
      {status === "saving" ? (
        "Saving…"
      ) : (
        <>
          <IconCheck size={13} /> Saved
        </>
      )}
    </span>
  );
}

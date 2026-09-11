"use client";

/*
  "POST THAT YOU'RE GOING" — the gym page's main action, two taps long.

  Tap 1: a time (the hours still ahead today; tomorrow's once today is spent).
  Tap 2: confirm. That writes an ordinary Buddy Board post pinned to THIS gym,
  so it shows on the board, on this gym's card ("2 going tonight") and to
  anyone searching by time. The focus is pre-picked from what you mainly do
  (lib/buddyBoard.ts) and can be changed without costing a tap.

  Same chrome as the other bottom sheets; inputs are buttons, so nothing here
  can make a phone zoom. Colours are theme tokens.
*/
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { Pill, FieldLabel } from "@/components/onboarding/controls";
import { createBuddyPost } from "@/lib/supabase/buddyBoard";
import { announceBoardChange } from "@/lib/gymGoing";
import { buddyFocuses, defaultFocusFor, upcomingSlots } from "@/lib/buddyBoard";
import { dateLabel } from "@/lib/schedule";
import { IconX } from "@/components/icons";

export default function PostGoingSheet({
  gymName,
  primaryActivity,
  onClose,
  onPosted,
}: {
  gymName: string;
  primaryActivity: string | null | undefined;
  onClose: () => void;
  onPosted: () => void;
}) {
  // Worked out once when the sheet opens — the list must not shift under a thumb.
  const [when] = useState(() => upcomingSlots());
  const [hour, setHour] = useState<number | null>(null);
  const [focus, setFocus] = useState<string>(defaultFocusFor(primaryActivity));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const post = async () => {
    if (hour === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createBuddyPost({ focus, date: when.date, hour, gym: gymName });
      announceBoardChange();
      onPosted();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="sheet-floor relative max-h-[88%] overflow-y-auto rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div className="flex justify-center pb-1.5 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between border-b border-border px-4 pb-3">
          <div>
            <div className="text-[15px] font-medium text-text">Going to {gymName}</div>
            <div className="mt-0.5 text-[11px] text-muted">
              {when.isToday ? "Today" : `Tomorrow · ${dateLabel(when.date)}`} · everyone at your
              school can see it and join you
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconX size={14} />
          </button>
        </div>

        <div className="px-4 pb-6 pt-4">
          <FieldLabel>What time?</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {when.slots.map((s) => (
              <Pill key={s.value} label={s.label} selected={hour === s.value} onClick={() => setHour(s.value)} />
            ))}
          </div>

          <div className="mt-4">
            <FieldLabel>Doing</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {buddyFocuses.map((f) => (
                <Pill key={f.key} label={f.label} selected={focus === f.key} onClick={() => setFocus(f.key)} />
              ))}
            </div>
          </div>

          {error && <div className="mt-3 text-[12px] text-danger">Couldn’t post: {error}</div>}

          <Button size="lg" full onClick={post} disabled={hour === null || busy} className="mt-5">
            {busy ? "Posting…" : hour === null ? "Pick a time" : "Post it"}
          </Button>
        </div>
      </div>
    </div>
  );
}

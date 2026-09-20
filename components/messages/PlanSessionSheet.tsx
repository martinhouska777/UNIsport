"use client";

/*
  PLAN A SESSION — bottom-sheet form opened from a DM thread. Captures activity,
  optional place, and a date + time, then proposes it to the other person via
  createPlan(). The proposal then appears as a PlanCard in the thread. Inputs
  stay text-base so phones don't auto-zoom; colors are theme tokens (rule 1).
*/
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { primaryActivities, verifiedGyms } from "@/lib/onboarding";
import { createPlan, reschedulePlan } from "@/lib/supabase/sessionPlans";
import { IconX } from "@/components/icons";

const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const todayIso = () => localDate(new Date());

/*
  The time the sheet opens on. 17:00 while that is still ahead — most sessions
  are after lectures — and otherwise the next half hour, so the form never opens
  on a time that has already gone and then refuses to send it.
*/
const defaultStart = (): Date => {
  const next = new Date();
  next.setSeconds(0, 0);
  next.setMinutes(Math.ceil((next.getMinutes() + 1) / 30) * 30);
  const five = new Date(next);
  five.setHours(17, 0, 0, 0);
  return next < five ? five : next;
};

// When `existing` is given, the sheet reschedules that plan instead of creating one.
export type PlanEdit = {
  planId: string;
  activity: string;
  place: string | null;
  scheduledAt: string;
};

export default function PlanSessionSheet({
  conversationId,
  otherName,
  existing,
  onClose,
  onCreated,
}: {
  conversationId: string;
  otherName: string;
  existing?: PlanEdit;
  onClose: () => void;
  onCreated: () => void;
}) {
  const existingDate = existing ? new Date(existing.scheduledAt) : null;
  const opensAt = existingDate ?? defaultStart();
  const [activity, setActivity] = useState(existing?.activity ?? "gym");
  const [place, setPlace] = useState(existing?.place ?? "");
  const [date, setDate] = useState(localDate(opensAt));
  const [time, setTime] = useState(localTime(opensAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const propose = async () => {
    if (!date || !time || busy) return;
    /*
      Nothing may be proposed for a moment that has already passed. The date box
      has a `min`, but it only covers whole DAYS: at six in the evening, nine
      this morning was still accepted, and the other person got an invitation to
      a session that was over before it arrived.
    */
    const when = new Date(`${date}T${time}`);
    if (Number.isNaN(when.getTime())) {
      setError("That date and time didn't make sense — try again.");
      return;
    }
    if (when.getTime() <= Date.now()) {
      setError("That time has already gone. Pick a later one.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const scheduledAt = when.toISOString();
      if (existing) {
        await reschedulePlan(existing.planId, { activity, place, scheduledAt }, conversationId);
      } else {
        await createPlan(conversationId, { activity, place, scheduledAt });
      }
      onCreated();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-base text-text outline-none focus:border-primary placeholder:text-muted";
  const labelCls = "mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="relative max-h-[88%] overflow-y-auto rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div className="flex justify-center pb-1.5 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between border-b border-border px-4 pb-3">
          <div className="text-[15px] font-medium text-text">
            {existing ? "Reschedule session" : `Plan a session with ${otherName}`}
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
          <div className={labelCls}>Activity</div>
          <div className="grid grid-cols-4 gap-1.5">
            {primaryActivities.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setActivity(a.key)}
                className={`rounded-xl border py-2.5 text-[12px] font-semibold ${
                  activity === a.key
                    ? "border-primary bg-primary-tint text-primary"
                    : "border-border bg-surface text-text"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className={`${labelCls} mt-4`}>Where (optional)</div>
          <input
            list="plan-gym-options"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="Gym, route or area"
            className={inputCls}
          />
          <datalist id="plan-gym-options">
            {verifiedGyms.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>

          <div className="mt-4 flex gap-2.5">
            <div className="flex-1">
              <div className={labelCls}>Date</div>
              <input
                type="date"
                value={date}
                min={todayIso()}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex-1">
              <div className={labelCls}>Time</div>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {error && <div className="mt-3 text-[12px] text-danger">{error}</div>}

          <Button size="lg" full onClick={propose} disabled={busy || !date || !time} className="mt-5">
            {busy ? "Sending…" : existing ? "Update & resend" : `Send plan to ${otherName}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

/*
  PLAN CARD — a "Plan a session" proposal rendered inline in a DM thread (for
  messages of kind 'plan'). Shows the activity, place and time, plus a status
  footer that depends on who's looking:
    • proposed, you're the recipient → Accept / Decline
    • proposed, you proposed it      → "Waiting for <name>…"
    • accepted                       → confirmed-to-meet state
    • declined                       → declined state
  Colors are theme tokens only (rule 1).
*/
import { useState } from "react";
import { respondToPlan, planWhenLabel } from "@/lib/supabase/sessionPlans";
import { type DmPlan } from "@/lib/supabase/messages";
import { activityLabel } from "@/lib/supabase/workouts";
import { IconCalendar, IconCheck, IconX, IconMapPin } from "@/components/icons";

export default function PlanCard({
  plan,
  mine,
  otherName,
  onChanged,
}: {
  plan: DmPlan;
  mine: boolean; // did I propose this?
  otherName: string;
  onChanged: () => void; // refetch the thread after a response
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const respond = async (accept: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await respondToPlan(plan.planId, accept);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[88%] rounded-2xl border border-border bg-surface-2 p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <IconCalendar size={16} />
        </span>
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-primary">
            Session plan
          </div>
          <div className="truncate text-[14px] font-medium text-text">
            {activityLabel(plan.activity)}
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-col gap-1.5 text-[12px] text-text">
        <div className="flex items-center gap-2">
          <IconCalendar size={13} className="text-muted" />
          {planWhenLabel(plan.scheduledAt)}
        </div>
        {plan.place && (
          <div className="flex items-center gap-2">
            <IconMapPin size={13} className="text-muted" />
            <span className="truncate">{plan.place}</span>
          </div>
        )}
      </div>

      {/* Status / actions */}
      <div className="mt-3 border-t border-border pt-2.5">
        {plan.status === "proposed" && !mine && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => respond(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2 text-[12px] font-semibold text-primary-contrast disabled:opacity-50"
            >
              <IconCheck size={14} /> Accept
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => respond(false)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-surface py-2 text-[12px] font-medium text-muted disabled:opacity-50"
            >
              <IconX size={14} /> Decline
            </button>
          </div>
        )}

        {plan.status === "proposed" && mine && (
          <div className="text-[11px] text-muted">Waiting for {otherName} to accept…</div>
        )}

        {plan.status === "accepted" && (
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-success">
            <IconCheck size={14} /> You&apos;re on — see you there
          </div>
        )}

        {plan.status === "declined" && (
          <div className="text-[12px] text-muted">
            {mine ? `${otherName} declined this time.` : "You declined this plan."}
          </div>
        )}

        {error && <div className="mt-1.5 text-[11px] text-danger">{error}</div>}
      </div>
    </div>
  );
}

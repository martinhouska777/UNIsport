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
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { respondToPlan, confirmPlan, cancelPlan, planWhenLabel } from "@/lib/supabase/sessionPlans";
import { type DmPlan } from "@/lib/supabase/messages";
import { planLogHref } from "@/lib/reminders";
import { activityLabel } from "@/lib/supabase/workouts";
import { IconCalendar, IconCheck, IconX, IconMapPin } from "@/components/icons";

export default function PlanCard({
  plan,
  conversationId,
  mine,
  otherName,
  otherId,
  onChanged,
  onReschedule,
  tour,
}: {
  plan: DmPlan;
  conversationId: string; // so a response can ping the other person
  mine: boolean; // did I propose this?
  otherName: string;
  otherId: string | null; // the partner the "Yes, we trained" log is filled in with
  onChanged: () => void; // refetch the thread after a response
  onReschedule: (plan: DmPlan) => void; // open the reschedule editor (proposer)
  /** A `data-tour` for the walk — set on the newest plan in the thread. */
  tour?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
    "Yes, we trained" is not answered from here (owner, 2026-09-27: "when you
    accept you can log it … you need to say what you did as well"). It opens
    YOUR Log session sheet on the Profile tab with the plan's day, activity,
    place and partner filled in; saving it is the yes. "No-show" still answers
    straight away through confirm(false).
  */
  const logIt = () => {
    if (!otherId) return confirm(true); // no partner id to fill in: answer as before
    router.push(
      planLogHref({
        planId: plan.planId,
        conversationId,
        scheduledAt: plan.scheduledAt,
        activity: plan.activity,
        place: plan.place,
        otherId,
        otherName,
      }),
    );
  };

  const respond = async (accept: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await respondToPlan(plan.planId, accept, { conversationId, scheduledAt: plan.scheduledAt });
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      // Always release the card. This card stays mounted after a response (the
      // thread refetches in place), so leaving `busy` on left Cancel/Reschedule
      // permanently greyed out until you backed out of the chat and reopened it.
      setBusy(false);
    }
  };

  const confirm = async (attended: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await confirmPlan(plan.planId, attended, { conversationId, scheduledAt: plan.scheduledAt });
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await cancelPlan(plan.planId, { conversationId, scheduledAt: plan.scheduledAt });
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /* The clock, read once a minute rather than during render (react-hooks/purity)
     — a session that starts while the chat is open still turns into "Did this
     happen?" without anyone reopening the thread. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // For an accepted session: has its time passed, and how did each side answer?
  const isPast = new Date(plan.scheduledAt).getTime() <= now;
  const myAnswer = mine ? plan.proposerAnswer : plan.recipientAnswer;
  const theirAnswer = mine ? plan.recipientAnswer : plan.proposerAnswer;

  // An open plan that hasn't happened yet can be cancelled (either side) or
  // rescheduled (proposer only).
  const canManage =
    (plan.status === "proposed" && mine) || (plan.status === "accepted" && !isPast);

  return (
    <div data-tour={tour} className="mx-auto w-full max-w-[88%] rounded-2xl border border-border bg-surface p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
          <IconCalendar size={16} />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
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
            {/* The walk's finger taps this as a DRAWING only — it is never
                clicked, because accepting answers the other person. */}
            <Button
              size="sm"
              disabled={busy}
              onClick={() => respond(true)}
              data-tour={tour ? "plan-accept" : undefined}
              className="flex-1"
            >
              <IconCheck size={14} /> Accept
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => respond(false)}
              className="flex-1"
            >
              <IconX size={14} /> Decline
            </Button>
          </div>
        )}

        {plan.status === "proposed" && mine && (
          <div className="text-[11px] text-muted">Waiting for {otherName} to accept…</div>
        )}

        {plan.status === "accepted" && !isPast && (
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-success">
            <IconCheck size={14} /> You&apos;re on — see you there
          </div>
        )}

        {/* After the time: both confirm whether it actually happened. */}
        {plan.status === "accepted" && isPast && myAnswer === null && (
          <div>
            <div className="mb-2 text-[12px] font-medium text-text">Did this happen?</div>
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} onClick={logIt} className="flex-1">
                <IconCheck size={14} /> Yes, we trained
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => confirm(false)}
                className="flex-1"
              >
                <IconX size={14} /> No-show
              </Button>
            </div>
          </div>
        )}

        {plan.status === "accepted" && isPast && myAnswer !== null && (
          <div className="text-[11px] text-muted">
            {myAnswer === "yes"
              ? theirAnswer === null
                ? `You confirmed. Waiting for ${otherName} to confirm…`
                : ""
              : "You marked this as a no-show."}
          </div>
        )}

        {plan.status === "confirmed" && (
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-success">
            <IconCheck size={14} /> Verified
          </div>
        )}

        {plan.status === "missed" && (
          <div className="text-[12px] text-muted">Marked as didn&apos;t happen.</div>
        )}

        {plan.status === "declined" && (
          <div className="text-[12px] text-muted">
            {mine ? `${otherName} declined this time.` : "You declined this plan."}
          </div>
        )}

        {plan.status === "cancelled" && (
          <div className="text-[12px] text-muted">This session plan was cancelled.</div>
        )}

        {/* Manage an open, not-yet-happened plan */}
        {canManage && (
          <div className="mt-2 flex gap-3">
            {mine && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onReschedule(plan)}
                className="text-[11px] font-medium text-primary disabled:opacity-50"
              >
                Reschedule
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={cancel}
              className="text-[11px] font-medium text-muted disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}

        {error && <div className="mt-1.5 text-[11px] text-danger">{error}</div>}
      </div>
    </div>
  );
}

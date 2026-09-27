"use client";

/*
  PLAN CARD — a "Plan a session" proposal rendered inline in a DM thread (for
  messages of kind 'plan').

  It is SMALL: one row, the same row the Profile tab's Upcoming sessions draws
  (owner, 2026-09-27 — the old card was a big box in the middle of the chat,
  "make it look like how it looks on my profile"). Icon, "Gym with Jonas",
  "Tomorrow · 5:00 PM · Malkin", a chevron. Tapping the row opens the status
  and the buttons underneath; nothing else is on screen until you do.

  The icon circle carries the state at a glance, with no words: filled in the
  school's colour when the plan is waiting on YOU (answer it, or say whether it
  happened), a green tick once it is verified, greyed and struck through when
  it was declined, cancelled or didn't happen.

  The folded part depends on who's looking:
    • proposed, you're the recipient → Accept / Decline
    • proposed, you proposed it      → "Waiting for <name>…"
    • accepted                       → confirmed-to-meet state
    • declined                       → declined state
  Colors are theme tokens only (rule 1).
*/
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { respondToPlan, confirmPlan, cancelPlan, planDayLabel } from "@/lib/supabase/sessionPlans";
import { type DmPlan } from "@/lib/supabase/messages";
import { activityLabel } from "@/lib/supabase/workouts";
import { IconCalendar, IconCheck, IconX, IconChevronDown } from "@/components/icons";

export default function PlanCard({
  plan,
  conversationId,
  mine,
  otherName,
  onChanged,
  onReschedule,
}: {
  plan: DmPlan;
  conversationId: string; // so a response can ping the other person
  mine: boolean; // did I propose this?
  otherName: string;
  onChanged: () => void; // refetch the thread after a response
  onReschedule: (plan: DmPlan) => void; // open the reschedule editor (proposer)
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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

  // Waiting on me: an invite to answer, or a past session to confirm.
  const needsMe =
    (plan.status === "proposed" && !mine) ||
    (plan.status === "accepted" && isPast && myAnswer === null);
  const over = plan.status === "declined" || plan.status === "cancelled" || plan.status === "missed";
  const verified = plan.status === "confirmed";
  const dot = needsMe
    ? "bg-primary text-primary-contrast"
    : verified
      ? "bg-success/15 text-success"
      : over
        ? "bg-surface-2 text-muted"
        : "bg-primary-tint text-primary";

  return (
    <div className="mx-auto w-full max-w-[88%] overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:opacity-80"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${dot}`}>
          {verified ? <IconCheck size={16} /> : <IconCalendar size={16} />}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[13px] font-medium ${over ? "text-muted line-through" : "text-text"}`}
          >
            {activityLabel(plan.activity)} with {otherName}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted">
            {planDayLabel(plan.scheduledAt)}
            {plan.place ? ` · ${plan.place}` : ""}
          </span>
        </span>
        <IconChevronDown
          size={16}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
      <div className="border-t border-border px-3.5 pb-3 pt-2.5">
      {/* Status / actions */}
        {plan.status === "proposed" && !mine && (
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => respond(true)} className="flex-1">
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
              <Button size="sm" disabled={busy} onClick={() => confirm(true)} className="flex-1">
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
            <IconCheck size={14} /> Verified — logged for both of you
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
      )}
    </div>
  );
}

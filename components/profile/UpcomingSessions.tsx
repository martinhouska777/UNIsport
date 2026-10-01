"use client";

/*
  UPCOMING SESSIONS — the Profile tab's reminder of accepted, still-to-happen
  sessions planned in chat (Slice C). Soonest first; "Today"/"Tomorrow" stand
  out. Tapping a row reopens that conversation (where the plan card lives).
  Hidden entirely when there's nothing to show.
  The rows are WHITE cards (owner, 2026-09-27 — they were the grey surface-2).

  DID THIS HAPPEN? (owner, 2026-09-27 — "both people need to accept it, so
  it's trustworthy"). A planned session counts as trained together, marked
  Verified, only once BOTH say they trained (plan_confirm). That question used
  to live only on the plan card inside the chat, and this list let go of a
  session 12 hours after it started, so nobody was asked again. Now a session
  that has started and is waiting on YOUR answer sits above the upcoming ones,
  with the chat card's own two buttons, for a week (db/plans_to_confirm.sql).
  "Yes, we trained" opens YOUR log sheet for it (onLogPlan) — you write what
  you did, and saving is the yes; the partner shows on it once they say yes
  too. "No-show" answers straight from here and refreshes via `onChanged`.

  Colors are theme tokens (rule 1).
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import {
  confirmPlan,
  listPlansToConfirm,
  listUpcomingPlans,
  planChatHref,
  planDayLabel,
  type PlanToConfirm,
  type UpcomingPlan,
} from "@/lib/supabase/sessionPlans";
import { activityLabel } from "@/lib/supabase/workouts";
import { IconCalendar, IconCheck, IconChevronRight, IconX } from "@/components/icons";

const HEAD = "mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted";

/* The row both lists share: icon, "Gym with Arjun", when · where, chevron. */
function PlanRow({
  plan,
  onOpen,
  waiting = false,
}: {
  plan: UpcomingPlan;
  onOpen: () => void;
  /** waiting on you — the icon fills in the school's colour */
  waiting?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:opacity-80"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          waiting ? "bg-primary text-primary-contrast" : "bg-primary-tint text-primary"
        }`}
      >
        <IconCalendar size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-text">
          {activityLabel(plan.activity)} with {plan.otherName}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted">
          {planDayLabel(plan.scheduledAt)}
          {plan.place ? ` · ${plan.place}` : ""}
        </span>
      </span>
      <IconChevronRight size={16} className="shrink-0 text-muted" />
    </button>
  );
}

export default function UpcomingSessions({
  onChanged,
  onLogPlan,
}: {
  onChanged?: () => void;
  /** "Yes, we trained" — open the log sheet for this plan (saving is the yes). */
  onLogPlan: (p: PlanToConfirm) => void;
}) {
  const router = useRouter();
  const [plans, setPlans] = useState<UpcomingPlan[] | null>(null);
  const [toConfirm, setToConfirm] = useState<PlanToConfirm[]>([]);
  const [reload, setReload] = useState(0); // bumped after an answer
  const [busy, setBusy] = useState<string | null>(null); // the plan being answered
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      listUpcomingPlans().catch(() => [] as UpcomingPlan[]),
      listPlansToConfirm().catch(() => [] as PlanToConfirm[]),
    ]).then(([up, due]) => {
      if (!active) return;
      setPlans(up);
      setToConfirm(due);
    });
    return () => {
      active = false;
    };
  }, [reload]);

  if (!plans) return null;
  // A session waiting on your answer is shown once, in that block.
  const waiting = new Set(toConfirm.map((p) => p.planId));
  const upcoming = plans.filter((p) => !waiting.has(p.planId));
  if (upcoming.length === 0 && toConfirm.length === 0) return null;

  const open = async (p: UpcomingPlan) => {
    try {
      router.push(await planChatHref(p));
    } catch {
      // Ignore — tapping just won't navigate if the DM can't be opened.
    }
  };

  // Only "No-show" is answered from here; "Yes" goes through the log sheet.
  const answer = async (p: PlanToConfirm, attended: boolean) => {
    if (busy) return;
    setBusy(p.planId);
    setError(null);
    try {
      await confirmPlan(p.planId, attended, {
        conversationId: p.conversationId,
        scheduledAt: p.scheduledAt,
      });
      setReload((n) => n + 1);
      onChanged?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 border-b border-border px-3.5 py-3">
      {toConfirm.length > 0 && (
        <div>
          <div className={HEAD}>Did this happen?</div>
          <div className="flex flex-col gap-2">
            {toConfirm.map((p) => (
              <div
                key={p.planId}
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
              >
                <PlanRow plan={p} onOpen={() => open(p)} waiting />
                <div className="flex gap-2 px-3.5 pb-3">
                  <Button
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => onLogPlan(p)}
                    className="flex-1"
                  >
                    <IconCheck size={14} /> Yes, we trained
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => answer(p, false)}
                    className="flex-1"
                  >
                    <IconX size={14} /> No-show
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {error && <div className="mt-1.5 text-[11px] text-danger">{error}</div>}
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <div className={HEAD}>Upcoming sessions</div>
          <div className="flex flex-col gap-2">
            {upcoming.map((p) => (
              <div
                key={p.planId}
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
              >
                <PlanRow plan={p} onOpen={() => open(p)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

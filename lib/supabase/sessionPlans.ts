/*
  Typed client helpers for PLANNED SESSIONS — the "Plan a session" card inside a
  DM thread. These call the SECURITY DEFINER RPCs in db/session_plans.sql, which
  enforce conversation membership via auth.uid(). The plan card itself is read as
  part of the DM thread (see lib/supabase/messages.ts → DmMessage.plan).
*/
import { createClient } from "@/lib/supabase/client";
import { notifyConversation } from "@/lib/push/client";

/** Propose a session in a conversation. Returns the new plan id. */
export async function createPlan(
  conversationId: string,
  input: { activity: string; place: string; scheduledAt: string },
): Promise<string> {
  const { data, error } = await createClient().rpc("plan_create", {
    conversation_id: conversationId,
    p_activity: input.activity,
    p_place: input.place || null,
    p_scheduled_at: input.scheduledAt,
  });
  if (error) throw new Error(`createPlan failed: ${error.message}`);
  // Push the recipient about the invite (fire-and-forget; never blocks the call).
  const where = input.place ? ` at ${input.place}` : "";
  notifyConversation({
    conversationId,
    kind: "plan",
    preview: `${input.activity}${where} · ${planWhenLabel(input.scheduledAt)}`,
  });
  return data as string;
}

/** "Fri, Jun 13 · 3:00 PM" — how a planned session's time reads on its card. */
export function planWhenLabel(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

/*
  Everything below can PING THE OTHER PERSON. A plan is a conversation between
  two people who are not looking at their phones at the same time: proposing one
  already notified, but accepting, declining, cancelling and moving it did not —
  so the person waiting on an answer only found out by opening the chat again.

  `ctx` is optional on purpose. The push is a courtesy, never a requirement: a
  caller that doesn't know its conversation id still performs the action, it just
  doesn't announce it. The RPCs decide who is allowed to do what; this only says
  what happened. Never awaited — see notifyConversation.
*/
export type PlanNotifyContext = {
  conversationId: string;
  /** the plan's time, so the notification can say WHICH session */
  scheduledAt: string;
};

function announce(ctx: PlanNotifyContext | undefined, what: string): void {
  if (!ctx?.conversationId) return;
  notifyConversation({ conversationId: ctx.conversationId, kind: "plan_update", preview: what });
}

/** Accept or decline a proposed session (recipient only). */
export async function respondToPlan(
  planId: string,
  accept: boolean,
  ctx?: PlanNotifyContext,
): Promise<void> {
  const { error } = await createClient().rpc("plan_respond", {
    p_plan_id: planId,
    p_accept: accept,
  });
  if (error) throw new Error(`respondToPlan failed: ${error.message}`);
  const when = ctx ? planWhenLabel(ctx.scheduledAt) : "";
  announce(ctx, accept ? `is in — ${when}` : `can't make ${when}`);
}

/**
 * Answer "did this happen?" for an accepted session. When both people answer
 * yes, the session is confirmed and a verified workout is auto-logged for each.
 * Returns the plan's resulting status.
 */
export async function confirmPlan(
  planId: string,
  attended: boolean,
  ctx?: PlanNotifyContext,
): Promise<string> {
  const { data, error } = await createClient().rpc("plan_confirm", {
    p_plan_id: planId,
    p_attended: attended,
  });
  if (error) throw new Error(`confirmPlan failed: ${error.message}`);
  const status = data as string;
  /*
    Only nudge when saying yes LEAVES THE PLAN OPEN — i.e. the other person
    hasn't answered yet and the session can't be verified without them. If the
    status already came back 'confirmed' they answered first and are about to
    see it in the app anyway. A "no" is never pushed: telling someone by phone
    alert that they've been marked a no-show is a fight, not a notification.
  */
  if (attended && status === "accepted") {
    announce(ctx, "says you trained — confirm it too");
  }
  return status;
}

/** Cancel an open (proposed/accepted) plan. Either participant may cancel. */
export async function cancelPlan(planId: string, ctx?: PlanNotifyContext): Promise<void> {
  const { error } = await createClient().rpc("plan_cancel", { p_plan_id: planId });
  if (error) throw new Error(`cancelPlan failed: ${error.message}`);
  announce(ctx, ctx ? `cancelled ${planWhenLabel(ctx.scheduledAt)}` : "cancelled the session");
}

/** Reschedule an open plan (proposer only) — sends it back for re-acceptance. */
export async function reschedulePlan(
  planId: string,
  input: { activity: string; place: string; scheduledAt: string },
  conversationId?: string,
): Promise<void> {
  const { error } = await createClient().rpc("plan_reschedule", {
    p_plan_id: planId,
    p_activity: input.activity,
    p_place: input.place || null,
    p_scheduled_at: input.scheduledAt,
  });
  if (error) throw new Error(`reschedulePlan failed: ${error.message}`);
  // The NEW time is the point of this one — a reschedule sends the plan back to
  // "proposed", so the other person has to accept again.
  announce(
    conversationId ? { conversationId, scheduledAt: input.scheduledAt } : undefined,
    `moved it to ${planWhenLabel(input.scheduledAt)} — accept again`,
  );
}

// An accepted, still-upcoming session (for the Profile "Upcoming" list).
export type UpcomingPlan = {
  planId: string;
  otherId: string;
  otherName: string;
  activity: string;
  place: string | null;
  scheduledAt: string;
};

/** The caller's accepted, upcoming sessions, soonest first. */
export async function listUpcomingPlans(): Promise<UpcomingPlan[]> {
  const { data, error } = await createClient().rpc("my_upcoming_plans");
  if (error) throw new Error(`listUpcomingPlans failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    planId: r.plan_id as string,
    otherId: r.other_id as string,
    otherName: (r.other_name as string) ?? "Member",
    activity: r.activity as string,
    place: (r.place as string) ?? null,
    scheduledAt: r.scheduled_at as string,
  }));
}

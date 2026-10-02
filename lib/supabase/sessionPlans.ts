/*
  Typed client helpers for PLANNED SESSIONS — the "Plan a session" card inside a
  DM thread. These call the SECURITY DEFINER RPCs in db/session_plans.sql, which
  enforce conversation membership via auth.uid(). The plan card itself is read as
  part of the DM thread (see lib/supabase/messages.ts → DmMessage.plan).
*/
import { clockOf, shortDate } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/client";
import { startDirectConversation } from "@/lib/supabase/messages";
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

/** "Fri 13 Jun · 3:00 PM" — how a planned session's time reads on its card. */
export function planWhenLabel(iso: string): string {
  const d = new Date(iso);
  return `${shortDate(d)} · ${clockOf(d)}`;
}

/*
  "Today · 5:00 PM" / "Tomorrow · 7:30 AM" / "Fri 13 Jun · 3:00 PM" — how a
  plan's time reads on the Profile tab's Upcoming sessions row.
*/
export function planDayLabel(iso: string): string {
  const d = new Date(iso);
  const time = clockOf(d);
  const day0 = new Date();
  day0.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - day0.getTime()) / 86400000);
  if (diff === 0) return `Today · ${time}`;
  if (diff === 1) return `Tomorrow · ${time}`;
  return `${shortDate(d)} · ${time}`;
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
 * Answer "did this happen?" for an accepted session. A "yes" comes from the
 * Log session sheet, right after it saved the person's own session (plan_id
 * set); when both have said yes, the plan is confirmed and both of those
 * sessions become confirmed + verified. Nothing is logged here.
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

/**
 * The link to the chat a plan lives in (the plan card is in that thread). Finds
 * or opens the DM with the other person first.
 *
 * `uid` matters: without it the thread header has no photo and the name isn't
 * tappable through to their profile.
 */
export async function planChatHref(p: Pick<UpcomingPlan, "otherId" | "otherName">): Promise<string> {
  const cid = await startDirectConversation(p.otherId);
  return `/messages?dm=${cid}&name=${encodeURIComponent(p.otherName)}&uid=${encodeURIComponent(p.otherId)}`;
}

/** A session that has happened and is waiting on the caller's "did it?". */
export type PlanToConfirm = UpcomingPlan & { conversationId: string };

/**
 * The caller's accepted sessions that have already started and that they have
 * not yet answered — newest first, a week back at most (db/plans_to_confirm.sql).
 */
export async function listPlansToConfirm(): Promise<PlanToConfirm[]> {
  const { data, error } = await createClient().rpc("my_plans_to_confirm");
  if (error) throw new Error(`listPlansToConfirm failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    planId: r.plan_id as string,
    conversationId: r.conversation_id as string,
    otherId: r.other_id as string,
    otherName: (r.other_name as string) ?? "Member",
    activity: r.activity as string,
    place: (r.place as string) ?? null,
    scheduledAt: r.scheduled_at as string,
  }));
}

/** A session someone else planned with the caller, still waiting for an answer. */
export type PendingInvite = { planId: string; conversationId: string; scheduledAt: string };

/** The caller's unanswered invites that are still to come, soonest first
    (db/pending_invites.sql). The walk opens the chat of the first one. */
export async function listPendingInvites(): Promise<PendingInvite[]> {
  const { data, error } = await createClient().rpc("my_pending_invites");
  if (error) throw new Error(`listPendingInvites failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    planId: r.plan_id as string,
    conversationId: r.conversation_id as string,
    scheduledAt: r.scheduled_at as string,
  }));
}

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

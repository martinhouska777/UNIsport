/*
  Typed client helpers for PLANNED SESSIONS — the "Plan a session" card inside a
  DM thread. These call the SECURITY DEFINER RPCs in db/session_plans.sql, which
  enforce conversation membership via auth.uid(). The plan card itself is read as
  part of the DM thread (see lib/supabase/messages.ts → DmMessage.plan).
*/
import { createClient } from "@/lib/supabase/client";

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
  return data as string;
}

/** "Fri, Jun 13 · 3:00 PM" — how a planned session's time reads on its card. */
export function planWhenLabel(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

/** Accept or decline a proposed session (recipient only). */
export async function respondToPlan(planId: string, accept: boolean): Promise<void> {
  const { error } = await createClient().rpc("plan_respond", {
    p_plan_id: planId,
    p_accept: accept,
  });
  if (error) throw new Error(`respondToPlan failed: ${error.message}`);
}

/**
 * Answer "did this happen?" for an accepted session. When both people answer
 * yes, the session is confirmed and a verified workout is auto-logged for each.
 * Returns the plan's resulting status.
 */
export async function confirmPlan(planId: string, attended: boolean): Promise<string> {
  const { data, error } = await createClient().rpc("plan_confirm", {
    p_plan_id: planId,
    p_attended: attended,
  });
  if (error) throw new Error(`confirmPlan failed: ${error.message}`);
  return data as string;
}

/** Cancel an open (proposed/accepted) plan. Either participant may cancel. */
export async function cancelPlan(planId: string): Promise<void> {
  const { error } = await createClient().rpc("plan_cancel", { p_plan_id: planId });
  if (error) throw new Error(`cancelPlan failed: ${error.message}`);
}

/** Reschedule an open plan (proposer only) — sends it back for re-acceptance. */
export async function reschedulePlan(
  planId: string,
  input: { activity: string; place: string; scheduledAt: string },
): Promise<void> {
  const { error } = await createClient().rpc("plan_reschedule", {
    p_plan_id: planId,
    p_activity: input.activity,
    p_place: input.place || null,
    p_scheduled_at: input.scheduledAt,
  });
  if (error) throw new Error(`reschedulePlan failed: ${error.message}`);
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

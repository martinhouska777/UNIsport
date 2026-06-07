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

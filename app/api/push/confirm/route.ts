/*
  GET /api/push/confirm — "Did you train with Arjun?"

  A planned session is logged for both people, marked Verified, only once
  BOTH answer "yes, we trained" (plan_confirm in db/session_plans.sql). Left to
  the chat, nobody answered. So after the session the phone asks: every
  accepted session 2 to 24 hours past its planned start (owner: "2 hours after
  start") that has not been asked about yet gets one push to each person who
  has not answered. It opens
  the Profile tab, where the Yes / No-show buttons wait
  (components/profile/UpcomingSessions.tsx).

  Once per session: `confirm_reminded_at` is stamped whether or not anyone had
  a device to reach, so a session is never asked about twice. The 24-hour
  edge means a job that was down for a day does not wake everyone up about
  last week.

  RUN EVERY 15 MINUTES BY THE DATABASE (pg_cron → pg_net, db/plan_confirm_push.sql),
  because Vercel's free plan allows a cron only once a day. AUTH: a token that
  lives only in the database (cron_tokens), read with the service-role key —
  or CRON_SECRET, so the platform cron or a manual run can call it too.
  Without either it answers 401/503, never a silent 200.
*/
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendToSubscriptions, hasVapidConfig, type StoredSubscription } from "@/lib/push/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AFTER_START_MIN = 120; // two hours after the planned start (owner, 2026-09-27)
const GIVE_UP_HOURS = 24; // older than this is never asked about by push

const ACTIVITY: Record<string, string> = { gym: "Gym", running: "Running", cardio: "Cardio" };

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

type PlanRow = {
  id: string;
  conv_id: string;
  proposer_id: string;
  activity: string;
  place: string | null;
  proposer_answer: string | null;
  recipient_answer: string | null;
};

export async function GET(request: Request) {
  const supabase = createAdminClient();
  if (!supabase) return Response.json({ error: "no service role" }, { status: 503 });

  const bearer = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  let allowed = !!process.env.CRON_SECRET && same(bearer, process.env.CRON_SECRET);
  if (!allowed && bearer) {
    const { data } = await supabase
      .from("cron_tokens")
      .select("token")
      .eq("name", "plan_confirm")
      .maybeSingle();
    allowed = !!data?.token && same(bearer, data.token as string);
  }
  if (!allowed) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasVapidConfig()) return Response.json({ error: "push unconfigured" }, { status: 503 });

  const now = Date.now();
  const { data: plans, error } = await supabase
    .from("session_plans")
    .select("id, conv_id, proposer_id, activity, place, proposer_answer, recipient_answer")
    .eq("status", "accepted")
    .is("confirm_reminded_at", null)
    .lte("scheduled_at", new Date(now - AFTER_START_MIN * 60_000).toISOString())
    .gte("scheduled_at", new Date(now - GIVE_UP_HOURS * 3_600_000).toISOString());
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const due = (plans ?? []) as PlanRow[];
  if (due.length === 0) return Response.json({ ok: true, plans: 0, sent: 0 });

  // Who is on the other end of each plan.
  const { data: convs } = await supabase
    .from("dm_conversations")
    .select("id, user_lo, user_hi")
    .in("id", [...new Set(due.map((p) => p.conv_id))]);
  const convById = new Map(
    ((convs ?? []) as { id: string; user_lo: string; user_hi: string }[]).map((c) => [c.id, c]),
  );

  // Each person still to answer, with the name of the person they trained with.
  const asks: { planId: string; userId: string; otherId: string; plan: PlanRow }[] = [];
  for (const p of due) {
    const c = convById.get(p.conv_id);
    if (!c) continue;
    const recipient = c.user_lo === p.proposer_id ? c.user_hi : c.user_lo;
    if (p.proposer_answer === null) asks.push({ planId: p.id, userId: p.proposer_id, otherId: recipient, plan: p });
    if (p.recipient_answer === null) asks.push({ planId: p.id, userId: recipient, otherId: p.proposer_id, plan: p });
  }

  const people = [...new Set(asks.flatMap((a) => [a.userId, a.otherId]))];
  const [{ data: profiles }, { data: subs }] = await Promise.all([
    supabase.from("profiles").select("id, data").in("id", people),
    supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")
      .in("user_id", [...new Set(asks.map((a) => a.userId))]),
  ]);
  const profileById = new Map(
    ((profiles ?? []) as { id: string; data: Record<string, unknown> | null }[]).map((p) => [p.id, p.data ?? {}]),
  );
  const subsByUser = new Map<string, StoredSubscription[]>();
  for (const s of (subs ?? []) as (StoredSubscription & { user_id: string })[]) {
    const list = subsByUser.get(s.user_id) ?? [];
    list.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
    subsByUser.set(s.user_id, list);
  }

  let sent = 0;
  const dead: string[] = [];
  for (const a of asks) {
    // Plan notifications switched off → not this one either (same key as db/push_notify.sql).
    if (profileById.get(a.userId)?.notifyPlans === false) continue;
    const devices = subsByUser.get(a.userId);
    if (!devices || devices.length === 0) continue;
    const otherName = (profileById.get(a.otherId)?.name as string | undefined) || "your partner";
    const what = ACTIVITY[a.plan.activity] ?? "Session";
    const result = await sendToSubscriptions(devices, {
      title: `Did you train with ${otherName}?`,
      body: a.plan.place ? `${what} · ${a.plan.place}` : what,
      url: "/profile",
    });
    sent += result.sent;
    dead.push(...result.deadEndpoints);
  }

  // Asked about once, reached or not.
  await supabase
    .from("session_plans")
    .update({ confirm_reminded_at: new Date(now).toISOString() })
    .in("id", due.map((p) => p.id));
  if (dead.length > 0) await supabase.from("push_subscriptions").delete().in("endpoint", dead);

  return Response.json({ ok: true, plans: due.length, asked: asks.length, sent });
}

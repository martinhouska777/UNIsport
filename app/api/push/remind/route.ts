/*
  GET /api/push/remind — the ONE log reminder.

  Logging fuels points, boards, calendar and memories, and it was entirely
  self-started. This sends one push at the time the student already told us
  they train: "Train today? Log it — 10 seconds", deep-linked into the log
  sheet with today's date and their usual gym already filled in.

  RUN HOURLY by the platform cron (vercel.json). On each run it:
    1. works out the campus-local date, weekday and hour (lib/themes.ts holds
       each university's timezone);
    2. finds everyone whose training schedule has a slot STARTING this hour
       today (exact hours and the legacy named blocks both, via lib/schedule);
    3. skips anyone who has already logged today, already been reminded today
       (db/log_reminders.sql), or turned the reminder off (notifyLogReminders);
    4. pushes to their devices and records the send.

  AUTH: there is no signed-in user behind a cron, so this runs with the
  service-role client (lib/supabase/admin.ts) and is guarded by CRON_SECRET,
  which the platform sends as a bearer token. Without either it answers 503,
  never 200 — a reminder that silently does nothing is worse than one that
  says it can't.
*/
import { createAdminClient } from "@/lib/supabase/admin";
import { sendToSubscriptions, hasVapidConfig, type StoredSubscription } from "@/lib/push/server";
import { daySlots } from "@/lib/schedule";
import { universityTimezone } from "@/lib/themes";
import { LOG_REMINDER } from "@/lib/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** The local date (yyyy-mm-dd), weekday key and hour in one timezone. */
function localNow(timezone: string, at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday").toLowerCase().slice(0, 3);
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    day: DAY_KEYS.includes(weekday) ? weekday : "mon",
    hour: Number(get("hour")) || 0,
  };
}

type ProfileRow = {
  id: string;
  data: Record<string, unknown> | null;
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "no CRON_SECRET" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasVapidConfig()) return Response.json({ error: "push unconfigured" }, { status: 503 });
  const supabase = createAdminClient();
  if (!supabase) return Response.json({ error: "no service role" }, { status: 503 });

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, data")
    .eq("onboarding_completed", true);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Group by campus clock, so one run serves every timezone the app is live in.
  const clocks = new Map<string, ReturnType<typeof localNow>>();
  const clockFor = (universityKey: string | undefined) => {
    const tz = universityTimezone(universityKey);
    if (!clocks.has(tz)) clocks.set(tz, localNow(tz));
    return clocks.get(tz)!;
  };

  const due: { id: string; gym: string; date: string }[] = [];
  for (const p of (profiles ?? []) as ProfileRow[]) {
    const d = p.data ?? {};
    if ((d.notifyLogReminders as boolean | undefined) === false) continue;
    const now = clockFor(d.university as string | undefined);
    const schedule = (d.trainingSchedule ?? {}) as Record<string, string[]>;
    const startsNow = daySlots(schedule[now.day]).some(
      (s) => Number(s.start.split(":")[0]) === now.hour,
    );
    if (!startsNow) continue;
    const topGyms = Array.isArray(d.topGyms) ? (d.topGyms as string[]) : [];
    due.push({ id: p.id, gym: topGyms[0] ?? "", date: now.date });
  }
  if (due.length === 0) return Response.json({ ok: true, sent: 0, considered: 0 });

  const ids = due.map((d) => d.id);

  // Already logged today, or already reminded today → not again.
  const [{ data: logged }, { data: reminded }, { data: subs }] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("user_id, log_date")
      .in("user_id", ids)
      .in("log_date", [...new Set(due.map((d) => d.date))]),
    supabase
      .from("log_reminders")
      .select("user_id, sent_on")
      .in("user_id", ids)
      .in("sent_on", [...new Set(due.map((d) => d.date))]),
    supabase.from("push_subscriptions").select("user_id, endpoint, p256dh, auth").in("user_id", ids),
  ]);
  const skip = new Set<string>();
  for (const r of (logged ?? []) as { user_id: string; log_date: string }[]) skip.add(`${r.user_id}|${r.log_date}`);
  for (const r of (reminded ?? []) as { user_id: string; sent_on: string }[]) skip.add(`${r.user_id}|${r.sent_on}`);

  const subsByUser = new Map<string, StoredSubscription[]>();
  for (const s of (subs ?? []) as (StoredSubscription & { user_id: string })[]) {
    const list = subsByUser.get(s.user_id) ?? [];
    list.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
    subsByUser.set(s.user_id, list);
  }

  let sent = 0;
  const dead: string[] = [];
  const sentRows: { user_id: string; sent_on: string }[] = [];
  for (const d of due) {
    if (skip.has(`${d.id}|${d.date}`)) continue;
    const devices = subsByUser.get(d.id);
    if (!devices || devices.length === 0) continue;
    const payload = LOG_REMINDER.payload({ gym: d.gym, date: d.date });
    const result = await sendToSubscriptions(devices, payload);
    dead.push(...result.deadEndpoints);
    if (result.sent > 0) {
      sent += result.sent;
      sentRows.push({ user_id: d.id, sent_on: d.date });
    }
  }

  if (sentRows.length > 0) {
    await supabase.from("log_reminders").upsert(sentRows, { onConflict: "user_id,sent_on" });
  }
  if (dead.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", dead);
  }

  return Response.json({ ok: true, sent, considered: due.length, reminded: sentRows.length });
}

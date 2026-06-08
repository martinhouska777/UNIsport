import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

/*
  Server-side Web Push sender. Configures the `web-push` library with our VAPID
  keys (once) and delivers a payload to every device a user has subscribed.

  Dead subscriptions (the browser was uninstalled / permission revoked) make the
  push service answer 404/410 — we delete those rows so they don't pile up.
*/

export type PushPayload = { title: string; body: string; url?: string; icon?: string };

export function hasVapidConfig(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

type SubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string };

/*
  Send `payload` to all of `userId`'s subscriptions. `supabase` must be a client
  that can read (and delete) this user's rows — for self-notifications that's the
  signed-in user's own cookie client (RLS allows owning your rows). Returns how
  many devices were delivered to.
*/
export async function sendToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<number> {
  if (!hasVapidConfig()) return 0;
  configure();

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return 0;

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    (subs as SubscriptionRow[]).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(s.id);
      }
    })
  );

  if (dead.length) {
    await supabase.from("push_subscriptions").delete().in("id", dead);
  }

  return sent;
}

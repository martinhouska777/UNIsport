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

export type StoredSubscription = { endpoint: string; p256dh: string; auth: string };

/*
  Core sender: deliver `payload` to a list of subscriptions. Returns how many
  were delivered and which endpoints are gone (404/410) so the caller can prune
  them — pruning differs by source (own rows by id vs. peer rows by endpoint).
*/
export async function sendToSubscriptions(
  subs: StoredSubscription[],
  payload: PushPayload
): Promise<{ sent: number; deadEndpoints: string[] }> {
  if (!hasVapidConfig() || subs.length === 0) return { sent: 0, deadEndpoints: [] };
  configure();

  const body = JSON.stringify(payload);
  const deadEndpoints: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) deadEndpoints.push(s.endpoint);
      }
    })
  );

  return { sent, deadEndpoints };
}

/*
  Send `payload` to all of `userId`'s OWN subscriptions. `supabase` is the
  signed-in user's cookie client (RLS allows reading/deleting your own rows) —
  used for self-notifications (the welcome ping + the bell sample). Returns how
  many devices were delivered to.
*/
export async function sendToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<number> {
  if (!hasVapidConfig()) return 0;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return 0;

  const { sent, deadEndpoints } = await sendToSubscriptions(subs as StoredSubscription[], payload);

  if (deadEndpoints.length) {
    await supabase.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
  }

  return sent;
}

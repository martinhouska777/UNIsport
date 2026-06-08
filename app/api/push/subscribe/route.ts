/*
  POST /api/push/subscribe
  Body: { subscription: PushSubscriptionJSON, userAgent?: string }
  Saves (upserts) the browser's push subscription for the signed-in user so the
  server can deliver notifications later. Fails soft: 401 when not signed in,
  503 when push isn't configured — the client treats both as "permission granted,
  just not stored yet" so onboarding still completes.
*/
import { createClient } from "@/lib/supabase/server";
import { hasVapidConfig } from "@/lib/push/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasVapidConfig()) {
    return Response.json({ error: "unconfigured" }, { status: 503 });
  }

  let body: { subscription?: PushSubscriptionJSON; userAgent?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const sub = body.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: "bad_subscription" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  // endpoint is unique → upsert keeps one row per browser, re-syncing keys.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: body.userAgent ?? null,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("push/subscribe:", error.message);
    return Response.json({ error: "save_failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

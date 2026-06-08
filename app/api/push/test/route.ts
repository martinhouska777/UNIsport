/*
  POST /api/push/test
  Body (optional): { title?, body?, url? }
  Sends a notification to the signed-in user's own devices — used for the
  onboarding "welcome" ping and the bell's sample notification. This is the same
  delivery path real events will use later (lib/push/server.ts → sendToUser).
*/
import { createClient } from "@/lib/supabase/server";
import { sendToUser, hasVapidConfig } from "@/lib/push/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasVapidConfig()) {
    return Response.json({ error: "unconfigured" }, { status: 503 });
  }

  let body: { title?: string; body?: string; url?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body is fine — fall back to defaults below */
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const sent = await sendToUser(supabase, user.id, {
    title: body.title ?? "UNIsport",
    body: body.body ?? "Notifications are on. We'll ping you when it matters.",
    url: body.url ?? "/gyms",
  });

  return Response.json({ ok: true, sent });
}

/*
  POST /api/push/unsubscribe
  Body: { endpoint: string }
  Removes a browser's push subscription for the signed-in user (used when the
  user turns notifications off). RLS already limits deletes to the owner's rows.
*/
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { endpoint?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.endpoint) return Response.json({ error: "bad_request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", body.endpoint);

  return Response.json({ ok: true });
}

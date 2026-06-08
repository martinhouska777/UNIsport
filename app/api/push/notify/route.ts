/*
  POST /api/push/notify
  Body: { conversationId: string, kind: "message" | "plan", preview?: string }

  Fired by the sender's browser right after a DM or session plan is saved. Sends
  a real notification to the OTHER person in the conversation. The recipient and
  the sender's name are resolved server-side via SECURITY DEFINER RPCs
  (db/push_notify.sql) — the browser is trusted only for the conversation id and
  a short preview of what it already sent. Fails soft (401/503/membership errors)
  so a failed notification never breaks sending a message.
*/
import { createClient } from "@/lib/supabase/server";
import { sendToSubscriptions, hasVapidConfig, type StoredSubscription } from "@/lib/push/server";

export const runtime = "nodejs";

const clip = (s: string, n = 120) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export async function POST(request: Request) {
  if (!hasVapidConfig()) return Response.json({ error: "unconfigured" }, { status: 503 });

  let body: { conversationId?: string; kind?: string; preview?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const conversationId = body.conversationId;
  const kind = body.kind === "plan" ? "plan" : "message";
  const preview = (body.preview ?? "").trim();
  if (!conversationId) return Response.json({ error: "bad_request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  // The recipient's devices — membership-checked inside the RPC. Errors (e.g. not
  // a participant) fail soft.
  const { data: targets, error } = await supabase.rpc("dm_push_targets", {
    conversation_id: conversationId,
  });
  if (error) return Response.json({ error: "forbidden" }, { status: 403 });

  const subs = (targets as StoredSubscription[]) ?? [];
  if (subs.length === 0) return Response.json({ ok: true, sent: 0 }); // recipient has push off

  // Sender's name, resolved server-side (not trusted from the client).
  const { data: senderName } = await supabase.rpc("my_display_name");
  const who = (senderName as string) || "Someone";

  const payload =
    kind === "plan"
      ? {
          title: "Session invite",
          body: preview ? `${who} proposed a session — ${clip(preview)}` : `${who} proposed a session`,
          url: "/messages",
        }
      : {
          title: who,
          body: preview ? clip(preview) : "sent you a message",
          url: "/messages",
        };

  const { sent, deadEndpoints } = await sendToSubscriptions(subs, payload);

  if (deadEndpoints.length) {
    await supabase.rpc("push_forget", { endpoints: deadEndpoints });
  }

  return Response.json({ ok: true, sent });
}

/*
  POST /api/push/notify
  Body: { kind, ...ids, preview? }

  Every real event notification the app sends, in one route. Three families:

    DM        "message" | "plan" | "plan_update"     needs conversationId
    Social    "follow"                               needs targetId
    Varsity   "team_plan" | "team_lineup" | "note"   the coach telling the squad
                                                     ("note" needs athleteId)

  WHO receives it is never taken from the browser. The caller sends an id for the
  thing that happened and a short preview of what they already wrote; the
  recipients, the sender's name and the team name are resolved server-side by
  SECURITY DEFINER RPCs (db/push_notify.sql, db/varsity_push_notify.sql), which
  also enforce membership — and, for the varsity kinds, that the caller really is
  a coach. Fails soft (401/403/503) so a failed notification never breaks the
  thing it was announcing.
*/
import { createClient } from "@/lib/supabase/server";
import { sendToSubscriptions, hasVapidConfig, type StoredSubscription } from "@/lib/push/server";

export const runtime = "nodejs";

const clip = (s: string, n = 120) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const TEAM_KINDS = ["team_plan", "team_lineup", "note"] as const;
type Kind = "message" | "plan" | "plan_update" | "follow" | (typeof TEAM_KINDS)[number];
const isTeamKind = (k: string): k is (typeof TEAM_KINDS)[number] =>
  (TEAM_KINDS as readonly string[]).includes(k);

export async function POST(request: Request) {
  if (!hasVapidConfig()) return Response.json({ error: "unconfigured" }, { status: 503 });

  let body: {
    conversationId?: string;
    athleteId?: string;
    targetId?: string;
    kind?: string;
    preview?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const raw = body.kind ?? "";
  const kind: Kind = isTeamKind(raw)
    ? raw
    : raw === "plan" || raw === "plan_update" || raw === "follow"
      ? raw
      : "message";
  const preview = (body.preview ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  /* ── Who gets it ── */
  let subs: StoredSubscription[] = [];
  if (isTeamKind(kind)) {
    // The squad, or one athlete for a note. Both RPCs refuse anyone who is not
    // an approved coach of the team, so an athlete cannot push to their squad.
    const { data, error } =
      kind === "note"
        ? body.athleteId
          ? await supabase.rpc("athlete_push_targets", { p_athlete: body.athleteId })
          : { data: null, error: { message: "missing athleteId" } }
        : await supabase.rpc("team_push_targets");
    if (error) return Response.json({ error: "forbidden" }, { status: 403 });
    subs = (data as StoredSubscription[]) ?? [];
  } else if (kind === "follow") {
    // The person who was followed. The RPC refuses unless the follow actually
    // exists, so a made-up id reaches nobody.
    if (!body.targetId) return Response.json({ error: "bad_request" }, { status: 400 });
    const { data, error } = await supabase.rpc("follow_push_targets", { target: body.targetId });
    if (error) return Response.json({ error: "forbidden" }, { status: 403 });
    subs = (data as StoredSubscription[]) ?? [];
  } else {
    if (!body.conversationId) return Response.json({ error: "bad_request" }, { status: 400 });
    const { data, error } = await supabase.rpc("dm_push_targets", {
      conversation_id: body.conversationId,
      // "plan_update" asks the database the same question "plan" does — the
      // recipient's "Session invites" preference governs the whole life of a
      // plan, not just the invite. Mapping it here keeps that one preference
      // in one place instead of adding a second key nobody would find.
      kind: kind === "plan_update" ? "plan" : kind,
    });
    if (error) return Response.json({ error: "forbidden" }, { status: 403 });
    subs = (data as StoredSubscription[]) ?? [];
  }
  if (subs.length === 0) return Response.json({ ok: true, sent: 0 }); // nobody wants it

  // Sender's name, resolved server-side (not trusted from the client).
  const { data: senderName } = await supabase.rpc("my_display_name");
  const who = (senderName as string) || "Someone";

  /* ── What it says ──
     The varsity notifications are titled with the SQUAD, not the coach: on a
     lock screen "Harvard Rowing" is what tells you which part of your life this
     is, and the coach's name is already the only person who could have sent it. */
  let team = "Your squad";
  if (isTeamKind(kind)) {
    const { data: membership } = await supabase.rpc("varsity_my_membership");
    const row = Array.isArray(membership) ? membership[0] : membership;
    team = (row?.team_name as string) || team;
  }

  const payload = {
    message: {
      title: who,
      body: preview ? clip(preview) : "sent you a message",
      url: "/messages",
    },
    plan: {
      title: "Session invite",
      body: preview ? `${who} proposed a session — ${clip(preview)}` : `${who} proposed a session`,
      url: "/messages",
    },
    /* A follow opens the FOLLOWER's profile, not the reader's own — the useful
       next move is looking at who this is and following back. `preview` carries
       a line about them (their sport, their gym) when the caller knows one. */
    follow: {
      title: who,
      body: preview ? `started following you · ${clip(preview)}` : "started following you",
      url: `/people/${user.id}`,
    },
    // Everything that happens to a plan AFTER the invite: accepted, declined,
    // cancelled, moved, or "I've said we trained, your turn". The client sends
    // the verb and the time; the name is still resolved server-side.
    plan_update: {
      title: "Session plan",
      body: preview ? `${who} ${clip(preview)}` : `${who} updated a session`,
      url: "/messages",
    },
    team_plan: {
      title: team,
      body: preview ? `Training published — ${clip(preview)}` : "Your training is published",
      url: "/varsity/home",
    },
    team_lineup: {
      title: team,
      // Deliberately not "you're in the 2 seat": the boats hold the demo roster,
      // so which seat belongs to which ACCOUNT isn't known yet. Says what is
      // true and sends them to the boats.
      body: preview ? `Lineups are up — ${clip(preview)}` : "Lineups are up",
      url: "/varsity/home",
    },
    note: {
      title: `${who} left you a note`,
      body: preview ? clip(preview) : "Open your Home to read it",
      url: "/varsity/home",
    },
  }[kind];

  const { sent, deadEndpoints } = await sendToSubscriptions(subs, payload);

  if (deadEndpoints.length) {
    await supabase.rpc("push_forget", { endpoints: deadEndpoints });
  }

  return Response.json({ ok: true, sent });
}

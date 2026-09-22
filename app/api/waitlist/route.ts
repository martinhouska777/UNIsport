/*
  POST /api/waitlist
  Body: { email: string, firstName?: string, source?: string }

  The one public write endpoint in the app: no session, no invite, anybody.
  db/waitlist.sql explains why that is safe — the table can be added to and
  never read back, and `email` is unique so the same address cannot pile up.

  An address that is already on the list answers 200, not an error. Somebody
  who signs up twice has done nothing wrong and the screen they see is the
  same one either way.
*/
import { createClient } from "@/lib/supabase/server";
import { looksLikeEmail, waitlistSchool, waitlistSource } from "@/lib/waitlist";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string; firstName?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!looksLikeEmail(email)) {
    return Response.json({ error: "bad_email" }, { status: 400 });
  }

  // Capped rather than rejected: a long name is a typo or a joke, and neither
  // is worth an error message in front of somebody trying to join.
  const firstName = (body.firstName ?? "").trim().slice(0, 40) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({
    email,
    first_name: firstName,
    school: waitlistSchool(email),
    source: waitlistSource(body.source),
  });

  // 23505 = unique violation, i.e. already on the list. That is a success.
  if (error && error.code !== "23505") {
    console.error("waitlist:", error.message);
    return Response.json({ error: "save_failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

/*
  POST /api/account/delete
  Deletes the signed-in user's account for good (App Review Guideline 5.1.1(v):
  an app that lets you make an account lets you delete it inside the app).

  Only the service key can delete an auth user, so this runs on the server: it
  reads who is signed in from their own session cookie, then deletes exactly
  that user. Their profile and everything keyed to it go with it ("on delete
  cascade"); db/safety_2026-11-07.sql clears what has no foreign key.

  503 when the service key isn't configured, 401 when not signed in.
*/
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const admin = createAdminClient();
  if (!admin) return Response.json({ error: "unconfigured" }, { status: 503 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("account/delete:", error.message);
    return Response.json({ error: "delete_failed" }, { status: 500 });
  }

  // The session cookie now points at nobody: clear it.
  await supabase.auth.signOut().catch(() => {});
  return Response.json({ ok: true });
}

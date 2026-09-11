/*
  SERVER-ONLY Supabase client with the SERVICE ROLE key.
  ------------------------------------------------------------------------
  Row-Level Security is bypassed by this key, which is exactly why it exists
  only here and only for the one job that has no signed-in user behind it:
  the scheduled log reminder (app/api/push/remind), which runs from a cron and
  has to read every profile's training schedule and every push subscription.

  NEVER import this from a client component, and never expose the key with a
  NEXT_PUBLIC_ prefix. Returns null when the key isn't configured, so the
  reminder route answers 503 rather than crashing.
*/
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

export function hasServiceRole(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient(): SupabaseClient | null {
  if (!hasServiceRole()) return null;
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

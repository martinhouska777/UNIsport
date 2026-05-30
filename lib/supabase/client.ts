import { createBrowserClient } from "@supabase/ssr";

// True when the Supabase env vars are configured (so we never crash if they're missing).
export const hasSupabaseEnv = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/*
  Browser-side Supabase client (for use in Client Components).
  Reads the public env vars (safe to expose). Not wired into the app yet —
  real sign-in replaces the demo login in a later slice.
*/
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

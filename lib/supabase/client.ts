import { createBrowserClient } from "@supabase/ssr";

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

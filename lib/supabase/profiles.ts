/*
  Typed client helper for reading ANOTHER person's public profile.

  profiles has Row-Level Security (a user can only read their own row), so we
  can't SELECT someone else's profile directly. Instead we call the SECURITY
  DEFINER function get_public_profile(id) defined in db/public_profile.sql, which
  returns a curated, public-safe SUBSET of the onboarding json — shaped so the
  caller can hand it straight to profileFromOnboarding() in lib/currentUser.ts.
*/
import { createClient } from "@/lib/supabase/client";

/**
 * Fetch one person's public profile json by their profile id.
 * Returns null if the id is unknown or that user hasn't finished onboarding.
 */
export async function getPublicProfile(
  profileId: string,
): Promise<Record<string, unknown> | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_public_profile", {
    profile_id: profileId,
  });
  if (error) throw new Error(`getPublicProfile failed: ${error.message}`);
  return (data as Record<string, unknown> | null) ?? null;
}

/*
  Typed client helpers for the follow graph (db/follows.sql). All calls go
  through SECURITY DEFINER RPCs that act for the signed-in user (auth.uid()).
*/
import { createClient } from "@/lib/supabase/client";

export type FollowStatus = {
  following: boolean; // do I follow this person?
  followers: number; // their follower count
  followsBack: boolean; // do they follow me?
};

export async function followUser(targetId: string): Promise<void> {
  const { error } = await createClient().rpc("follow_user", { target: targetId });
  if (error) throw new Error(`followUser failed: ${error.message}`);
}

export async function unfollowUser(targetId: string): Promise<void> {
  const { error } = await createClient().rpc("unfollow_user", { target: targetId });
  if (error) throw new Error(`unfollowUser failed: ${error.message}`);
}

export async function getFollowStatus(targetId: string): Promise<FollowStatus> {
  const { data, error } = await createClient().rpc("follow_status", { target: targetId });
  if (error) throw new Error(`getFollowStatus failed: ${error.message}`);
  const row = (data as Record<string, unknown>[])[0] ?? {};
  return {
    following: !!row.following,
    followers: Number(row.followers ?? 0),
    followsBack: !!row.follows_back,
  };
}

/** The signed-in user's own following / followers totals. */
export async function getMyFollowCounts(): Promise<{ following: number; followers: number }> {
  const { data, error } = await createClient().rpc("my_follow_counts");
  if (error) throw new Error(`getMyFollowCounts failed: ${error.message}`);
  const row = (data as Record<string, unknown>[])[0] ?? {};
  return { following: Number(row.following ?? 0), followers: Number(row.followers ?? 0) };
}

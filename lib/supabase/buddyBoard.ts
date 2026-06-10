/*
  Typed client helpers for the Gym Buddy Board. These call the SECURITY DEFINER
  RPCs in db/buddy_board.sql, which enforce who can post/delete using auth.uid().
  Nothing here is faked — the board is real rows in public.buddy_posts.
*/
import { createClient } from "@/lib/supabase/client";

// A post as shown on the open board (someone else's).
export type BuddyPost = {
  id: string;
  author: string;
  focus: string;
  day: string;
  timeOfDay: string;
  gym: string | null;
  note: string | null;
  createdAt: string;
  authorName: string;
  authorPhoto: string | null;
};

// One of the caller's own posts (no author identity needed — it's them).
export type MyBuddyPost = {
  id: string;
  focus: string;
  day: string;
  timeOfDay: string;
  gym: string | null;
  note: string | null;
  createdAt: string;
};

export type BuddyFilters = {
  focus?: string | null;
  day?: string | null;
  timeOfDay?: string | null;
};

/** Post "looking for a partner". Returns the new post id. */
export async function createBuddyPost(input: {
  focus: string;
  day: string;
  timeOfDay: string;
  gym?: string | null;
  note?: string | null;
}): Promise<string> {
  const { data, error } = await createClient().rpc("buddy_post_create", {
    p_focus: input.focus,
    p_day: input.day,
    p_time_of_day: input.timeOfDay,
    p_gym: input.gym ?? null,
    p_note: input.note ?? null,
  });
  if (error) throw new Error(`createBuddyPost failed: ${error.message}`);
  return data as string;
}

/** The open board: other people's non-expired posts, optionally filtered. */
export async function listBuddyBoard(filters: BuddyFilters = {}): Promise<BuddyPost[]> {
  const { data, error } = await createClient().rpc("buddy_board_list", {
    focus_filter: filters.focus ?? null,
    day_filter: filters.day ?? null,
    time_filter: filters.timeOfDay ?? null,
  });
  if (error) throw new Error(`listBuddyBoard failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    author: r.author as string,
    focus: r.focus as string,
    day: r.day as string,
    timeOfDay: r.time_of_day as string,
    gym: (r.gym as string) ?? null,
    note: (r.note as string) ?? null,
    createdAt: r.created_at as string,
    authorName: (r.author_name as string) ?? "Member",
    authorPhoto: (r.author_photo as string) ?? null,
  }));
}

/** The caller's own active posts. */
export async function listMyBuddyPosts(): Promise<MyBuddyPost[]> {
  const { data, error } = await createClient().rpc("buddy_my_posts");
  if (error) throw new Error(`listMyBuddyPosts failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    focus: r.focus as string,
    day: r.day as string,
    timeOfDay: r.time_of_day as string,
    gym: (r.gym as string) ?? null,
    note: (r.note as string) ?? null,
    createdAt: r.created_at as string,
  }));
}

/** Remove one of the caller's own posts. */
export async function deleteBuddyPost(postId: string): Promise<void> {
  const { error } = await createClient().rpc("buddy_post_delete", { post_id: postId });
  if (error) throw new Error(`deleteBuddyPost failed: ${error.message}`);
}

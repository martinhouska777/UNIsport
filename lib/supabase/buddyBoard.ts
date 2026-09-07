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
  date: string | null; // yyyy-mm-dd — WHICH Monday. Null on pre-dates posts.
  day: string;
  hour: number | null; // 24h clock, 30-min steps. Null on pre-hours posts.
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
  date: string | null;
  day: string;
  hour: number | null;
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
  date: string; // yyyy-mm-dd
  hour: number;
  gym?: string | null;
  note?: string | null;
}): Promise<string> {
  const { data, error } = await createClient().rpc("buddy_post_create", {
    p_focus: input.focus,
    p_date: input.date,
    p_hour: input.hour,
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
  return (data as Record<string, unknown>[]).map(toBuddyPost);
}

// One row -> one post. Shared by the open board and the session search, so the
// two can never drift into reading the same row differently.
function toBuddyPost(r: Record<string, unknown>): BuddyPost {
  return {
    id: r.id as string,
    author: r.author as string,
    focus: r.focus as string,
    date: (r.post_date as string) ?? null,
    day: r.day as string,
    // numeric comes back as a string from PostgREST; null stays null.
    hour: r.hour == null ? null : Number(r.hour),
    timeOfDay: r.time_of_day as string,
    gym: (r.gym as string) ?? null,
    note: (r.note as string) ?? null,
    createdAt: r.created_at as string,
    authorName: (r.author_name as string) ?? "Member",
    authorPhoto: (r.author_photo as string) ?? null,
  };
}

/*
  WHO PUT THEIR HAND UP FOR THIS SESSION.

  The same question the session search asks ("running, Thursday, around 9"),
  answered from the board instead of from people's general schedules. A schedule
  says somebody is usually free; a post says they are looking right now — so
  these belong ABOVE the schedule matches, not mixed into them.

  Closest to the hour you asked for comes first.
*/
export async function buddyForSession(input: {
  activity: string;
  day: string;
  hour: number;
  windowHours?: number;
}): Promise<BuddyPost[]> {
  const { data, error } = await createClient().rpc("buddy_for_session", {
    activity_filter: input.activity,
    day_filter: input.day,
    target_hour: input.hour,
    window_hours: input.windowHours ?? 2,
  });
  if (error) throw new Error(`buddyForSession failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map(toBuddyPost);
}

/** The caller's own active posts. */
export async function listMyBuddyPosts(): Promise<MyBuddyPost[]> {
  const { data, error } = await createClient().rpc("buddy_my_posts");
  if (error) throw new Error(`listMyBuddyPosts failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    focus: r.focus as string,
    date: (r.post_date as string) ?? null,
    day: r.day as string,
    // numeric comes back as a string from PostgREST; null stays null.
    hour: r.hour == null ? null : Number(r.hour),
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

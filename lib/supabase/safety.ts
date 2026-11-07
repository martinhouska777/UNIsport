/*
  BLOCK AND REPORT (db/safety_2026-11-07.sql), the client side.

  Blocking hides both people from each other everywhere the app lists people:
  Match, the Sessions board, Messages, channel messages and gym comments. The
  ids come from blocked_ids() once and are kept here, so every screen reads the
  same set; a block or unblock refreshes it and tells every screen at once.
*/
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CHANGED = "unisport:blocks-changed";

let cached: Set<string> | null = null;
let loading: Promise<Set<string>> | null = null;

async function fetchBlockedIds(): Promise<Set<string>> {
  const { data, error } = await createClient().rpc("blocked_ids");
  // Before the SQL is run the function is missing: nobody is hidden.
  if (error) return new Set();
  return new Set(((data as unknown[]) ?? []).map((r) => String(r)));
}

export function getBlockedIds(): Promise<Set<string>> {
  if (cached) return Promise.resolve(cached);
  if (!loading) {
    loading = fetchBlockedIds().then((s) => {
      cached = s;
      loading = null;
      return s;
    });
  }
  return loading;
}

function refresh() {
  cached = null;
  loading = null;
  getBlockedIds().then(() => window.dispatchEvent(new Event(CHANGED)));
}

/** Everyone hidden from you, and you from them. Empty until it has loaded. */
export function useBlockedIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => cached ?? new Set());
  useEffect(() => {
    let active = true;
    const load = () => getBlockedIds().then((s) => active && setIds(s));
    load();
    window.addEventListener(CHANGED, load);
    return () => {
      active = false;
      window.removeEventListener(CHANGED, load);
    };
  }, []);
  return ids;
}

/** True once the set has loaded and this person is in it. */
export function useIsBlocked(id: string | null | undefined): boolean {
  const ids = useBlockedIds();
  return !!id && ids.has(id);
}

export async function blockUser(id: string): Promise<void> {
  const { error } = await createClient().from("blocks").insert({ blocked_id: id });
  // Already blocked counts as done.
  if (error && error.code !== "23505") throw new Error(error.message);
  refresh();
}

export async function unblockUser(id: string): Promise<void> {
  const { error } = await createClient().from("blocks").delete().eq("blocked_id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export type BlockedPerson = { id: string; name: string; photo: string | null };

export async function listBlocked(): Promise<BlockedPerson[]> {
  const { data, error } = await createClient().rpc("blocked_people");
  if (error) throw new Error(error.message);
  return ((data as Record<string, unknown>[]) ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? "Member"),
    photo: (r.photo as string | null) ?? null,
  }));
}

/* ---- REPORT ------------------------------------------------------------- */

export type ReportKind = "person" | "message" | "post" | "review";

/** The reasons, Instagram's list cut to what fits a training app. */
export const REPORT_REASONS = [
  "Spam",
  "Harassment or bullying",
  "Hate speech",
  "Nudity or sexual content",
  "Violence or threats",
  "Fake account",
  "Something else",
] as const;

export async function fileReport(r: {
  kind: ReportKind;
  userId: string | null;
  targetId?: string | null;
  body?: string | null;
  reason: string;
}): Promise<void> {
  const { error } = await createClient().from("reports").insert({
    kind: r.kind,
    reported_user: r.userId,
    target_id: r.targetId ?? null,
    body: r.body ?? null,
    reason: r.reason,
  });
  if (error) throw new Error(error.message);
}

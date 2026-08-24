/*
  VARSITY MEMBERSHIP — who you are on a squad, and what that lets you do.
  ---------------------------------------------------------------------------
  Backed by db/varsity_teams.sql. Every call here is an RPC into a function that
  re-checks the caller's role on the server, so nothing in this file is a real
  security boundary — it only decides what to SHOW. The database decides what
  anyone may actually do.

  The three roles and their powers live HERE as data (rule 7): to change what a
  captain may do, change `can` below and the matching check in the SQL — never
  scatter "if role === coach" through the screens.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

export type VarsityRole = "coach" | "captain" | "athlete";
export type MemberStatus = "pending" | "approved";

export type Membership = {
  teamId: string;
  teamName: string;
  role: VarsityRole;
  status: MemberStatus;
};

/* ── What each role may do ──────────────────────────────────────────────────
   The owner's rule: a captain handles invites but CANNOT build plans. */
export const can = {
  buildPlan: (r: VarsityRole) => r === "coach",
  buildLineup: (r: VarsityRole) => r === "coach",
  writeNotes: (r: VarsityRole) => r === "coach",
  invite: (r: VarsityRole) => r === "coach" || r === "captain",
  changeRoles: (r: VarsityRole) => r === "coach",
  // Reading a squad member's own training diary. Coach only — a captain runs
  // the invites, but is still a peer on the squad. The database enforces the
  // same split in db/varsity_coach_reads.sql; this only hides the door.
  readTraining: (r: VarsityRole) => r === "coach",
};

// True if this person may open the Coach Console at all (in any form).
export const canOpenConsole = (r: VarsityRole) => can.invite(r) || can.buildPlan(r);

export const roleLabel: Record<VarsityRole, string> = {
  coach: "Coach",
  captain: "Captain",
  athlete: "Athlete",
};

/* ── Who am I? ──────────────────────────────────────────────────────────────
   Returns null when this account is on no team at all — which is the normal
   case for a regular student, and what hides Varsity from the mode switcher.

   THROWS if the lookup itself fails. It used to swallow the error and return
   null, which made a database blip indistinguishable from "you are on no
   team" — and the screens act on that answer by sending you to /join, i.e. a
   member gets told to go find an invite. Callers go through loadMembership()
   below, which retries and never remembers a failure. */
export async function fetchMyMembership(userId: string | null): Promise<Membership | null> {
  if (!userId || !hasSupabaseEnv()) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("varsity_my_membership");
  if (error) throw new Error(error.message);
  const row = (data as { team_id: string; team_name: string; role: string; status: string }[])?.[0];
  if (!row) return null;
  return {
    teamId: row.team_id,
    teamName: row.team_name,
    role: row.role as VarsityRole,
    status: row.status as MemberStatus,
  };
}

/* ── Start a squad. The caller becomes its coach (the only way a first coach
     exists — everyone after that is invited). ── */
export async function createTeam(
  name: string,
  emailDomain: string | null,
): Promise<{ teamId?: string; error?: string }> {
  if (!hasSupabaseEnv()) return { error: "No database configured" };
  const supabase = createClient();
  const { data, error } = await supabase.rpc("varsity_create_team", {
    p_name: name,
    p_email_domain: emailDomain,
  });
  return error ? { error: error.message } : { teamId: data as string };
}

/* ── The squad list for the admin screen ── */
export type SquadMember = {
  userId: string;
  name: string;
  email: string;
  role: VarsityRole;
  status: MemberStatus;
  inviteLabel: string;
  createdAt: string;
};

export async function fetchSquad(teamId: string): Promise<SquadMember[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = createClient();
  const { data, error } = await supabase.rpc("varsity_squad", { p_team: teamId });
  if (error || !data) {
    console.error("fetchSquad:", error?.message);
    return [];
  }
  return (data as Record<string, string>[]).map((r) => ({
    userId: r.user_id,
    name: r.name,
    email: r.email ?? "",
    role: r.role as VarsityRole,
    status: r.status as MemberStatus,
    inviteLabel: r.invite_label ?? "",
    createdAt: r.created_at,
  }));
}

/* ── Approve someone out of the waiting room, send them back to it, or remove
     them from the squad entirely. Coach or captain. ── */
export async function setMemberStatus(
  teamId: string,
  userId: string,
  status: MemberStatus | "removed",
): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: "No database configured" };
  const supabase = createClient();
  const { error } = await supabase.rpc("varsity_set_member_status", {
    p_team: teamId,
    p_user: userId,
    p_status: status,
  });
  return error ? { error: error.message } : {};
}

/* ── Promote / demote. Coach only — the server enforces it too. ── */
export async function setMemberRole(
  teamId: string,
  userId: string,
  role: VarsityRole,
): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: "No database configured" };
  const supabase = createClient();
  const { error } = await supabase.rpc("varsity_set_member_role", {
    p_team: teamId,
    p_user: userId,
    p_role: role,
  });
  return error ? { error: error.message } : {};
}

/* ── ONE ANSWER PER ACCOUNT ─────────────────────────────────────────────────
   Eleven screens ask "am I on a squad?" and they each used to ask the database
   themselves, every mount, each starting from its own "don't know yet — so,
   no team". That blank start is the bug the owner hit: the mode switcher acts
   on the answer, and an unknown answer looked exactly like being on no team,
   so tapping Varsity before the reply landed sent a member to /join.

   So the answer is remembered here, per account, and handed to every later
   asker straight away; askers that overlap share one request. A FAILURE is
   never remembered and is retried — a blip must not read as being thrown out
   of your own squad for the rest of the session. */

export type MembershipAnswer = {
  membership: Membership | null;
  /** True only after the lookup has been tried and kept failing. */
  failed: boolean;
};

let cache: { userId: string; answer: MembershipAnswer } | null = null;
let inFlight: { userId: string; promise: Promise<MembershipAnswer> } | null = null;

/** The answer we already hold for this account, or null if we hold none. */
export function peekMembership(userId: string | null): MembershipAnswer | null {
  return userId && cache?.userId === userId ? cache.answer : null;
}

/** Throw away what we hold — on sign-out, and when something changed it. */
export function clearMembershipCache() {
  cache = null;
  inFlight = null;
}

const RETRY_DELAYS_MS = [300, 900]; // two more tries before giving up

async function ask(userId: string): Promise<MembershipAnswer> {
  for (let attempt = 0; ; attempt++) {
    try {
      const membership = await fetchMyMembership(userId);
      cache = { userId, answer: { membership, failed: false } };
      return cache.answer;
    } catch (e) {
      if (attempt >= RETRY_DELAYS_MS.length) {
        console.error("membership lookup failed:", e);
        return { membership: null, failed: true }; // NOT cached
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
}

/** Ask, reusing what we hold. `force` re-asks the database (polling for an
    approval, or after changing the squad). */
export function loadMembership(userId: string, force = false): Promise<MembershipAnswer> {
  if (!force) {
    const held = peekMembership(userId);
    if (held) return Promise.resolve(held);
    if (inFlight?.userId === userId) return inFlight.promise;
  }
  const promise = ask(userId).finally(() => {
    if (inFlight?.promise === promise) inFlight = null;
  });
  inFlight = { userId, promise };
  return promise;
}

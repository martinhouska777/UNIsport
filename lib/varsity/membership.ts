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
   case for a regular student, and what hides Varsity from the mode switcher. */
export async function fetchMyMembership(userId: string | null): Promise<Membership | null> {
  if (!userId || !hasSupabaseEnv()) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("varsity_my_membership");
  if (error) {
    // A database that hasn't run varsity_teams.sql yet just means "no team".
    console.error("fetchMyMembership:", error.message);
    return null;
  }
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

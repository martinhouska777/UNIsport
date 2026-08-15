/*
  VARSITY INVITE LINKS — generate, share, redeem, revoke.
  ---------------------------------------------------------------------------
  A link is deliberately NOT the thing that grants access: redeeming one puts
  you in the waiting room, and a captain approves you. See db/varsity_teams.sql
  for the rules the server enforces (expiry, use cap, email domain, revoke).

  The two link shapes the captain gets are DATA (`invitePresets`) so changing
  the defaults is a data edit, not a component change.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

/* ── The two buttons the captain sees ── */
export type InvitePreset = {
  key: "squad" | "personal";
  title: string;
  blurb: string;
  maxUses: number;
  days: number;
  label: string;
  needsEmail: boolean; // a personal link is locked to one address
};

export const invitePresets: InvitePreset[] = [
  {
    key: "squad",
    title: "Invite the squad",
    blurb: "One link for the team chat. Expires in 7 days, up to 45 people, each one approved by you.",
    maxUses: 45,
    days: 7,
    label: "Squad link",
    needsEmail: false,
  },
  {
    key: "personal",
    title: "Invite one person",
    blurb: "Locked to their university email and usable once. Forwarding it does nothing.",
    maxUses: 1,
    days: 7,
    label: "Personal link",
    needsEmail: true,
  },
];

export type Invite = {
  id: string;
  code: string;
  label: string;
  maxUses: number;
  uses: number;
  expiresAt: string;
  emailLock: string | null;
  autoApprove: boolean;
  revokedAt: string | null;
  createdAt: string;
};

// Is this link still usable right now? (The server checks the same three
// things on redemption — this is only for what the captain's list shows.)
export function inviteState(i: Invite): "live" | "revoked" | "expired" | "used_up" {
  if (i.revokedAt) return "revoked";
  if (new Date(i.expiresAt).getTime() < Date.now()) return "expired";
  if (i.uses >= i.maxUses) return "used_up";
  return "live";
}

// The full URL to paste into WhatsApp or an email.
export function inviteUrl(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/join/${code}`;
}

// Where a code is parked when someone taps a link before signing in, so it
// survives the trip through sign-in / onboarding.
export const PENDING_INVITE_KEY = "unisport.pendingInvite";

/*
  People paste whatever they were sent: the whole URL, the code alone, or the
  code with spaces from a chat app. Pull the code out of any of them. Returns ""
  when there is nothing code-shaped in the input.
*/
export function extractInviteCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const fromUrl = trimmed.match(/\/join\/([A-Za-z0-9]+)/);
  const raw = fromUrl ? fromUrl[1] : trimmed;
  // Strip anything that isn't part of the alphabet the server generates.
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/* ── Why a code didn't work, in plain English for the joining athlete ── */
export const redeemMessage: Record<string, string> = {
  unknown: "We don't recognise this link. Check you copied the whole thing.",
  revoked: "This link was cancelled by the team. Ask your captain for a new one.",
  expired: "This link has expired. Ask your captain for a new one.",
  used_up: "This link has already been used by as many people as it allows.",
  wrong_email: "This invite was made for a different email address.",
  wrong_domain: "This team only accepts university email addresses.",
};

/*
  The same refusal reads very differently depending on the kind of link. A
  personal invite is deliberately single-use, so "already used" is the system
  working — say so, rather than leaving someone thinking the link is broken.
*/
export function refusalMessage(reason: string | undefined, personal?: boolean): string {
  if (personal && reason === "used_up") {
    return "This invite was for one person and has already been used. Ask your captain for a new one.";
  }
  return redeemMessage[reason ?? "unknown"] ?? redeemMessage.unknown;
}

/* ── Look at a code without spending it (so the join page can name the team) ── */
export type InvitePreview = {
  valid: boolean;
  reason?: string;
  teamName?: string;
  emailDomain?: string | null;
  personal?: boolean;
  autoApprove?: boolean;
  expiresAt?: string;
};

export async function previewInvite(code: string): Promise<InvitePreview> {
  if (!hasSupabaseEnv()) return { valid: false, reason: "unknown" };
  const supabase = createClient();
  const { data, error } = await supabase.rpc("varsity_invite_preview", { p_code: code });
  if (error || !data) return { valid: false, reason: "unknown" };
  const d = data as Record<string, unknown>;
  return {
    valid: !!d.valid,
    reason: d.reason as string | undefined,
    teamName: d.team_name as string | undefined,
    emailDomain: (d.email_domain as string | null) ?? null,
    personal: !!d.personal,
    autoApprove: !!d.auto_approve,
    expiresAt: d.expires_at as string | undefined,
  };
}

/* ── Redeem it. Success means "pending" far more often than "approved". ── */
export type RedeemResult = {
  ok: boolean;
  reason?: string;
  status?: "pending" | "approved";
  teamName?: string;
  already?: boolean;
};

export async function redeemInvite(code: string): Promise<RedeemResult> {
  if (!hasSupabaseEnv()) return { ok: false, reason: "unknown" };
  const supabase = createClient();
  const { data, error } = await supabase.rpc("varsity_redeem_invite", { p_code: code });
  if (error) return { ok: false, reason: error.message };
  const d = data as Record<string, unknown>;
  return {
    ok: !!d.ok,
    reason: d.reason as string | undefined,
    status: d.status as "pending" | "approved" | undefined,
    teamName: d.team_name as string | undefined,
    already: !!d.already,
  };
}

/* ── Captain side: make one, list them, kill one ── */
export async function createInvite(
  teamId: string,
  opts: { label: string; maxUses: number; days: number; emailLock?: string | null; autoApprove?: boolean },
): Promise<{ code?: string; error?: string }> {
  if (!hasSupabaseEnv()) return { error: "No database configured" };
  const supabase = createClient();
  const { data, error } = await supabase.rpc("varsity_create_invite", {
    p_team: teamId,
    p_label: opts.label,
    p_max_uses: opts.maxUses,
    p_days: opts.days,
    p_email_lock: opts.emailLock ?? null,
    p_auto_approve: opts.autoApprove ?? false,
  });
  if (error) return { error: error.message };
  const row = (data as { code: string }[])?.[0];
  return row ? { code: row.code } : { error: "Could not create the link" };
}

export async function listInvites(teamId: string): Promise<Invite[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = createClient();
  const { data, error } = await supabase.rpc("varsity_invite_list", { p_team: teamId });
  if (error || !data) {
    console.error("listInvites:", error?.message);
    return [];
  }
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    code: r.code as string,
    label: (r.label as string) ?? "",
    maxUses: r.max_uses as number,
    uses: r.uses as number,
    expiresAt: r.expires_at as string,
    emailLock: (r.email_lock as string | null) ?? null,
    autoApprove: !!r.auto_approve,
    revokedAt: (r.revoked_at as string | null) ?? null,
    createdAt: r.created_at as string,
  }));
}

export async function revokeInvite(inviteId: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: "No database configured" };
  const supabase = createClient();
  const { error } = await supabase.rpc("varsity_revoke_invite", { p_invite: inviteId });
  return error ? { error: error.message } : {};
}

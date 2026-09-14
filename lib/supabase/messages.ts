/*
  Typed client helpers for the Messages tab — Direct (1:1) conversations and
  Community channels. These call the SECURITY DEFINER RPCs in db/messages.sql,
  which enforce who can read/post using auth.uid(). Nothing here is faked.
*/
import { createClient } from "@/lib/supabase/client";
import { notifyConversation } from "@/lib/push/client";

// --- Direct messages -------------------------------------------------------

export type DmConversation = {
  conversationId: string;
  otherId: string;
  otherName: string;
  lastBody: string | null;
  lastAt: string | null;
  lastFromMe: boolean;
  unread: number;
};

// A plan card carried inline in a thread (kind === 'plan').
export type DmPlan = {
  planId: string;
  activity: string;
  place: string | null;
  scheduledAt: string;
  status: "proposed" | "accepted" | "declined" | "confirmed" | "missed" | "cancelled";
  proposerAnswer: "yes" | "no" | null; // after-the-fact "did it happen?" answers
  recipientAnswer: "yes" | "no" | null;
};

export type DmMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  kind: "text" | "plan";
  plan?: DmPlan; // present when kind === 'plan'
};

/** Find or create the conversation with another user; returns its id. */
export async function startDirectConversation(otherId: string): Promise<string> {
  const { data, error } = await createClient().rpc("dm_start", { other_id: otherId });
  if (error) throw new Error(`startDirectConversation failed: ${error.message}`);
  return data as string;
}

export async function listDirectConversations(): Promise<DmConversation[]> {
  const { data, error } = await createClient().rpc("dm_list");
  if (error) throw new Error(`listDirectConversations failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    conversationId: r.conversation_id as string,
    otherId: r.other_id as string,
    otherName: (r.other_name as string) ?? "Member",
    lastBody: (r.last_body as string) ?? null,
    lastAt: (r.last_at as string) ?? null,
    lastFromMe: !!r.last_from_me,
    unread: Number(r.unread ?? 0),
  }));
}

export async function getDirectThread(conversationId: string): Promise<DmMessage[]> {
  const { data, error } = await createClient().rpc("dm_thread", {
    conversation_id: conversationId,
  });
  if (error) throw new Error(`getDirectThread failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map(toDmMessage);
}

export async function sendDirectMessage(
  conversationId: string,
  body: string,
): Promise<DmMessage> {
  const { data, error } = await createClient().rpc("dm_send", {
    conversation_id: conversationId,
    message_text: body,
  });
  if (error) throw new Error(`sendDirectMessage failed: ${error.message}`);
  const message = toDmMessage((data as Record<string, unknown>[])[0]);
  // Push the recipient (fire-and-forget; never blocks or fails the send).
  notifyConversation({ conversationId, kind: "message", preview: message.body });
  return message;
}

/**
 * The other person's last-read time for a conversation (ISO string, or null if
 * they've never opened it). Used to show "Read" vs "Delivered" on your messages.
 */
export async function getPeerLastRead(conversationId: string): Promise<string | null> {
  const { data, error } = await createClient().rpc("dm_peer_read", {
    conversation_id: conversationId,
  });
  if (error) throw new Error(`getPeerLastRead failed: ${error.message}`);
  return (data as string | null) ?? null;
}

function toDmMessage(r: Record<string, unknown>): DmMessage {
  const kind = (r.kind as string) === "plan" ? "plan" : "text";
  return {
    id: r.id as string,
    senderId: r.sender_id as string,
    senderName: (r.sender_name as string) ?? "",
    body: r.body as string,
    createdAt: r.created_at as string,
    kind,
    ...(kind === "plan" && r.plan_id
      ? {
          plan: {
            planId: r.plan_id as string,
            activity: (r.plan_activity as string) ?? "",
            place: (r.plan_place as string) ?? null,
            scheduledAt: r.plan_scheduled_at as string,
            status: ((r.plan_status as string) ?? "proposed") as DmPlan["status"],
            proposerAnswer: (r.plan_proposer_answer as DmPlan["proposerAnswer"]) ?? null,
            recipientAnswer: (r.plan_recipient_answer as DmPlan["recipientAnswer"]) ?? null,
          },
        }
      : {}),
  };
}

// --- Community channels ----------------------------------------------------

export type Channel = {
  channelId: string;
  key: string;
  name: string;
  icon: string;
  lastBody: string | null;
  lastSenderName: string | null;
  lastAt: string | null;
  unread: number;
  joined: boolean;
  /** You started this channel. */
  mine: boolean;
  /** Only the people added can see it (db/channels_private.sql). */
  private: boolean;
};

/** Someone you could add to a private channel. */
export type ChannelPerson = {
  id: string;
  name: string;
  residence: string | null;
  classYear: string | null;
  photo: string | null;
};

export type ChannelMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderResidence: string | null;
  senderClassYear: string | null;
  body: string;
  createdAt: string;
};

/**
 * Every channel you can see: the every-school ones, your school's (`uni` is the
 * app's university key — db/channels_community.sql), and any you started.
 */
export async function listChannels(uni: string | null): Promise<Channel[]> {
  const { data, error } = await createClient().rpc("channel_list", { uni: uni || null });
  if (error) throw new Error(`listChannels failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    channelId: r.channel_id as string,
    key: r.key as string,
    name: r.name as string,
    icon: (r.icon as string) ?? "message",
    lastBody: (r.last_body as string) ?? null,
    lastSenderName: (r.last_sender_name as string) ?? null,
    lastAt: (r.last_at as string) ?? null,
    unread: Number(r.unread ?? 0),
    joined: !!r.joined,
    mine: !!r.mine,
    private: !!r.private,
  }));
}

/**
 * People to add to a channel. Nothing typed → the people you know (you have a
 * chat with them or follow them); a name typed → anyone whose name matches.
 */
export async function findChannelPeople(query: string): Promise<ChannelPerson[]> {
  const { data, error } = await createClient().rpc("channel_people", { q: query.trim() || null });
  if (error) throw new Error(`findChannelPeople failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: (r.name as string) || "Member",
    residence: (r.residence as string) ?? null,
    classYear: (r.class_year as string) ?? null,
    photo: (r.photo as string) ?? null,
  }));
}

/**
 * Start a channel at your school; you are joined to it straight away. Returns
 * its id. A refused name throws the database's own sentence ("There is already
 * a channel called that."), which is written to be shown as it is.
 */
export async function createChannel(
  name: string,
  uni: string | null,
  opts: { private?: boolean; memberIds?: string[] } = {},
): Promise<string> {
  const { data, error } = await createClient().rpc("channel_create", {
    channel_name: name,
    uni: uni || null,
    is_private: !!opts.private,
    member_ids: opts.memberIds ?? [],
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Join a channel (opt-in). Required before posting. */
export async function joinChannel(channelId: string): Promise<void> {
  const { error } = await createClient().rpc("channel_join", { chan_id: channelId });
  if (error) throw new Error(`joinChannel failed: ${error.message}`);
}

/** Leave a channel. */
export async function leaveChannel(channelId: string): Promise<void> {
  const { error } = await createClient().rpc("channel_leave", { chan_id: channelId });
  if (error) throw new Error(`leaveChannel failed: ${error.message}`);
}

export async function getChannelThread(channelId: string): Promise<ChannelMessage[]> {
  const { data, error } = await createClient().rpc("channel_thread", { chan_id: channelId });
  if (error) throw new Error(`getChannelThread failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map(toChannelMessage);
}

export async function sendChannelMessage(
  channelId: string,
  body: string,
): Promise<ChannelMessage> {
  const { data, error } = await createClient().rpc("channel_send", {
    chan_id: channelId,
    message_text: body,
  });
  if (error) throw new Error(`sendChannelMessage failed: ${error.message}`);
  return toChannelMessage((data as Record<string, unknown>[])[0]);
}

function toChannelMessage(r: Record<string, unknown>): ChannelMessage {
  return {
    id: r.id as string,
    senderId: r.sender_id as string,
    senderName: (r.sender_name as string) ?? "",
    senderResidence: (r.sender_residence as string) ?? null,
    senderClassYear: (r.sender_class_year as string) ?? null,
    body: r.body as string,
    createdAt: r.created_at as string,
  };
}

// --- Channel info (db/channels_settings.sql) -------------------------------

/** The top of a channel's info screen. */
export type ChannelDetails = {
  name: string;
  private: boolean;
  memberCount: number;
  amMember: boolean;
  /** You started it — you can rename it, remove people and delete it. */
  amAdmin: boolean;
};

export type ChannelMember = ChannelPerson & { isAdmin: boolean; isMe: boolean };

export async function getChannelDetails(channelId: string): Promise<ChannelDetails> {
  const { data, error } = await createClient().rpc("channel_info", { chan_id: channelId });
  if (error) throw new Error(error.message);
  const r = (data as Record<string, unknown>[])[0];
  if (!r) throw new Error("This channel no longer exists.");
  return {
    name: r.name as string,
    private: !!r.private,
    memberCount: Number(r.member_count ?? 0),
    amMember: !!r.am_member,
    amAdmin: !!r.am_admin,
  };
}

/** Everyone in a channel: you first, then the admin, then by name. */
export async function listChannelMembers(channelId: string): Promise<ChannelMember[]> {
  const { data, error } = await createClient().rpc("channel_members_list", { chan_id: channelId });
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: (r.name as string) || "Member",
    residence: (r.residence as string) ?? null,
    classYear: (r.class_year as string) ?? null,
    photo: (r.photo as string) ?? null,
    isAdmin: !!r.is_admin,
    isMe: !!r.is_me,
  }));
}

/** Add people (any member can). Returns how many were new. */
export async function addChannelMembers(channelId: string, memberIds: string[]): Promise<number> {
  const { data, error } = await createClient().rpc("channel_add_members", {
    chan_id: channelId,
    member_ids: memberIds,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

/** Remove someone — the admin only. */
export async function removeChannelMember(channelId: string, memberId: string): Promise<void> {
  const { error } = await createClient().rpc("channel_remove_member", {
    chan_id: channelId,
    member_id: memberId,
  });
  if (error) throw new Error(error.message);
}

/** Rename — the admin only. Returns the name as saved; a refusal throws its sentence. */
export async function renameChannel(channelId: string, name: string): Promise<string> {
  const { data, error } = await createClient().rpc("channel_rename", {
    chan_id: channelId,
    new_name: name,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Delete the channel and its messages — the admin only. */
export async function deleteChannel(channelId: string): Promise<void> {
  const { error } = await createClient().rpc("channel_delete", { chan_id: channelId });
  if (error) throw new Error(error.message);
}

// --- Unread badge ----------------------------------------------------------

/** Total unread messages across DMs + joined channels — for the nav badge. */
export async function getUnreadTotal(): Promise<number> {
  const { data, error } = await createClient().rpc("unread_total");
  if (error) throw new Error(`getUnreadTotal failed: ${error.message}`);
  return Number(data ?? 0);
}

/**
 * Fire-and-forget signal that the unread count may have changed (e.g. just
 * opened a thread, which marks it read). The nav badge listens for this so it
 * updates immediately instead of waiting for its next poll.
 */
export const UNREAD_REFRESH_EVENT = "unread:refresh";
export function signalUnreadChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(UNREAD_REFRESH_EVENT));
  }
}

// --- Shared formatting -----------------------------------------------------

/** "2m ago" / "3h ago" / "Yesterday" / "Mon" / date — for conversation lists. */
export function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso);
  const now = new Date();
  const mins = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return then.toLocaleDateString("en-US", { weekday: "short" });
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "9:14 AM" — for message bubbles. */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listDirectConversations,
  listChannels,
  joinChannel,
  relativeTime,
  type DmConversation,
  type Channel,
} from "@/lib/supabase/messages";
import {
  IconSearch,
  IconBarbell,
  IconBulb,
  IconActivity,
  IconStar,
  IconRun,
  IconMessage,
} from "@/components/icons";
import Avatar from "./Avatar";

// Channel icon keys (seeded in db/messages.sql) → icon components.
const CHANNEL_ICONS: Record<string, (p: { size?: number }) => React.ReactElement> = {
  barbell: IconBarbell,
  bulb: IconBulb,
  activity: IconActivity,
  star: IconStar,
  run: IconRun,
};
function ChannelGlyph({ icon, size }: { icon: string; size: number }) {
  const C = CHANNEL_ICONS[icon] ?? IconMessage;
  return <C size={size} />;
}

type Tab = "direct" | "community";

export default function MessagesList({
  onOpenDm,
  onOpenChannel,
}: {
  onOpenDm: (c: DmConversation) => void;
  onOpenChannel: (c: Channel) => void;
}) {
  const [tab, setTab] = useState<Tab>("direct");
  const [conversations, setConversations] = useState<DmConversation[] | null>(null);
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([listDirectConversations(), listChannels()])
      .then(([dms, chs]) => {
        if (!active) return;
        setConversations(dms);
        setChannels(chs);
      })
      .catch((e) => active && setError((e as Error).message));
    return () => {
      active = false;
    };
  }, []);

  const filteredDms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations ?? [];
    return (conversations ?? []).filter(
      (c) =>
        c.otherName.toLowerCase().includes(q) ||
        (c.lastBody ?? "").toLowerCase().includes(q),
    );
  }, [conversations, query]);

  const filteredChannels = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return channels ?? [];
    return (channels ?? []).filter(
      (c) => c.name.toLowerCase().includes(q) || (c.lastBody ?? "").toLowerCase().includes(q),
    );
  }, [channels, query]);

  // Join a channel (opt-in). Optimistic — flip joined immediately, revert on error.
  const handleJoin = async (channelId: string) => {
    setChannels((prev) =>
      (prev ?? []).map((c) => (c.channelId === channelId ? { ...c, joined: true } : c)),
    );
    try {
      await joinChannel(channelId);
    } catch (e) {
      setChannels((prev) =>
        (prev ?? []).map((c) => (c.channelId === channelId ? { ...c, joined: false } : c)),
      );
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-3.5 py-3">
        <span className="text-base font-medium text-text">Messages</span>
      </div>

      {/* Direct / Community toggle */}
      <div className="bg-surface px-3 pb-2 pt-2.5">
        <div className="flex overflow-hidden rounded-xl border border-border">
          {(["direct", "community"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-center text-xs font-medium capitalize transition-colors ${
                tab === t ? "bg-primary text-primary-contrast" : "bg-surface-2 text-muted"
              }`}
            >
              {t === "direct" ? "Direct" : "Community"}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="bg-surface px-3 pb-2">
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-2 text-muted">
          <IconSearch size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            aria-label="Search messages"
            className="w-full bg-transparent text-[13px] text-text placeholder:text-muted focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && (
          <div className="px-6 py-16 text-center text-sm text-muted">
            Couldn’t load messages: {error}
          </div>
        )}

        {!error && tab === "direct" && (
          <DirectList list={filteredDms} loading={conversations === null} onOpen={onOpenDm} />
        )}

        {!error && tab === "community" && (
          <CommunityList
            list={filteredChannels}
            loading={channels === null}
            onOpen={onOpenChannel}
            onJoin={handleJoin}
          />
        )}
      </div>
    </div>
  );
}

function DirectList({
  list,
  loading,
  onOpen,
}: {
  list: DmConversation[];
  loading: boolean;
  onOpen: (c: DmConversation) => void;
}) {
  if (loading) {
    return <div className="px-6 py-16 text-center text-sm text-muted">Loading…</div>;
  }
  if (list.length === 0) {
    return (
      <div className="px-6 py-16 text-center text-sm text-muted">
        No conversations yet. Open someone’s profile from Match and tap Message to say hi.
      </div>
    );
  }
  return (
    <div>
      {list.map((c) => (
        <button
          key={c.conversationId}
          type="button"
          onClick={() => onOpen(c)}
          className="flex w-full items-center gap-3 border-b border-border px-3.5 py-3 text-left"
        >
          <Avatar size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-medium text-text">{c.otherName}</span>
              <span className="shrink-0 text-[10px] text-muted">{relativeTime(c.lastAt)}</span>
            </div>
            <div className="truncate text-[11px] text-muted">
              {c.lastBody
                ? `${c.lastFromMe ? "You: " : ""}${c.lastBody}`
                : "No messages yet"}
            </div>
          </div>
          {c.unread > 0 && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="unread" />
          )}
        </button>
      ))}
    </div>
  );
}

function CommunityList({
  list,
  loading,
  onOpen,
  onJoin,
}: {
  list: Channel[];
  loading: boolean;
  onOpen: (c: Channel) => void;
  onJoin: (channelId: string) => void;
}) {
  if (loading) {
    return <div className="px-6 py-16 text-center text-sm text-muted">Loading…</div>;
  }
  const joined = list.filter((c) => c.joined);
  const discover = list.filter((c) => !c.joined);

  return (
    <div>
      {/* Channels the person has joined — behave like a normal chat list. */}
      {joined.length > 0 && (
        <>
          <SectionHeader>Your channels</SectionHeader>
          {joined.map((c) => (
            <button
              key={c.channelId}
              type="button"
              onClick={() => onOpen(c)}
              className="flex w-full items-center gap-3 border-b border-border px-3.5 py-2.5 text-left"
            >
              <ChannelTile icon={c.icon} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-medium text-text">#&nbsp;{c.name}</span>
                  <span className="shrink-0 text-[10px] text-muted">{relativeTime(c.lastAt)}</span>
                </div>
                <div className="truncate text-[11px] text-muted">
                  {c.lastBody
                    ? `${c.lastSenderName ?? "Someone"}: ${c.lastBody}`
                    : "No messages yet"}
                </div>
              </div>
              {c.unread > 0 && (
                <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-medium text-primary-contrast">
                  {c.unread}
                </span>
              )}
            </button>
          ))}
        </>
      )}

      {/* Channels available to join. Tapping the row opens it to browse; the
          Join button (right) joins so you can post. */}
      {discover.length > 0 && (
        <>
          <SectionHeader>Discover — join to post</SectionHeader>
          {discover.map((c) => (
            <div
              key={c.channelId}
              className="flex w-full items-center gap-3 border-b border-border px-3.5 py-2.5"
            >
              <button
                type="button"
                onClick={() => onOpen(c)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <ChannelTile icon={c.icon} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-text">
                    #&nbsp;{c.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {c.lastBody
                      ? `${c.lastSenderName ?? "Someone"}: ${c.lastBody}`
                      : "No messages yet"}
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onJoin(c.channelId)}
                className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-semibold text-primary-contrast"
              >
                Join
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3.5 pb-1 pt-3 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
      {children}
    </div>
  );
}

function ChannelTile({ icon }: { icon: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary bg-primary/15 text-primary">
      <ChannelGlyph icon={icon} size={20} />
    </div>
  );
}

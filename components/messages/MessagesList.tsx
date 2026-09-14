"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useAppState } from "@/components/AppState";
import {
  listDirectConversations,
  listChannels,
  joinChannel,
  requestToJoin,
  cancelJoinRequest,
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
  IconPlus,
  IconLock,
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

export type MessagesTab = "direct" | "community";
type Tab = MessagesTab;

export default function MessagesList({
  onOpenDm,
  onOpenChannel,
  onNewChannel,
  tab,
  onTabChange: setTab,
}: {
  onOpenDm: (c: DmConversation) => void;
  onOpenChannel: (c: Channel) => void;
  /** Opens the "New channel" screen — anybody can start one. */
  onNewChannel: () => void;
  /** Which list shows. Kept by the page, so coming back from a chat lands on
      the list you left — out of a channel, that is Community. */
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  const { universityKey } = useAppState();
  const [conversations, setConversations] = useState<DmConversation[] | null>(null);
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([listDirectConversations(), listChannels(universityKey)])
      .then(([dms, chs]) => {
        if (!active) return;
        setConversations(dms);
        setChannels(chs);
      })
      .catch((e) => active && setError((e as Error).message));
    return () => {
      active = false;
    };
  }, [universityKey]);

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

  // Ask to join a private channel, or take the request back. Optimistic too.
  const handleAsk = async (channelId: string, ask: boolean) => {
    const flip = (requested: boolean) =>
      setChannels((prev) =>
        (prev ?? []).map((c) => (c.channelId === channelId ? { ...c, requested } : c)),
      );
    flip(ask);
    try {
      if (ask) await requestToJoin(channelId);
      else await cancelJoinRequest(channelId);
    } catch (e) {
      flip(!ask);
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {/* No "Messages" title: the tab bar already says where you are, so the
          Direct / Community toggle is the top of the screen. */}
      <h1 className="sr-only">Messages</h1>
      <div className="bg-surface px-3 pb-2 pt-3">
        {/* Same capsule as the Match tabs: the chosen one is a pill inside it.
            The TRACK is sunken — on the dark theme it used to be the card's own
            colour on a card-coloured header, so the only thing you could see
            was the white pill floating on nothing (owner, 2026-09-14). */}
        <div className="flex rounded-full border border-border bg-sunken p-1">
          {(["direct", "community"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`min-h-10 flex-1 rounded-full py-2 text-center text-[13px] font-semibold capitalize transition-colors ${
                tab === t ? "bg-text text-background" : "text-muted"
              }`}
            >
              {t === "direct" ? "Direct" : "Community"}
            </button>
          ))}
        </div>
      </div>

      {/* Search — with a small + beside it on Community to start a channel
          (owner, 2026-09-14: "just a small plus", like WhatsApp). */}
      <div className="flex items-center gap-2 bg-surface px-3 pb-2">
        {/* A raised field with its own edge, so it reads as somewhere you can
            type rather than a grey smear under the tabs. */}
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-2 text-muted">
          <IconSearch size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "community" ? "Search channels" : "Search messages..."}
            aria-label={tab === "community" ? "Search channels" : "Search messages"}
            className="w-full bg-transparent text-[13px] text-text placeholder:text-muted focus:outline-none"
          />
        </div>
        {tab === "community" && (
          <button
            type="button"
            onClick={onNewChannel}
            aria-label="New channel"
            className="tap44 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-live text-primary-contrast active:opacity-80"
          >
            <IconPlus size={18} />
          </button>
        )}
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface">
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
            searching={query.trim().length > 0}
            onOpen={onOpenChannel}
            onJoin={handleJoin}
            onAsk={handleAsk}
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
    return <SkeletonRows count={7} />;
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
          className="flex w-full items-stretch gap-3 pl-3.5 text-left active:bg-surface-2"
        >
          <span className="flex items-center py-2.5">
            <Avatar size={48} name={c.otherName} />
          </span>
          {/* The hairline starts AFTER the avatar and the time sits above the
              unread badge — that inset divider is what makes a list read as
              WhatsApp rather than as a table of rows. */}
          <span className="flex min-w-0 flex-1 items-center gap-3 border-b border-border py-2.5 pr-3.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-text">
                {c.otherName}
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-muted">
                {c.lastBody
                  ? `${c.lastFromMe ? "You: " : ""}${c.lastBody}`
                  : "No messages yet"}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={`text-[11px] ${
                  c.unread > 0 ? "font-semibold text-primary-live" : "text-text-3"
                }`}
              >
                {relativeTime(c.lastAt)}
              </span>
              {c.unread > 0 && (
                <span
                  className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-live px-1 text-[11px] font-semibold text-primary-contrast"
                  aria-label={`${c.unread} unread`}
                >
                  {c.unread}
                </span>
              )}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function CommunityList({
  list,
  loading,
  searching,
  onOpen,
  onJoin,
  onAsk,
}: {
  list: Channel[];
  loading: boolean;
  searching: boolean;
  onOpen: (c: Channel) => void;
  onJoin: (channelId: string) => void;
  onAsk: (channelId: string, ask: boolean) => void;
}) {
  if (loading) {
    return <SkeletonRows count={7} />;
  }
  const joined = list.filter((c) => c.joined);
  const discover = list.filter((c) => !c.joined);

  // With no channels at all this used to render an empty box under an
  // unexplained tab. Say what the tab is for instead.
  if (list.length === 0 && searching) {
    return <div className="px-6 py-16 text-center text-sm text-muted">No channels match.</div>;
  }
  if (list.length === 0) {
    return (
      <div className="px-6 py-16 text-center text-sm text-muted">
        No channels yet. Community is where campus-wide chats live — they’ll
        appear here as they open.
      </div>
    );
  }

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
              className="flex w-full items-stretch gap-3 pl-3.5 text-left active:bg-surface-2"
            >
              <span className="flex items-center py-2.5">
                <ChannelTile icon={c.icon} />
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-3 border-b border-border py-2.5 pr-3.5">
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="truncate text-[15px] font-semibold text-text">#&nbsp;{c.name}</span>
                    {c.private && (
                      <span className="shrink-0 text-muted" aria-label="Private">
                        <IconLock size={12} />
                      </span>
                    )}
                  </span>
                  {/* The admin of a private channel sees who is waiting first. */}
                  {c.requests > 0 ? (
                    <span className="mt-0.5 block truncate text-[13px] font-medium text-primary-live">
                      {c.requests} asking to join
                    </span>
                  ) : (
                    <span className="mt-0.5 block truncate text-[13px] text-muted">
                      {c.lastBody
                        ? `${c.lastSenderName ?? "Someone"}: ${c.lastBody}`
                        : "No messages yet"}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`text-[11px] ${
                      c.unread > 0 ? "font-semibold text-primary-live" : "text-text-3"
                    }`}
                  >
                    {relativeTime(c.lastAt)}
                  </span>
                  {c.unread > 0 && (
                    <span
                      className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-live px-1 text-[11px] font-semibold text-primary-contrast"
                      aria-label={`${c.unread} unread`}
                    >
                      {c.unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          ))}
        </>
      )}

      {/* Every other channel, to browse (or search, above). Tapping the row
          opens it to read; the Join button (right) joins so you can post. */}
      {discover.length > 0 && (
        <>
          <SectionHeader>Browse channels</SectionHeader>
          {discover.map((c) => (
            <div key={c.channelId} className="flex w-full items-stretch gap-3 pl-3.5">
              {/* A private channel can't be opened from outside: its row says
                  so, and the button asks to join (owner, 2026-09-14). */}
              <button
                type="button"
                onClick={() => !c.private && onOpen(c)}
                aria-label={c.name}
                tabIndex={-1}
                className="flex items-center py-2.5"
              >
                <ChannelTile icon={c.icon} />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-3 border-b border-border py-2.5 pr-3.5">
                <button
                  type="button"
                  onClick={() => !c.private && onOpen(c)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="truncate text-[15px] font-semibold text-text">#&nbsp;{c.name}</span>
                    {c.private && (
                      <span className="shrink-0 text-muted" aria-label="Private">
                        <IconLock size={12} />
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-muted">
                    {c.private
                      ? "Private channel"
                      : c.lastBody
                        ? `${c.lastSenderName ?? "Someone"}: ${c.lastBody}`
                        : "No messages yet"}
                  </span>
                </button>
              {!c.private ? (
                <Button size="sm" onClick={() => onJoin(c.channelId)} className="shrink-0">
                  Join
                </Button>
              ) : c.requested ? (
                // Tap again to take the request back.
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onAsk(c.channelId, false)}
                  className="shrink-0"
                >
                  Requested
                </Button>
              ) : (
                <Button size="sm" onClick={() => onAsk(c.channelId, true)} className="shrink-0">
                  Ask to join
                </Button>
              )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
      {children}
    </div>
  );
}

function ChannelTile({ icon }: { icon: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary bg-primary-tint text-primary">
      <ChannelGlyph icon={icon} size={20} />
    </div>
  );
}

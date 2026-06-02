"use client";

import { useEffect, useRef, useState } from "react";
import {
  getChannelThread,
  sendChannelMessage,
  clockTime,
  type ChannelMessage,
} from "@/lib/supabase/messages";
import {
  IconArrowLeft,
  IconBarbell,
  IconBulb,
  IconActivity,
  IconStar,
  IconRun,
  IconMessage,
} from "@/components/icons";
import Avatar from "./Avatar";
import Composer from "./Composer";
import { dayLabel, sameDay } from "./dayLabel";

const CHANNEL_ICONS: Record<string, (p: { size?: number }) => React.ReactElement> = {
  barbell: IconBarbell,
  bulb: IconBulb,
  activity: IconActivity,
  star: IconStar,
  run: IconRun,
};

/*
  Community channel thread. Each message shows the sender's name + residence and
  time (denormalised onto the message), like a group chat. Open to everyone.
*/
export default function ChannelThread({
  channelId,
  title,
  icon,
  onBack,
}: {
  channelId: string;
  title: string;
  icon: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChannelMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const Glyph = CHANNEL_ICONS[icon] ?? IconMessage;

  useEffect(() => {
    let active = true;
    const load = () =>
      getChannelThread(channelId)
        .then((m) => active && setMessages(m))
        .catch((e) => active && setError((e as Error).message));
    load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [channelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages]);

  const send = async (text: string) => {
    const msg = await sendChannelMessage(channelId, text);
    setMessages((prev) => [...(prev ?? []), msg]);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2.5">
        <button type="button" onClick={onBack} aria-label="Back" className="text-muted">
          <IconArrowLeft size={18} />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-primary bg-primary/15 text-primary">
          <Glyph size={16} />
        </div>
        <span className="text-[13px] font-medium text-text">#&nbsp;{title}</span>
      </div>

      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3.5 py-3">
        {error && <div className="py-10 text-center text-sm text-muted">{error}</div>}
        {messages?.length === 0 && !error && (
          <div className="py-10 text-center text-[12px] text-muted">
            No messages yet — start the conversation.
          </div>
        )}
        {messages?.map((m, i) => {
          const showDay = i === 0 || !sameDay(m.createdAt, messages[i - 1].createdAt);
          return (
            <div key={m.id} className="flex flex-col gap-3">
              {showDay && (
                <div className="flex justify-center py-1">
                  <span className="rounded-lg bg-surface-2 px-3 py-1 text-[10px] text-muted">
                    {dayLabel(m.createdAt)}
                  </span>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <Avatar size={32} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline gap-1.5">
                    <span className="text-[12px] font-medium text-text">{m.senderName || "Member"}</span>
                    <span className="text-[9px] text-muted">
                      {m.senderResidence ? `${m.senderResidence} · ` : ""}
                      {clockTime(m.createdAt)}
                    </span>
                  </div>
                  <div className="inline-block rounded-[4px_16px_16px_16px] bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-text">
                    {m.body}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <Composer placeholder={`Message # ${title}...`} onSend={send} />
    </div>
  );
}

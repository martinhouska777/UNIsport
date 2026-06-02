"use client";

import { useEffect, useRef, useState } from "react";
import {
  getDirectThread,
  sendDirectMessage,
  clockTime,
  type DmMessage,
} from "@/lib/supabase/messages";
import { IconArrowLeft } from "@/components/icons";
import Avatar from "./Avatar";
import Composer from "./Composer";
import { dayLabel, sameDay } from "./dayLabel";

/*
  One-to-one conversation: message bubbles (mine on the right), with a composer.
  Loads from dm_thread and polls gently so the other person's replies appear.
*/
export default function DmThread({
  conversationId,
  title,
  currentUserId,
  onBack,
}: {
  conversationId: string;
  title: string;
  currentUserId: string | null;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<DmMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      getDirectThread(conversationId)
        .then((m) => active && setMessages(m))
        .catch((e) => active && setError((e as Error).message));
    load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages]);

  const send = async (text: string) => {
    const msg = await sendDirectMessage(conversationId, text);
    setMessages((prev) => [...(prev ?? []), msg]);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2.5">
        <button type="button" onClick={onBack} aria-label="Back" className="text-muted">
          <IconArrowLeft size={18} />
        </button>
        <Avatar size={36} />
        <span className="text-[13px] font-medium text-text">{title}</span>
      </div>

      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3.5 py-3">
        {error && <div className="py-10 text-center text-sm text-muted">{error}</div>}
        {messages?.length === 0 && !error && (
          <div className="py-10 text-center text-[12px] text-muted">
            Say hi — this is the start of your conversation.
          </div>
        )}
        {messages?.map((m, i) => {
          const mine = m.senderId === currentUserId;
          const showDay = i === 0 || !sameDay(m.createdAt, messages[i - 1].createdAt);
          return (
            <div key={m.id} className="flex flex-col gap-2">
              {showDay && (
                <div className="flex justify-center py-1">
                  <span className="rounded-lg bg-surface-2 px-3 py-1 text-[10px] text-muted">
                    {dayLabel(m.createdAt)}
                  </span>
                </div>
              )}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[78%]">
                  <div
                    className={`px-3 py-2 text-[12px] leading-relaxed ${
                      mine
                        ? "rounded-[16px_16px_4px_16px] bg-primary text-primary-contrast"
                        : "rounded-[16px_16px_16px_4px] bg-surface-2 text-text"
                    }`}
                  >
                    {m.body}
                  </div>
                  <div
                    className={`mt-1 text-[9px] text-muted ${mine ? "text-right" : "text-left"}`}
                  >
                    {clockTime(m.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <Composer placeholder="Message..." onSend={send} />
    </div>
  );
}

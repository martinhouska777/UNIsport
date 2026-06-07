"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getDirectThread,
  sendDirectMessage,
  getPeerLastRead,
  signalUnreadChanged,
  clockTime,
  type DmMessage,
} from "@/lib/supabase/messages";
import { getPublicProfile } from "@/lib/supabase/profiles";
import { IconArrowLeft, IconCalendar } from "@/components/icons";
import Avatar from "./Avatar";
import Composer from "./Composer";
import PlanCard from "./PlanCard";
import PlanSessionSheet from "./PlanSessionSheet";
import { dayLabel, sameDay } from "./dayLabel";

/*
  One-to-one conversation: message bubbles (mine on the right), with a composer.
  Loads from dm_thread and polls gently so the other person's replies appear.
*/
export default function DmThread({
  conversationId,
  title,
  otherId,
  currentUserId,
  onBack,
}: {
  conversationId: string;
  title: string;
  otherId: string | null;
  currentUserId: string | null;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<DmMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  // The other person's last-read time — drives the Delivered/Read receipt.
  const [peerReadAt, setPeerReadAt] = useState<string | null>(null);
  const [planOpen, setPlanOpen] = useState(false); // "Plan a session" form
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load the other person's profile photo for the header (RLS-safe public read).
  useEffect(() => {
    if (!otherId) return;
    let active = true;
    getPublicProfile(otherId)
      .then((p) => active && setPhoto((p?.photo as string) ?? null))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [otherId]);

  // Load the thread (also marks it read server-side; tells the nav badge). Kept
  // as a callback so the plan card/form can refresh after a response.
  const load = useCallback(async () => {
    try {
      const [m, peer] = await Promise.all([
        getDirectThread(conversationId),
        getPeerLastRead(conversationId).catch(() => null),
      ]);
      setMessages(m);
      setPeerReadAt(peer);
      signalUnreadChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages]);

  const send = async (text: string) => {
    const msg = await sendDirectMessage(conversationId, text);
    setMessages((prev) => [...(prev ?? []), msg]);
  };

  // The receipt (Delivered/Read) is shown only under my most recent message.
  const lastMineIndex = messages
    ? messages.map((m) => m.senderId === currentUserId).lastIndexOf(true)
    : -1;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header — tapping the avatar/name opens the person's profile. */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2.5">
        <button type="button" onClick={onBack} aria-label="Back" className="text-muted">
          <IconArrowLeft size={18} />
        </button>
        {otherId ? (
          <Link
            href={`/people/${otherId}`}
            className="flex min-w-0 items-center gap-3"
            aria-label={`View ${title}'s profile`}
          >
            <Avatar size={36} src={photo} alt={title} />
            <span className="truncate text-[13px] font-medium text-text">{title}</span>
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar size={36} src={photo} alt={title} />
            <span className="truncate text-[13px] font-medium text-text">{title}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setPlanOpen(true)}
          aria-label="Plan a session"
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[12px] font-medium text-primary"
        >
          <IconCalendar size={14} /> Plan
        </button>
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
              {m.kind === "plan" && m.plan ? (
                <PlanCard plan={m.plan} mine={mine} otherName={title} onChanged={load} />
              ) : (
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
                    {mine && i === lastMineIndex && (
                      <span>
                        {" · "}
                        {peerReadAt &&
                        new Date(peerReadAt).getTime() >= new Date(m.createdAt).getTime()
                          ? "Read"
                          : "Delivered"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <Composer placeholder="Message..." onSend={send} />

      {planOpen && (
        <PlanSessionSheet
          conversationId={conversationId}
          otherName={title}
          onClose={() => setPlanOpen(false)}
          onCreated={() => {
            setPlanOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

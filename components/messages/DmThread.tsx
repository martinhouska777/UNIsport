"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getDirectThread,
  sendDirectMessage,
  getPeerState,
  tickFor,
  signalUnreadChanged,
  clockTime,
  type DmMessage,
  type DmPlan,
  type PeerState,
} from "@/lib/supabase/messages";
import { getPublicProfile } from "@/lib/supabase/profiles";
import { IconArrowLeft, IconCalendar } from "@/components/icons";
import Avatar from "./Avatar";
import Composer from "./Composer";
import PlanCard from "./PlanCard";
import PlanSessionSheet from "./PlanSessionSheet";
import ReadTicks from "./ReadTicks";
import { dayLabel, sameDay } from "./dayLabel";
import {
  TOUR_EXAMPLE_ID,
  acceptTourExample,
  isTourExample,
  tourExampleMessages,
  useTourExample,
} from "@/lib/tourExample";

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
  // The other person's read + check-in times — drive the three ticks.
  const [peer, setPeer] = useState<PeerState | null>(null);
  const [planOpen, setPlanOpen] = useState(false); // "Plan a session" form
  const [editPlan, setEditPlan] = useState<DmPlan | null>(null); // reschedule editor
  /*
    The plan the walk lights (lib/tour.ts): the newest one the other person
    sent you that was still waiting for your answer when the chat opened. Held
    rather than recomputed, so it stays the same card after Accept turns it
    into "You're on" — the walk lights it again then.
  */
  const [tourPlan, setTourPlan] = useState<string | null>(null);
  /*
    THE WALK'S EXAMPLE CHAT (lib/tourExample.ts), when nobody has planned a
    session with you: drawn from that data, never loaded or polled, and its
    Accept only turns the card into "You're on" — nothing is sent.
  */
  const tourExample = useTourExample();
  const example = isTourExample(conversationId) ? tourExample : null;
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
      const [m, p] = await Promise.all([
        getDirectThread(conversationId),
        getPeerState(conversationId).catch(() => null),
      ]);
      setMessages(m);
      setPeer(p);
      // Not before we know who "you" are — your own proposal is not an invite.
      if (currentUserId) {
        const invite = [...m]
          .reverse()
          .find((x) => x.plan?.status === "proposed" && x.senderId !== currentUserId);
        setTourPlan((held) => held ?? invite?.plan?.planId ?? null);
      }
      signalUnreadChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (isTourExample(conversationId)) return; // nothing to load — see above
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load, conversationId]);

  const shown = example ? tourExampleMessages(example) : messages;

  // Jump to the newest message only when there IS a new message. Keying this on
  // `messages` scrolled on every 5s poll (the poll replaces the array even when
  // nothing changed), which yanked you back down while reading older messages.
  const lastMessageId = shown?.[shown.length - 1]?.id ?? null;
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [lastMessageId]);

  const send = async (text: string) => {
    if (example) return;
    const msg = await sendDirectMessage(conversationId, text);
    setMessages((prev) => [...(prev ?? []), msg]);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header — tapping the avatar/name opens the person's profile. */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2.5">
        <button type="button" onClick={onBack} aria-label="Back" className="tap44 press-icon text-muted">
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
          onClick={() => !example && setPlanOpen(true)}
          aria-label="Plan a session"
          className="tap44 ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-primary-line bg-primary-tint px-3 py-1.5 text-[12px] font-medium text-primary"
        >
          <IconCalendar size={14} /> Plan
        </button>
      </div>

      {/* What the two of you share, said once, where the first message goes. */}
      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3.5 py-3">
        {error && <div className="py-10 text-center text-sm text-muted">{error}</div>}
        {shown?.length === 0 && !error && (
          <div className="py-10 text-center text-[12px] text-muted">
            Say hi — this is the start of your conversation.
          </div>
        )}
        {shown?.map((m, i) => {
          const mine = m.senderId === currentUserId;
          const showDay = i === 0 || !sameDay(m.createdAt, shown[i - 1].createdAt);
          return (
            <div key={m.id} className="flex flex-col gap-2">
              {showDay && (
                <div className="flex justify-center py-1">
                  <span className="rounded-lg bg-surface px-3 py-1 text-[11px] text-muted shadow-card">
                    {dayLabel(m.createdAt)}
                  </span>
                </div>
              )}
              {m.kind === "plan" && m.plan ? (
                <PlanCard
                  plan={m.plan}
                  tour={m.plan.planId === (example ? TOUR_EXAMPLE_ID : tourPlan) ? "dm-plan" : undefined}
                  conversationId={conversationId}
                  mine={mine}
                  otherName={title}
                  otherId={otherId}
                  onChanged={load}
                  onReschedule={setEditPlan}
                  onAnswer={example ? (yes) => yes && acceptTourExample() : undefined}
                />
              ) : (
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] px-2.5 pb-1.5 pt-1.5 text-[13px] leading-snug text-text shadow-card ${
                    mine
                      ? "rounded-[10px_10px_2px_10px] bg-bubble-mine"
                      : "rounded-[10px_10px_10px_2px] bg-surface"
                  }`}
                >
                  <span className="whitespace-pre-wrap break-words">{m.body}</span>
                  {/* WhatsApp-style: the time sits inside the bubble, tucked to the
                      right of the last line (or under it when the line is full). */}
                  <span className="float-right ml-2 mt-[5px] flex items-center gap-1 whitespace-nowrap text-[10px] leading-none text-muted">
                    {clockTime(m.createdAt)}
                    {mine && <ReadTicks size={11} state={tickFor(m.createdAt, peer)} />}
                  </span>
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

      {editPlan && (
        <PlanSessionSheet
          conversationId={conversationId}
          otherName={title}
          existing={{
            planId: editPlan.planId,
            activity: editPlan.activity,
            place: editPlan.place,
            scheduledAt: editPlan.scheduledAt,
          }}
          onClose={() => setEditPlan(null)}
          onCreated={() => {
            setEditPlan(null);
            load();
          }}
        />
      )}
    </div>
  );
}

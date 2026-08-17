"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/messages/Avatar";
import Button from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { hasSupabaseEnv } from "@/lib/supabase/client";
import {
  listDirectConversations,
  shareMemory,
  relativeTime,
  type DmConversation,
} from "@/lib/supabase/messages";
import { shortDate, type Memory } from "@/lib/memories";
import { IconX, IconSearch, IconCheck, IconMapPin } from "@/components/icons";

/*
  SHARE A MEMORY — pick a chat, optionally say something, send.

  What travels is a COPY of the photo plus where it was and what you trained
  (db/memories.sql). Your session NOTE stays yours: it's shown here, greyed, so
  you can see exactly what is NOT being sent, and if you want to say it you can
  type it in the message box. Colors are theme tokens (rule 1).
*/
// Stable empty list for the no-database case, so the derived value below doesn't
// change identity on every render.
const NO_CONVERSATIONS: DmConversation[] = [];

export default function ShareMemorySheet({
  memory,
  onClose,
}: {
  memory: Memory;
  onClose: () => void;
}) {
  const noDatabase = !hasSupabaseEnv();
  const [fetched, setFetched] = useState<DmConversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (noDatabase) return;
    let active = true;
    listDirectConversations()
      .then((c) => active && setFetched(c))
      .catch((e) => {
        if (!active) return;
        setError((e as Error).message);
        setFetched([]);
      });
    return () => {
      active = false;
    };
  }, [noDatabase]);

  /*
    Derived rather than stored: with no database there's nothing to load, so the
    list settles on empty immediately and the notice below explains why — better
    than an empty list that reads as "you have no friends".
  */
  const conversations = noDatabase ? NO_CONVERSATIONS : fetched;
  const notice = noDatabase
    ? "Sharing needs the database — try it on the deployed app."
    : error;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const trained = memory.trained.join(" · ");

  const send = async () => {
    if (picked.size === 0) return;
    setSending(true);
    setError(null);
    try {
      // Sequential rather than parallel: each share writes a copy of the photo,
      // and firing five of those at once is how you get a timeout.
      for (const conversationId of picked) {
        await shareMemory(
          conversationId,
          { photo: memory.photo, gym: memory.gym, trained, takenOn: memory.date },
          caption,
        );
      }
      setSentTo(picked.size);
      // Let the tick land before the sheet goes away.
      window.setTimeout(onClose, 900);
    } catch (e) {
      setError((e as Error).message);
      setSending(false);
    }
  };

  const q = query.trim().toLowerCase();
  const shown = (conversations ?? []).filter(
    (c) => !q || c.otherName.toLowerCase().includes(q),
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="relative flex max-h-[88%] flex-col rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div className="flex justify-center pb-1.5 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-border" />
        </div>

        {/* What's being sent */}
        <div className="flex items-start gap-3 border-b border-border px-4 pb-3">
          <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={memory.photo} alt="" className="h-full w-full object-cover" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium text-text">Share this memory</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
              <span>{shortDate(memory.date)}</span>
              {trained && <span className="text-primary">{trained}</span>}
              {memory.gym && (
                <span className="flex items-center gap-1">
                  <IconMapPin size={10} /> {memory.gym}
                </span>
              )}
            </div>
            {/* Say what ISN'T going, so nobody discovers it afterwards. Naming
                the note is enough — reprinting it here just made the sheet look
                like it was about to publish it. */}
            {memory.note && (
              <div className="mt-1.5 text-[11px] leading-relaxed text-muted">
                Your note on this session stays private.
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap44 press-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconX size={14} />
          </button>
        </div>

        {/* Who to send it to */}
        <div className="border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3">
            <IconSearch size={14} className="shrink-0 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              aria-label="Search chats"
              /* text-base keeps phones from auto-zooming the page (CLAUDE.md §7). */
              className="w-full bg-transparent py-2.5 text-base text-text placeholder:text-muted focus:outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations === null ? (
            <SkeletonRows count={4} />
          ) : shown.length === 0 ? (
            <div className="px-4 py-10 text-center text-[12px] text-muted">
              {notice
                ? notice
                : q
                  ? "No chat by that name."
                  : "No chats yet. Message someone from Match first, then you can send them a memory."}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {shown.map((c) => {
                const on = picked.has(c.conversationId);
                return (
                  <button
                    key={c.conversationId}
                    type="button"
                    onClick={() => toggle(c.conversationId)}
                    aria-pressed={on}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-surface-2"
                  >
                    <Avatar size={38} src={null} alt={c.otherName} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-text">
                        {c.otherName}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {c.lastAt ? relativeTime(c.lastAt) : "New chat"}
                      </span>
                    </span>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        on
                          ? "border-primary bg-primary-live text-primary-contrast"
                          : "border-border bg-surface-2 text-transparent"
                      }`}
                    >
                      <IconCheck size={13} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Say something + send */}
        <div className="flex flex-col gap-2.5 border-t border-border px-4 py-3">
          {error && conversations !== null && shown.length > 0 && (
            <div className="text-[11px] text-danger">{error}</div>
          )}
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Say something (optional)"
            aria-label="Message to send with the memory"
            maxLength={200}
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-base text-text placeholder:text-muted focus:outline-none"
          />
          <Button
            size="lg"
            full
            disabled={picked.size === 0 || sending || sentTo !== null}
            onClick={send}
          >
            {sentTo !== null ? (
              <>
                <IconCheck size={15} /> Sent to {sentTo}
              </>
            ) : sending ? (
              "Sending…"
            ) : picked.size === 0 ? (
              "Pick a chat"
            ) : (
              `Send to ${picked.size}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

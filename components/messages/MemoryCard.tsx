"use client";

import { useEffect, useState } from "react";
import { shortDate } from "@/lib/memories";
import { clockTime, type DmMemory } from "@/lib/supabase/messages";
import { IconMapPin, IconX } from "@/components/icons";

/*
  A shared session photo inside a conversation. Sits where a message bubble would,
  aligned the same way (mine right, theirs left), and carries the two things that
  make it a memory rather than an attachment: what they trained, and where.

  The sender's private session note is not part of a share — if they wanted to say
  something it arrived as the message underneath. Tapping opens the photo full
  screen. Colors are theme tokens (rule 1).
*/
export default function MemoryCard({
  memory,
  mine,
  senderName,
  createdAt,
}: {
  memory: DmMemory;
  mine: boolean;
  senderName: string;
  createdAt: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[78%]">
          <div
            className={`overflow-hidden border border-border bg-surface-2 ${
              mine ? "rounded-[16px_16px_4px_16px]" : "rounded-[16px_16px_16px_4px]"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="View memory photo"
              className="block w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={memory.photo}
                alt={`Session photo from ${shortDate(memory.takenOn)}`}
                className="max-h-64 w-full object-cover"
              />
            </button>
            <div className="px-2.5 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                {mine ? "You shared" : `${senderName || "They"} shared`} · {shortDate(memory.takenOn)}
              </div>
              {memory.trained && (
                <div className="mt-1 text-[12px] font-medium text-primary">{memory.trained}</div>
              )}
              {memory.gym && (
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                  <IconMapPin size={10} /> {memory.gym}
                </div>
              )}
            </div>
          </div>
          <div className={`mt-1 text-[11px] text-muted ${mine ? "text-right" : "text-left"}`}>
            {clockTime(createdAt)}
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-6 [animation:backdrop-in_0.2s_ease-out]"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={memory.photo}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close photo"
            className="tap44 press-icon absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text"
          >
            <IconX size={18} />
          </button>
        </div>
      )}
    </>
  );
}

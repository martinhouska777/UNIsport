"use client";

/*
  CLAIM YOUR SEAT — "which of these is you?"
  ---------------------------------------------------------------------------
  The coach's roster and the athlete's account were two lists with nothing
  joining them, so a published boat found "your seat" by comparing the name you
  typed at setup with the name the coach typed on the list. One accent, one
  nickname, and you were never in a boat — silently, with nothing on Home to say
  so. This sheet is the join: the squad list, a search, one tap, and the id is
  saved on your profile (lib/varsity/athleteProfile → rosterId).

  Opened from the card on Home while you are unclaimed, and from the chip on
  your Profile afterwards, so a wrong pick is one tap to change.

  Coxswains are on the list too — a cox has a seat in a boat as much as anyone,
  and the roster screen leaving them out is a separate matter (Team tab).

  The list is the roster as DATA (rule 7); the sheet knows nothing about which
  sport it is. All colours are theme tokens; the side/cox word is plain text.
*/
import { useMemo, useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import { roster, sideMeta, type Athlete } from "@/lib/varsity/coachLineup";
import { IconCheck, IconSearch, IconX } from "@/components/icons";

const roleWord = (a: Athlete) => (a.cox ? "Cox" : sideMeta[a.side].label);

export default function ClaimSeatSheet({
  current,
  onClaim,
  onClose,
}: {
  /** The roster id already claimed, if any — drawn ticked and listed first. */
  current: string | null;
  /** Called with the picked id, or null when the athlete says none of these is them. */
  onClaim: (rosterId: string | null) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();

  // Name order, except the one already claimed, which sits on top so "is it
  // still me?" is answered without scrolling.
  const shown = useMemo(() => {
    const sorted = [...roster].sort((a, b) => a.name.localeCompare(b.name));
    const filtered = needle ? sorted.filter((a) => a.name.toLowerCase().includes(needle)) : sorted;
    if (!current) return filtered;
    const mine = filtered.find((a) => a.id === current);
    return mine ? [mine, ...filtered.filter((a) => a.id !== current)] : filtered;
  }, [needle, current]);

  const pick = (id: string | null) => {
    onClaim(id);
    onClose();
  };

  return (
    <Sheet title="Which of these is you?" onClose={onClose}>
      <p className="mb-3 text-[12px] leading-relaxed text-muted">
        Pick your name on the squad list. That is how a published boat knows which seat is
        yours.
      </p>

      {/* 16px input so a phone doesn't zoom the page the moment it is tapped. */}
      <div className="relative mb-3">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <IconSearch size={15} />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Find your name"
          placeholder="Find your name…"
          className="w-full rounded-xl border border-border bg-surface-2 py-2.5 pl-9 pr-9 text-base text-text outline-none focus:border-primary placeholder:text-muted"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear the search"
            className="tap44 absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-muted"
          >
            <IconX size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {shown.map((a) => {
          const isCurrent = a.id === current;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => pick(a.id)}
              aria-pressed={isCurrent}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${
                isCurrent ? "border-primary bg-primary-tint" : "border-border bg-surface-2 active:bg-surface"
              }`}
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-tint text-[11px] font-semibold text-primary">
                {a.initials}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-text">
                {a.name}
              </span>
              <span className="text-[11px] text-muted">{roleWord(a)}</span>
              {isCurrent && (
                <span className="text-primary">
                  <IconCheck size={16} />
                </span>
              )}
            </button>
          );
        })}
        {shown.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-surface-2 px-4 py-6 text-center text-[12px] text-muted">
            Nobody on the list matches “{q.trim()}”.
          </div>
        )}
      </div>

      {/* The honest way out. An athlete the coach hasn't put on the list yet
          must not be made to pick somebody else's name to make the card go
          away — and an athlete who picked wrong needs a way to un-pick. */}
      <div className="mt-4 border-t border-border pt-3 text-center">
        {current ? (
          <button
            type="button"
            onClick={() => pick(null)}
            className="text-[12px] font-medium text-muted underline-offset-2 active:underline"
          >
            None of these is me
          </button>
        ) : (
          <p className="text-[11px] leading-relaxed text-muted">
            Not on the list? Ask your coach to add you — you can pick your name later from your
            Profile.
          </p>
        )}
      </div>
    </Sheet>
  );
}

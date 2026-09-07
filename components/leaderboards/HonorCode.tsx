"use client";

/*
  THE HONOR CODE — shown once, the first time anyone opens the League.
  ---------------------------------------------------------------------------
  Every number in here is typed in by a person. Rather than pretend to verify
  what we cannot, we ask — in the register of the college honour code every
  student has already signed. The wording lives in lib/honorCode.ts as DATA so
  each school can have its own; this file is only the screen.

  It gates the League on first open and is never shown again. Afterwards it
  shrinks to one quiet line under the boards (`HonorCodeFooter`), which turns
  out to be the more effective guilt trip of the two.

  Accepted per person, in this browser — the same localStorage fallback the gym
  favourites use. It is not a contract and there is nothing to enforce, so it
  does not need a table.
*/
import { useCallback, useSyncExternalStore } from "react";
import { honorCodeFor, honorCodeKey } from "@/lib/honorCode";
import Button from "@/components/ui/Button";

/*
  localStorage is an external store, so it is READ during render through
  useSyncExternalStore rather than copied into state by an effect. That gets the
  server render, the hydration render and every later render agreeing on their
  own, with no flash of the honour code at somebody who signed it weeks ago —
  the server simply reports "unknown" and the screen waits.
*/
type Signed = "unknown" | "accepted" | "pending";

const listeners = new Set<() => void>();

/*
  Whoever has agreed during THIS session, whatever storage did. A browser that
  accepts getItem but refuses setItem would otherwise show the honour code
  again the instant the button was pressed, and the button would read as broken.
*/
const agreedThisSession = new Set<string>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Nothing is known before hydration, and nothing should be guessed. */
const unknown = (): Signed => "unknown";

/**
 * `accepted` is null while we don't know yet — never false, because false is
 * what puts the honour code on screen.
 */
export function useHonorCode(userId: string | null): {
  accepted: boolean | null;
  accept: () => void;
} {
  const read = useCallback((): Signed => {
    if (!userId) return "unknown";
    if (agreedThisSession.has(userId)) return "accepted";
    try {
      return localStorage.getItem(honorCodeKey(userId)) === "1" ? "accepted" : "pending";
    } catch {
      // A browser that refuses storage shouldn't lock anyone out of the League.
      return "accepted";
    }
  }, [userId]);

  const signed = useSyncExternalStore(subscribe, read, unknown);

  const accept = useCallback(() => {
    if (userId) {
      agreedThisSession.add(userId);
      try {
        localStorage.setItem(honorCodeKey(userId), "1");
      } catch {
        /* they'll be asked again next time, which is harmless */
      }
    }
    listeners.forEach((l) => l());
  }, [userId]);

  return { accepted: signed === "unknown" ? null : signed === "accepted", accept };
}

export default function HonorCode({
  universityKey,
  onAgree,
}: {
  universityKey: string;
  onAgree: () => void;
}) {
  const code = honorCodeFor(universityKey);

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3.5 py-8">
      <div className="rounded-2xl border border-border bg-surface px-4 py-6">
        <h1 className="text-center text-[17px] font-semibold leading-snug text-text">
          {code.title}
        </h1>
        <div className="mx-auto mt-3 h-px w-10 bg-border" />

        {code.paragraphs.map((p) => (
          <p key={p.slice(0, 24)} className="mt-4 text-[13px] leading-relaxed text-text-2">
            {p}
          </p>
        ))}

        <Button size="md" className="mt-6 w-full" onClick={onAgree}>
          {code.agree}
        </Button>
      </div>

      <p className="mt-3 px-1 text-center text-[11px] leading-relaxed text-muted">
        Shown once. You can train however you like — this is only about what you type in.
      </p>
    </div>
  );
}

/** The quiet reminder that lives under the boards ever after. */
export function HonorCodeFooter({ universityKey }: { universityKey: string }) {
  return (
    <p className="px-1 text-center text-[11px] text-muted">
      {honorCodeFor(universityKey).footer}
    </p>
  );
}

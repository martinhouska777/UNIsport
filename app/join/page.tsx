"use client";

/*
  VARSITY ENTRY (Zone 1) — "I have a code, not a link".

  Most people arrive on /join/<code> straight from WhatsApp. This screen is for
  the ones who were read a code out loud, or who pasted the link somewhere it
  stopped being tappable. It does no checking of its own: it just works out
  which code you mean and hands you to the real invite page.

  Neutral brand + the gold varsity accent — no university colors in Zone 1.
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { instrumentSerif } from "@/components/landing/fonts";
import { extractInviteCode, PENDING_INVITE_KEY } from "@/lib/varsity/invites";

export default function JoinPage() {
  const router = useRouter();
  const [value, setValue] = useState("");

  // If they already tapped a link on this device, offer that code back.
  useEffect(() => {
    try {
      const parked = localStorage.getItem(PENDING_INVITE_KEY);
      if (parked) setValue(parked);
    } catch {
      /* private browsing — they can type it */
    }
  }, []);

  const code = extractInviteCode(value);

  return (
    <div
      className={`${instrumentSerif.variable} flex min-h-dvh flex-col items-center justify-center bg-l-bg px-6 text-center font-sans text-l-text`}
    >
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-block font-display text-2xl italic tracking-tight text-l-text"
        >
          UNI<span className="text-l-varsity">sport</span>
        </Link>

        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-l-varsity-soft bg-l-varsity-dim px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-l-varsity">
          Varsity Mode
        </div>

        <h1 className="font-display text-3xl text-l-text">Join your team</h1>
        <p className="mt-2 text-sm leading-relaxed text-l-text-2">
          Varsity Mode is gated by your team. Paste the invite link your captain sent you,
          or type the code from it.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code) router.push(`/join/${code}`);
          }}
          className="mt-7"
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Link or code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Invite link or code"
            /* text-base keeps phones from zooming the whole page on focus */
            className="w-full rounded-xl border border-l-border bg-l-surface px-4 py-3 text-center font-mono text-base tracking-[0.15em] text-l-text placeholder:font-sans placeholder:tracking-normal placeholder:text-l-text-3 focus:border-l-varsity-soft focus:outline-none"
          />
          <button
            type="submit"
            disabled={!code}
            className="mt-4 w-full rounded-full bg-l-varsity px-5 py-3 text-sm font-semibold text-l-bg disabled:opacity-40"
          >
            Continue
          </button>
        </form>

        <Link
          href="/login"
          className="mt-8 inline-block text-xs font-medium text-l-text-2 hover:text-l-text"
        >
          ← I&apos;m a regular student
        </Link>
      </div>
    </div>
  );
}

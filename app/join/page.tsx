"use client";

/*
  VARSITY ENTRY (Zone 1) — "I have a code, not a link".

  Most people arrive on /join/<code> straight from WhatsApp. This screen is for
  the ones who were read a code out loud, or who pasted the link somewhere it
  stopped being tappable. It does no checking of its own: it just works out
  which code you mean and hands you to the real invite page.

  Back behaviour lives in <JoinShell> — signed-in people came from Settings and
  go back there, never to the landing page.
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import JoinShell from "@/components/join/JoinShell";
import { useAppState } from "@/components/AppState";
import { extractInviteCode, PENDING_INVITE_KEY } from "@/lib/varsity/invites";

export default function JoinPage() {
  const router = useRouter();
  const { loggedIn } = useAppState();
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
    <JoinShell badge="Varsity Mode">
      <h1 className="font-display text-3xl text-l-text">Join your team</h1>
      <p className="mt-2 text-sm leading-relaxed text-l-text-2">
        Varsity Mode is gated by your team. Paste the invite link your captain sent you, or
        type the code from it.
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

      {/* Only useful to someone who hasn't signed in yet — for anyone already in
          the app it pointed at /login, which bounced them to the gyms tab. */}
      {!loggedIn && (
        <Link
          href="/login"
          className="mt-8 inline-block text-xs font-medium text-l-text-2 hover:text-l-text"
        >
          ← I&apos;m a regular student
        </Link>
      )}
    </JoinShell>
  );
}

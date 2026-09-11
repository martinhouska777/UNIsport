"use client";

/*
  JOIN (Zone 1). Two kinds of person land here:

  • A STUDENT INVITED BY A HOUSEMATE — the Share button in the app sends a link
    like /join?u=harvard&h=Adams&by=Sam (lib/invite.ts). They see who invited
    them, which house, and one button: sign up with a university email. Until
    this existed the app had no way to invite anyone at all.

  • VARSITY — "I have a code, not a link". Most people arrive on /join/<code>
    straight from WhatsApp; this form is for the ones who were read a code out
    loud. It does no checking of its own: it works out which code you mean and
    hands you to the real invite page.

  Back behaviour lives in <JoinShell> — signed-in people came from Settings and
  go back there, never to the landing page. Zone 1: neutral brand only.
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import JoinShell from "@/components/join/JoinShell";
import { useAppState } from "@/components/AppState";
import { extractInviteCode, PENDING_INVITE_KEY } from "@/lib/varsity/invites";
import { INVITE_PARAMS } from "@/lib/invite";
import { getUniversity } from "@/lib/themes";
import { residenceLabel } from "@/lib/onboarding";

type StudentInvite = { school: string; house: string | null; from: string | null };

export default function JoinPage() {
  const router = useRouter();
  const { loggedIn } = useAppState();
  const [value, setValue] = useState("");
  // A housemate's invite, read off the URL after mount (same reason as the
  // login page: useSearchParams would force a Suspense boundary). Only a school
  // the app knows is accepted — never arbitrary text from a link.
  const [invite, setInvite] = useState<StudentInvite | null>(null);
  const [showCode, setShowCode] = useState(false);

  /*
    Both reads below happen on the next frame rather than in the effect body:
    the URL and localStorage only exist in the browser, and React's lint rule
    (rightly) objects to setting state synchronously inside an effect.
  */
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const q = new URLSearchParams(window.location.search);
      const uni = getUniversity(q.get(INVITE_PARAMS.university) ?? "");
      if (uni) {
        const house = q.get(INVITE_PARAMS.house);
        setInvite({
          school: uni.shortName,
          house: house ? residenceLabel(house) : null,
          from: (q.get(INVITE_PARAMS.from) ?? "").trim().slice(0, 40) || null,
        });
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // If they already tapped a link on this device, offer that code back.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const parked = localStorage.getItem(PENDING_INVITE_KEY);
        if (parked) setValue(parked);
      } catch {
        /* private browsing — they can type it */
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const code = extractInviteCode(value);

  if (invite && !showCode) {
    return (
      <JoinShell badge={invite.house ? `${invite.house} · ${invite.school}` : invite.school}>
        <h1 className="font-display text-3xl text-l-text">
          {invite.house ? `Join ${invite.house} on UNIsport` : `Join UNIsport at ${invite.school}`}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-l-text-2">
          {invite.from ? `${invite.from} invited you. ` : ""}
          UNIsport finds you a training partner at your gym, at your hour — and every session you
          log counts for {invite.house ?? "your house"} on the {invite.school} leaderboard.
        </p>
        {loggedIn ? (
          <Link
            href="/gyms"
            className="mt-8 inline-block w-full rounded-full bg-l-accent px-5 py-3 text-sm font-semibold text-l-bg"
          >
            You&apos;re already in — open the app
          </Link>
        ) : (
          <>
            <Link
              href="/login?mode=signup"
              className="mt-8 inline-block w-full rounded-full bg-l-accent px-5 py-3 text-sm font-semibold text-l-bg"
            >
              Sign up with your {invite.school} email
            </Link>
            <Link
              href="/login"
              className="mt-3 inline-block w-full rounded-full border border-l-line px-5 py-3 text-sm font-medium text-l-text"
            >
              I already have an account
            </Link>
          </>
        )}
        <button
          type="button"
          onClick={() => setShowCode(true)}
          className="mt-8 text-xs font-medium text-l-text-2 hover:text-l-text"
        >
          I have a varsity team code
        </button>
      </JoinShell>
    );
  }

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
          className="w-full rounded-xl border border-l-line bg-l-surface px-4 py-3 text-center font-mono text-base tracking-[0.15em] text-l-text placeholder:font-sans placeholder:tracking-normal placeholder:text-l-text-3 focus:border-l-varsity-soft focus:outline-none"
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

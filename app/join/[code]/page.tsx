"use client";

/*
  THE INVITE LANDING PAGE — where a WhatsApp / email link drops you.

  This page never grants anything by itself. It shows what the code is for,
  then asks the server to redeem it; the usual answer is "you're in the queue,
  your captain has to let you in". Everything that could reject the code
  (revoked, expired, used up, wrong email, wrong university domain) is decided
  in the database — see db/varsity_teams.sql — so a forwarded link is harmless.

  Back behaviour lives in <JoinShell> — signed-in people came from Settings and
  go back there, never to the landing page.
*/
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import JoinShell from "@/components/join/JoinShell";
import { useAppState } from "@/components/AppState";
import {
  previewInvite,
  redeemInvite,
  refusalMessage,
  PENDING_INVITE_KEY,
  type InvitePreview,
} from "@/lib/varsity/invites";
import { VARSITY_HOME } from "@/lib/varsity/theme";
import { clearMembershipCache } from "@/lib/varsity/membership";

/* Drop the code this device parked for the trip through sign-in. */
function forgetParkedCode() {
  try {
    localStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    /* nothing to clean up */
  }
}

export default function JoinWithCodePage() {
  const params = useParams<{ code: string }>();
  const code = (params?.code ?? "").toString().toUpperCase();
  const router = useRouter();
  const { ready, loggedIn, studentReady, varsityReady, email } = useAppState();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ status?: string; reason?: string } | null>(null);

  // Remember the code for the trip through sign-in, and look it up.
  useEffect(() => {
    if (!code) return;
    try {
      localStorage.setItem(PENDING_INVITE_KEY, code);
    } catch {
      /* private browsing — the code is still in the URL */
    }
    let active = true;
    (async () => {
      const p = await previewInvite(code);
      if (!active) return;
      // A code that doesn't work is not kept for later: /join offers the
      // parked code back, so "Try another link" opened with the rejected one
      // already typed in (launch audit 2026-09-27, item 42).
      if (!p.valid) forgetParkedCode();
      setPreview(p);
    })();
    return () => {
      active = false;
    };
  }, [code]);

  // A good link, signed in, but no varsity profile yet: set one up first. The
  // setup screen comes back here with the parked code when it's saved.
  const needsSetup = !!preview?.valid && ready && loggedIn && !varsityReady;
  useEffect(() => {
    if (needsSetup) router.replace("/varsity/setup");
  }, [needsSetup, router]);

  const join = useCallback(async () => {
    setBusy(true);
    const r = await redeemInvite(code);
    setBusy(false);
    setResult(r.ok ? { status: r.status } : { reason: r.reason });
    if (r.ok) {
      forgetParkedCode();
      // The "no team" this tab may already hold is now wrong — without this,
      // Settings and the mode switcher keep offering "Join a team" until reload.
      clearMembershipCache();
    }
  }, [code]);

  const teamName = preview?.teamName ?? "your team";
  /*
    Where "back to the app" should land. Someone who came in varsity-first has
    no student side, so the student app would bounce them into an onboarding they never
    asked for — send them to the waiting screen, which IS their app until a
    captain lets them in.
  */
  const appHome = !loggedIn ? "/" : studentReady ? "/match" : "/varsity/waiting";

  return (
    <JoinShell badge="Team invite">
      {/* 1. Still looking the code up */}
      {!preview && <p className="text-sm text-l-text-2">Checking this invite…</p>}

      {/* 2. The code is no good — say exactly why, and offer another go */}
      {preview && !preview.valid && (
        <>
          <h1 className="font-display text-3xl text-l-text">This link doesn&apos;t work</h1>
          <p className="mt-3 text-sm leading-relaxed text-l-text-2">
            {refusalMessage(preview.reason, preview.personal)}
          </p>
          <p className="mt-3 break-all font-mono text-[11px] text-l-text-3">{code}</p>
          <Link
            href="/join"
            className="mt-7 inline-block w-full rounded-full border border-l-line px-5 py-3 text-sm font-medium text-l-text"
          >
            Try another link
          </Link>
        </>
      )}

      {/* 3. Good code, but we don't know who you are yet. Most people a link
             reaches have no account, so Sign up leads (the page opens on the
             sign-up form); the ones who do have one get their own button,
             the same pair the housemate invite on /join offers. */}
      {preview?.valid && ready && !loggedIn && (
        <>
          <h1 className="font-display text-3xl text-l-text">Join {teamName}</h1>
          <p className="mt-3 text-sm leading-relaxed text-l-text-2">
            Sign up with your university email to ask for a place on the team.
            {preview.emailDomain && (
              <>
                {" "}
                This team only accepts{" "}
                <span className="text-l-text">@{preview.emailDomain}</span> addresses.
              </>
            )}
          </p>
          <Link
            href={`/login?mode=signup&next=/join/${code}`}
            className="mt-8 inline-block w-full rounded-full bg-l-varsity-glow px-5 py-3 text-sm font-semibold text-l-text"
          >
            Sign up to join
          </Link>
          <Link
            href={`/login?next=/join/${code}`}
            className="mt-3 inline-block w-full rounded-full border border-l-line px-5 py-3 text-sm font-medium text-l-text"
          >
            I already have an account
          </Link>
        </>
      )}

      {/* 4. Signed in, but we don't know their name yet → straight to the
             varsity setup (the effect above), which brings them back here.
             NOT the nine-step student onboarding, which has nothing to do with
             rowing. It has to happen before the request goes in, or the
             captain gets a queue of "Unnamed" people. There used to be a
             "Nearly there" screen in between with one button; it was a tap
             that told them nothing they wouldn't see on the next screen. */}
      {preview?.valid && ready && loggedIn && !varsityReady && (
        <p className="text-sm text-l-text-2">Checking this invite…</p>
      )}

      {/* 5. Ready to ask — the button that puts you in the queue */}
      {preview?.valid && ready && loggedIn && varsityReady && !result && (
        <>
          <h1 className="font-display text-3xl text-l-text">Join {teamName}</h1>
          <p className="mt-3 text-sm leading-relaxed text-l-text-2">
            {preview.autoApprove
              ? "You'll get access to the team's training as soon as you join."
              : "Your captain gets a request and lets you in. You'll see the team's training once they do."}
          </p>
          <p className="mt-4 rounded-xl border border-l-line bg-l-surface px-4 py-3 text-xs text-l-text-2">
            Joining as <span className="text-l-text">{email}</span>
          </p>
          <button
            type="button"
            onClick={join}
            disabled={busy}
            className="mt-6 w-full rounded-full bg-l-varsity-glow px-5 py-3 text-sm font-semibold text-l-text disabled:opacity-60"
          >
            {busy ? "Sending…" : preview.autoApprove ? "Join the team" : "Ask to join"}
          </button>
        </>
      )}

      {/* 6a. In the waiting room */}
      {result?.status === "pending" && (
        <>
          <h1 className="font-display text-3xl text-l-text">Request sent</h1>
          <p className="mt-3 text-sm leading-relaxed text-l-text-2">
            Your captain has to let you in. You&apos;ll find {teamName} waiting in your profile
            once they do — nothing else to do here.
          </p>
          <Link
            href={appHome}
            className="mt-8 inline-block w-full rounded-full border border-l-line px-5 py-3 text-sm font-medium text-l-text"
          >
            Back to the app
          </Link>
        </>
      )}

      {/* 6b. Straight in (a link the captain marked auto-approve) */}
      {result?.status === "approved" && (
        <>
          <h1 className="font-display text-3xl text-l-text">You&apos;re in</h1>
          <p className="mt-3 text-sm leading-relaxed text-l-text-2">
            Welcome to {teamName}. Varsity Mode now sits alongside your student account —
            switch between them from your profile.
          </p>
          <Link
            href={VARSITY_HOME}
            className="mt-8 inline-block w-full rounded-full bg-l-varsity-glow px-5 py-3 text-sm font-semibold text-l-text"
          >
            Open Varsity Mode
          </Link>
        </>
      )}

      {/* 6c. The server said no */}
      {result?.reason && (
        <>
          <h1 className="font-display text-3xl text-l-text">Couldn&apos;t join</h1>
          <p className="mt-3 text-sm leading-relaxed text-l-text-2">
            {refusalMessage(result.reason, preview?.personal)}
          </p>
          <Link
            href="/join"
            onClick={forgetParkedCode}
            className="mt-7 inline-block w-full rounded-full border border-l-line px-5 py-3 text-sm font-medium text-l-text"
          >
            Try another link
          </Link>
        </>
      )}
    </JoinShell>
  );
}

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
      if (active) setPreview(p);
    })();
    return () => {
      active = false;
    };
  }, [code]);

  const join = useCallback(async () => {
    setBusy(true);
    const r = await redeemInvite(code);
    setBusy(false);
    setResult(r.ok ? { status: r.status } : { reason: r.reason });
    if (r.ok) {
      try {
        localStorage.removeItem(PENDING_INVITE_KEY);
      } catch {
        /* nothing to clean up */
      }
    }
  }, [code]);

  const teamName = preview?.teamName ?? "your team";
  /*
    Where "back to the app" should land. Someone who came in varsity-first has
    no student side, so /gyms would bounce them into an onboarding they never
    asked for — send them to the waiting screen, which IS their app until a
    captain lets them in.
  */
  const appHome = !loggedIn ? "/" : studentReady ? "/gyms" : "/varsity/waiting";

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

      {/* 3. Good code, but we don't know who you are yet */}
      {preview?.valid && ready && !loggedIn && (
        <>
          <h1 className="font-display text-3xl text-l-text">Join {teamName}</h1>
          <p className="mt-3 text-sm leading-relaxed text-l-text-2">
            Sign in with your university account to ask your captain for a place on the squad.
            {preview.emailDomain && (
              <>
                {" "}
                This team only accepts{" "}
                <span className="text-l-text">@{preview.emailDomain}</span> addresses.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => router.push(`/login?next=/join/${code}`)}
            className="mt-8 w-full rounded-full bg-l-varsity px-5 py-3 text-sm font-semibold text-l-bg"
          >
            Sign in to join
          </button>
        </>
      )}

      {/* 4. Signed in, but we don't know their name yet.
             Two questions on the varsity setup screen — NOT the nine-step
             student onboarding, which has nothing to do with rowing. It has to
             happen before the request goes in, or the captain gets a queue of
             "Unnamed" people and can't tell who to approve. */}
      {preview?.valid && ready && loggedIn && !varsityReady && (
        <>
          <h1 className="font-display text-3xl text-l-text">Nearly there</h1>
          <p className="mt-3 text-sm leading-relaxed text-l-text-2">
            Two quick questions so {teamName} knows who&apos;s asking, then you can send
            your request.
          </p>
          <Link
            href="/varsity/setup"
            className="mt-8 inline-block w-full rounded-full bg-l-varsity px-5 py-3 text-sm font-semibold text-l-bg"
          >
            Set up my profile
          </Link>
        </>
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
            className="mt-6 w-full rounded-full bg-l-varsity px-5 py-3 text-sm font-semibold text-l-bg disabled:opacity-60"
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
            className="mt-8 inline-block w-full rounded-full bg-l-varsity px-5 py-3 text-sm font-semibold text-l-bg"
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
            className="mt-7 inline-block w-full rounded-full border border-l-line px-5 py-3 text-sm font-medium text-l-text"
          >
            Try another link
          </Link>
        </>
      )}
    </JoinShell>
  );
}

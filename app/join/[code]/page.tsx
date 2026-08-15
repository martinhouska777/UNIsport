"use client";

/*
  THE INVITE LANDING PAGE — where a WhatsApp / email link drops you.

  This page never grants anything by itself. It shows what the code is for,
  then asks the server to redeem it; the usual answer is "you're in the queue,
  your captain has to let you in". Everything that could reject the code
  (revoked, expired, used up, wrong email, wrong university domain) is decided
  in the database — see db/varsity_teams.sql — so a forwarded link is harmless.

  Zone 1 styling (`l-*` tokens): a stranger can land here before signing in, so
  no university colors, only the neutral brand + the gold varsity accent.
*/
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { instrumentSerif } from "@/components/landing/fonts";
import { useAppState } from "@/components/AppState";
import {
  previewInvite,
  redeemInvite,
  redeemMessage,
  PENDING_INVITE_KEY,
  type InvitePreview,
} from "@/lib/varsity/invites";
import { VARSITY_HOME } from "@/lib/varsity/theme";

export default function JoinWithCodePage() {
  const params = useParams<{ code: string }>();
  const code = (params?.code ?? "").toString().toUpperCase();
  const router = useRouter();
  const { ready, loggedIn, onboarded, email } = useAppState();

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
          Team invite
        </div>

        {/* 1. Still looking the code up */}
        {!preview && <p className="text-sm text-l-text-2">Checking this invite…</p>}

        {/* 2. The code is no good — say exactly why */}
        {preview && !preview.valid && (
          <>
            <h1 className="font-display text-3xl text-l-text">This link doesn&apos;t work</h1>
            <p className="mt-3 text-sm leading-relaxed text-l-text-2">
              {redeemMessage[preview.reason ?? "unknown"] ?? redeemMessage.unknown}
            </p>
            <Link
              href="/"
              className="mt-8 inline-block text-xs font-medium text-l-text-2 hover:text-l-text"
            >
              ← Back to UNIsport
            </Link>
          </>
        )}

        {/* 3. Good code, but we don't know who you are yet */}
        {preview?.valid && ready && !loggedIn && (
          <>
            <h1 className="font-display text-3xl text-l-text">Join {teamName}</h1>
            <p className="mt-3 text-sm leading-relaxed text-l-text-2">
              Sign in with your university account to ask your captain for a place on the
              squad.
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

        {/* 4. Signed in but the normal student setup isn't finished */}
        {preview?.valid && ready && loggedIn && !onboarded && (
          <>
            <h1 className="font-display text-3xl text-l-text">Nearly there</h1>
            <p className="mt-3 text-sm leading-relaxed text-l-text-2">
              Finish setting up your UNIsport account first — then come back to this link
              and you&apos;ll be able to join {teamName}.
            </p>
            <Link
              href="/onboarding"
              className="mt-8 inline-block w-full rounded-full bg-l-varsity px-5 py-3 text-sm font-semibold text-l-bg"
            >
              Finish setting up
            </Link>
          </>
        )}

        {/* 5. Ready to ask — the button that puts you in the queue */}
        {preview?.valid && ready && loggedIn && onboarded && !result && (
          <>
            <h1 className="font-display text-3xl text-l-text">Join {teamName}</h1>
            <p className="mt-3 text-sm leading-relaxed text-l-text-2">
              {preview.autoApprove
                ? "You'll get access to the team's training as soon as you join."
                : "Your captain gets a request and lets you in. You'll see the team's training once they do."}
            </p>
            <p className="mt-4 rounded-xl border border-l-border bg-l-surface px-4 py-3 text-xs text-l-text-2">
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
              Your captain has to let you in. You&apos;ll find {teamName} waiting in your
              profile once they do — nothing else to do here.
            </p>
            <Link
              href="/gyms"
              className="mt-8 inline-block w-full rounded-full border border-l-border px-5 py-3 text-sm font-medium text-l-text"
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
              {redeemMessage[result.reason] ?? result.reason}
            </p>
            <Link
              href="/gyms"
              className="mt-8 inline-block text-xs font-medium text-l-text-2 hover:text-l-text"
            >
              ← Back to the app
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

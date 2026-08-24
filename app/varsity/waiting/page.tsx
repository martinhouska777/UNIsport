"use client";

/*
  THE WAITING ROOM — the whole app for someone who arrived through a team link
  and hasn't been approved yet.

  This screen exists because we deliberately DON'T auto-approve: a link only
  ever gets you into the queue. Someone who came in varsity-first has skipped
  the student side, so until their captain taps "let in" there is genuinely
  nothing else to show them. Rather than a dead end, it does three things:
  says exactly where they stand, shows the email their captain will see them
  under (so they can chase it in person), and offers the student side as
  something to do meanwhile — it's optional, not a consolation prize.

  Sits OUTSIDE the (athlete) route group on purpose: that layout requires an
  approved member, which is precisely what this person isn't.
*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import VarsityCrest from "@/components/varsity/VarsityCrest";
import { useMembership } from "@/components/varsity/useMembership";
import { VARSITY_HOME } from "@/lib/varsity/theme";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import { IconCheck, IconClock } from "@/components/icons";

export default function VarsityWaitingPage() {
  const router = useRouter();
  const { ready, loggedIn, email, studentReady, logout } = useAppState();
  const { membership, loading, isMember, isPending, reload } = useMembership();
  const vTheme = useVarsityTheme();

  useEffect(() => {
    if (!ready) return;
    if (!loggedIn) {
      router.replace("/");
      return;
    }
    if (loading) return;
    // Approved while this was open → straight in. On no team → the invite screen.
    if (isMember) router.replace(VARSITY_HOME);
    else if (!membership) router.replace("/join");
  }, [ready, loggedIn, loading, isMember, membership, router]);

  if (!ready || !loggedIn || loading || !isPending) return null;

  return (
    <ThemeProvider
      tokens={vTheme.dark}
      light={vTheme.light}
      paintRoot
      className="flex h-dvh flex-col overflow-y-auto bg-background"
    >
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface">
          <VarsityCrest size={40} />
        </div>

        <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border border-warn-line bg-warn-tint px-3 py-1.5 text-[11px] font-medium text-warn">
          <IconClock size={13} />
          Waiting to be let in
        </div>

        <h1 className="font-serif text-[22px] font-medium leading-tight text-text">
          {membership!.teamName}
        </h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
          Your request is with the team. A coach or captain has to approve it — once they
          do, the training plan, lineups and the squad all open up here.
        </p>

        <div className="mt-5 rounded-xl border border-border bg-surface px-4 py-3 text-left">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            They&apos;ll see you as
          </div>
          <div className="mt-1 truncate text-[13px] text-text">{email}</div>
        </div>

        <button
          type="button"
          onClick={reload}
          className="mt-4 w-full rounded-xl border border-border bg-surface-2 py-3 text-sm font-medium text-text"
        >
          Check again
        </button>

        {/* The student side is optional, and this is the natural moment to
            mention it — not as a fallback, just the other half of the app. */}
        {!studentReady && (
          <div className="mt-7 rounded-xl border border-border bg-surface px-4 py-3.5 text-left">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-accent">
                <IconCheck size={15} />
              </span>
              <div>
                <div className="text-[13px] font-medium text-text">
                  While you wait — set up the student side
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Campus gyms, finding people to train with, and messages. Separate from
                  your team, and entirely up to you.
                </p>
              </div>
            </div>
            <Link
              href="/onboarding"
              className="mt-3 block w-full rounded-lg bg-accent py-2.5 text-center text-[12px] font-semibold text-background"
            >
              Set it up
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace("/");
          }}
          className="mt-7 text-[12px] text-muted"
        >
          Log out
        </button>
      </div>
    </ThemeProvider>
  );
}

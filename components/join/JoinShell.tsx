"use client";

/*
  Shared chrome for the two invite screens (/join and /join/<code>).

  The important bit is BACK, and it has to GO BACK rather than navigate to a
  fixed page. A signed-in person reaches these screens from Settings, and
  linking back to Settings PUSHES a second Settings entry onto the history —
  so Settings' own back button then returns here, and the two screens bounce
  off each other with no way out. Stepping back through the history instead
  leaves it exactly as it was.

  Someone arriving cold from a WhatsApp link has no history to step back
  through, so they get the public landing page instead.

  Zone 1 styling (`l-*` tokens): a stranger can land here before signing in, so
  neutral brand only — no university colors.
*/
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { instrumentSerif } from "@/components/landing/fonts";
import { useAppState } from "@/components/AppState";
import { IconArrowLeft } from "@/components/icons";

export default function JoinShell({ badge, children }: { badge: string; children: ReactNode }) {
  const { loggedIn } = useAppState();
  const router = useRouter();

  const goBack = () => {
    // history.length > 1 means there IS somewhere to step back to — a tab
    // opened straight onto this link has nothing behind it.
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.replace(loggedIn ? "/settings" : "/");
  };

  return (
    <div
      className={`${instrumentSerif.variable} relative flex min-h-dvh flex-col items-center justify-center bg-l-bg px-6 text-center font-sans text-l-text`}
    >
      <button
        type="button"
        onClick={goBack}
        aria-label="Back"
        className="tap44 press-icon absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-l-border text-l-text-2 hover:text-l-text"
      >
        <IconArrowLeft size={18} />
      </button>

      <div className="w-full max-w-sm">
        {/* Only a link for someone who isn't signed in — for everyone else the
            marketing landing page isn't a place they want to end up. */}
        {loggedIn ? (
          <span className="mb-8 inline-block font-display text-2xl italic tracking-tight text-l-text">
            UNI<span className="text-l-varsity">sport</span>
          </span>
        ) : (
          <Link
            href="/"
            className="mb-8 inline-block font-display text-2xl italic tracking-tight text-l-text"
          >
            UNI<span className="text-l-varsity">sport</span>
          </Link>
        )}

        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-l-varsity-soft bg-l-varsity-dim px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-l-varsity">
          {badge}
        </div>

        {children}
      </div>
    </div>
  );
}

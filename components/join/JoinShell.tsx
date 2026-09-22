"use client";

/*
  Shared chrome for the single-screen Zone 1 pages: the two invite screens
  (/join and /join/<code>) and the waitlist (/waitlist).

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
import Wordmark from "@/components/landing/Wordmark";
import { useAppState } from "@/components/AppState";
import { IconArrowLeft } from "@/components/icons";

/* The invite screens are a varsity door, so they wear the gold; the waitlist
   is the product's own front door and wears the brand blue, like the landing
   page it was linked from. Tokens either way (rule 1) — never a hex. */
const ACCENTS = {
  varsity: { mark: "text-l-varsity", chip: "border-l-varsity-soft bg-l-varsity-dim text-l-varsity" },
  brand: { mark: "text-l-accent", chip: "border-l-accent-soft bg-l-accent-dim text-l-accent" },
} as const;

export default function JoinShell({
  badge,
  accent = "varsity",
  markClassName = "text-2xl",
  children,
}: {
  badge: string;
  accent?: keyof typeof ACCENTS;
  /** Size of the wordmark — the waitlist is the product's own door and wears it large. */
  markClassName?: string;
  children: ReactNode;
}) {
  const tone = ACCENTS[accent];
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
        className="tap44 press-icon absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-l-line text-l-text-2 hover:text-l-text"
      >
        <IconArrowLeft size={18} />
      </button>

      <div className="w-full max-w-sm">
        {/* Only a link for someone who isn't signed in — for everyone else the
            marketing landing page isn't a place they want to end up. */}
        {loggedIn ? (
          <span className="mb-8 inline-block">
            <Wordmark className={markClassName} accentClassName={tone.mark} />
          </span>
        ) : (
          <Link
            href="/"
            className="mb-8 inline-block"
          >
            <Wordmark className={markClassName} accentClassName={tone.mark} />
          </Link>
        )}

        {/* On its own line under the wordmark: a short badge used to slide up
            beside the logo, which read as one strange word. */}
        <div className="mb-5 flex justify-center">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider ${tone.chip}`}>
            {badge}
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}

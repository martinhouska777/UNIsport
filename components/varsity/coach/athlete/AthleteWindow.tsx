"use client";

/*
  ONE THING ABOUT ONE ROWER, FULL SCREEN.
  ---------------------------------------------------------------------------
  A rower's page in the console is a short page — who they are, the coach's
  note, their bests — and then three cards: Statistics, Past workouts,
  Calendar. Each one opens a whole screen of its own, and you press the cross
  to come back (owner, 2026-09-19: "not that you switch one screen").

  It was a tab switch for a day. The owner's reasoning is that this page has
  more to hold than two halves — the erg and what comes after it — and a page
  that swaps its middle between three long things is a page you can get lost
  in. A card you tap into and shut again is always somewhere.

  Portalled to <body> and re-wrapped in <ThemeProvider>, like the sheets and
  the teammate calendar window, so it covers the console's tab bar and keeps
  the Varsity theme. A sheet opened INSIDE it (tapping a day, say) mounts
  after this and so lands on top of it, which is what you want.
*/
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import { IconX } from "@/components/icons";

export default function AthleteWindow({
  name,
  title,
  onClose,
  children,
}: {
  /** Whose screen this is — the cross takes the place of their page. */
  name: string;
  /** Which of their screens: "Statistics", "Past workouts", "Calendar". */
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const vTheme = useVarsityTheme();

  return createPortal(
    <ThemeProvider tokens={vTheme.dark} light={vTheme.light}>
      <div className="fixed inset-0 z-[60] flex flex-col bg-background [animation:backdrop-in_0.18s_ease-out]">
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-border px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title.toLowerCase()}`}
            className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconX size={15} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold leading-tight text-text">{name}</div>
            <div className="mt-0.5 truncate text-[11px] text-muted">{title}</div>
          </div>
        </div>
        {/* The screen itself scrolls; the bar above it does not. */}
        <div className="min-h-0 flex-1 overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-screen-sm px-4 pt-4">{children}</div>
        </div>
      </div>
    </ThemeProvider>,
    document.body,
  );
}

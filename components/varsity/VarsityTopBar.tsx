"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VarsityCrest from "@/components/varsity/VarsityCrest";
import ModeSwitcherSheet from "@/components/ModeSwitcherSheet";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";
import useTapOrDoubleTap from "@/components/useTapOrDoubleTap";
import { IconArrowLeft, IconChevronDown, IconSettings } from "@/components/icons";

/*
  Top bar for every Varsity Mode screen: the varsity mark on the left, and on
  the right the settings cog plus an "exit" control that returns to the normal
  app (Profile tab). This is the mode-switch back out of Varsity Mode.

  There is no notifications bell and no light/dark toggle here any more. Both
  are SWITCHES, and every switch in the app lives on the Settings screen behind
  the cog — which is how the normal app has always worked on a phone (its only
  light/dark toggle outside Settings is on the laptop side rail). Varsity Mode
  was the odd one out, carrying two of them in its chrome.

  It also keeps the bar honest: it had four controls squeezed against the mark,
  and on a narrow phone the round ones were the ones being squashed.

  The mark is deliberately large (44px tall — the crest is a portrait shape, so
  that is only ~32 wide): this is the one place the mode announces itself, and
  at 30px the oars behind the shield read as a smudge. The bar's own vertical
  padding came down a notch to pay for most of the extra height.
*/
export default function VarsityTopBar() {
  const router = useRouter();
  const { studentReady, universityKey } = useAppState();
  const [switchingMode, setSwitchingMode] = useState(false);
  // The school's everyday name is DATA (lib/themes.ts), never typed here.
  const school = getUniversity(universityKey)?.shortName ?? "";

  /*
    The mark is the mode switcher, mirroring the name on the normal profile:
    one tap opens the sheet, two taps drop you back into the normal app.

    "Back into the normal app" only exists if they HAVE one. A rower who joined
    through a team link has never set up the student side, and sending them to
    /profile would bounce them straight into the nine-step onboarding they were
    spared. For them both taps open the sheet, which offers the student side
    properly, as a choice.
  */
  const handleModeTap = useTapOrDoubleTap(
    useCallback(() => setSwitchingMode(true), []),
    useCallback(() => {
      if (studentReady) router.push("/profile");
      else setSwitchingMode(true);
    }, [studentReady, router]),
  );

  return (
    /* The sheet is a SIBLING of the bar, not a child: the bar sits in its own
       z-10 stacking context alongside the page and the tab nav, so a sheet
       nested inside it would be painted underneath them. */
    <>
    <div className="relative z-10 flex flex-shrink-0 items-center justify-between border-b border-border bg-background px-4 py-2">
      <button
        type="button"
        onClick={handleModeTap}
        aria-label="Switch mode"
        className="flex min-w-0 items-center gap-2 text-left"
      >
        <VarsityCrest size={44} />
        {/* min-w-0 + truncate: on a narrow phone it is the NAME that gives way,
            not the round buttons beside it — a squashed circle is a bug, a
            shortened team name is not. */}
        <div className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-[8px] font-semibold tracking-[0.18em] text-accent">
            VARSITY MODE
          </span>
          <span className="mt-0.5 truncate text-[11px] tracking-[0.08em] text-muted">
            {school} Rowing
          </span>
        </div>
        <IconChevronDown size={13} className="flex-shrink-0 text-muted" />
      </button>

      <div className="flex flex-shrink-0 items-center gap-2">
        {/* Settings has to be reachable from here: a rower who joined through a
            team link has no student profile to find the cog on, so without this
            they could never change units, notifications — or log out. */}
        <Link
          href="/settings"
          aria-label="Settings"
          className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted"
        >
          <IconSettings size={16} />
        </Link>
        {/* Only offered when there IS something to exit to. */}
        {studentReady && (
          <Link
            href="/profile"
            aria-label="Exit Varsity Mode"
            className="flex h-8 flex-shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-3 text-[11px] font-medium text-muted"
          >
            <IconArrowLeft size={14} />
            Exit
          </Link>
        )}
      </div>
    </div>

    {switchingMode && (
      <ModeSwitcherSheet current="varsity" onClose={() => setSwitchingMode(false)} />
    )}
    </>
  );
}

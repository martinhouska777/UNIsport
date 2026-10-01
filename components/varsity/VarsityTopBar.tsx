"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import VarsityCrest from "@/components/varsity/VarsityCrest";
import ModeSwitcherSheet from "@/components/ModeSwitcherSheet";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";
import useTapOrDoubleTap from "@/components/useTapOrDoubleTap";
import { IconChevronDown, IconSettings } from "@/components/icons";

/*
  Top bar for the Varsity Home and Profile tabs: the varsity mark on the left, and on
  the right the settings cog. The mark is the way back out of Varsity Mode (the
  mode switcher; two taps go straight to the normal app).

  NO EXIT BUTTON (owner, 2026-10-01: "delete the exit from varsity mode, leave
  it in coaches"). There was a "← Exit" pill beside the cog that went to the
  normal Profile. The Coach Console keeps its own "← Athlete view".

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

  ONLY ON HOME AND PROFILE (owner, 2026-09-30). It used to top every Varsity
  screen. Now it works like the student side, where only the Profile has a bar
  and Match starts straight with its search: Home keeps it because Varsity
  Mode opens there, Profile because that is where you go for yourself and your
  settings. Calendar, Workouts and the screens opened from inside a tab (Team,
  All boats — they have their own back arrow) start with their own content, and
  the Calendar's month gets the height. Both tabs are always in the bottom bar,
  so the switch and the cog stay one tap away.
*/
const BAR_ON = ["/varsity/home", "/varsity/profile"];

export default function VarsityTopBar() {
  const pathname = usePathname();
  const { universityKey } = useAppState();
  const { handleModeTap, switchingMode, closeSwitcher } = useVarsityModeTap();
  // The school's everyday name is DATA (lib/themes.ts), never typed here.
  const school = getUniversity(universityKey)?.shortName ?? "";

  if (!BAR_ON.includes(pathname)) return null;

  return (
    /* The sheet is a SIBLING of the bar, not a child: the bar sits in its own
       z-10 stacking context alongside the page and the tab nav, so a sheet
       nested inside it would be painted underneath them. */
    <>
    {/* Phone and tablet only — from `lg` up VarsitySideNav holds all of this. */}
    <div className="relative z-10 flex flex-shrink-0 items-center justify-between border-b border-border bg-background px-4 py-2 lg:hidden">
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
          <span className="mt-0.5 truncate pb-px text-[11px] leading-tight tracking-[0.08em] text-muted">
            {school} Rowing
          </span>
        </div>
        <IconChevronDown size={13} className="flex-shrink-0 text-muted" />
      </button>

      <div className="flex flex-shrink-0 items-center gap-2">
        {/* EDIT YOUR PROFILE moved to Settings (owner, 2026-09-19), and is
            Settings → Rowing profile since 2026-09-30. A pencil stood here. */}
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
      </div>
    </div>

    {switchingMode && (
      <ModeSwitcherSheet current="varsity" onClose={closeSwitcher} />
    )}
    </>
  );
}

/*
  The mark is the mode switcher, mirroring the name on the normal profile:
  one tap opens the sheet, two taps drop you back into the normal app. Shared by
  this bar and the laptop sidebar (VarsitySideNav).

  "Back into the normal app" only exists if they HAVE one. A rower who joined
  through a team link has never set up the student side, and sending them to
  /profile would bounce them straight into the nine-step onboarding they were
  spared. For them both taps open the sheet, which offers the student side
  properly, as a choice.
*/
export function useVarsityModeTap() {
  const router = useRouter();
  const { studentReady } = useAppState();
  const [switchingMode, setSwitchingMode] = useState(false);
  const handleModeTap = useTapOrDoubleTap(
    useCallback(() => setSwitchingMode(true), []),
    useCallback(() => {
      if (studentReady) router.push("/profile");
      else setSwitchingMode(true);
    }, [studentReady, router]),
  );
  const closeSwitcher = useCallback(() => setSwitchingMode(false), []);
  return { handleModeTap, switchingMode, closeSwitcher };
}

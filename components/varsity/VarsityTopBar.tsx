"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VarsityCrest from "@/components/varsity/VarsityCrest";
import ModeSwitcherSheet from "@/components/ModeSwitcherSheet";
import useTapOrDoubleTap from "@/components/useTapOrDoubleTap";
import { ThemeModeToggle } from "@/components/ThemeMode";
import { IconBell, IconArrowLeft, IconChevronDown } from "@/components/icons";
import { subscribeToPush, isSubscribed, sendTestNotification } from "@/lib/push/client";

/*
  Top bar for every Varsity Mode screen: the varsity mark on the left, and on
  the right a notifications bell + an "exit" control that returns to the normal
  app (Profile tab). This is the mode-switch back out of Varsity Mode.
*/
export default function VarsityTopBar() {
  const router = useRouter();
  const [switchingMode, setSwitchingMode] = useState(false);

  // The mark is the mode switcher, mirroring the name on the normal profile:
  // one tap opens the sheet, two taps drop you back into the normal app.
  const handleModeTap = useTapOrDoubleTap(
    useCallback(() => setSwitchingMode(true), []),
    useCallback(() => router.push("/profile"), [router]),
  );

  // Tap the bell: enable notifications the first time, then show a sample of how a
  // team notification will look (real team alerts use the same delivery path).
  const handleBell = async () => {
    if (!(await isSubscribed())) {
      const status = await subscribeToPush();
      if (status !== "granted") return;
    }
    await sendTestNotification({
      title: "Harvard Rowing",
      body: "This is how a team notification will look.",
      url: "/varsity",
    });
  };

  return (
    /* The sheet is a SIBLING of the bar, not a child: the bar sits in its own
       z-10 stacking context alongside the page and the tab nav, so a sheet
       nested inside it would be painted underneath them. */
    <>
    <div className="relative z-10 flex flex-shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3">
      <button
        type="button"
        onClick={handleModeTap}
        aria-label="Switch mode"
        className="flex items-center gap-2 text-left"
      >
        <VarsityCrest size={30} />
        <div className="flex flex-col leading-none">
          <span className="text-[8px] font-semibold tracking-[0.18em] text-accent">
            VARSITY MODE
          </span>
          <span className="mt-0.5 text-[10px] tracking-[0.08em] text-muted">
            Harvard Rowing
          </span>
        </div>
        <IconChevronDown size={13} className="text-muted" />
      </button>

      <div className="flex items-center gap-2">
        <ThemeModeToggle />
        <button
          type="button"
          onClick={handleBell}
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted"
        >
          <IconBell size={16} />
        </button>
        <Link
          href="/profile"
          aria-label="Exit Varsity Mode"
          className="flex h-8 items-center gap-1 rounded-full border border-border bg-surface px-3 text-[11px] font-medium text-muted"
        >
          <IconArrowLeft size={14} />
          Exit
        </Link>
      </div>
    </div>

    {switchingMode && (
      <ModeSwitcherSheet current="varsity" onClose={() => setSwitchingMode(false)} />
    )}
    </>
  );
}

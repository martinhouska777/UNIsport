"use client";

import Link from "next/link";
import VarsityShield from "@/components/varsity/VarsityShield";
import { ThemeModeToggle } from "@/components/ThemeMode";
import { IconBell, IconArrowLeft } from "@/components/icons";

/*
  Top bar for every Varsity Mode screen: the varsity mark on the left, and on
  the right a notifications bell + an "exit" control that returns to the normal
  app (Profile tab). This is the mode-switch back out of Varsity Mode.
*/
export default function VarsityTopBar() {
  return (
    <div className="relative z-10 flex flex-shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3">
      <div className="flex items-center gap-2">
        <VarsityShield size={26} />
        <div className="flex flex-col leading-none">
          <span className="text-[8px] font-semibold tracking-[0.18em] text-accent">
            VARSITY MODE
          </span>
          <span className="mt-0.5 text-[10px] tracking-[0.08em] text-muted">
            Harvard Rowing
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeModeToggle />
        <button
          type="button"
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
  );
}

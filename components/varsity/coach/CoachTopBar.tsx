"use client";

import Link from "next/link";
import { ThemeModeToggle } from "@/components/ThemeMode";
import { IconArrowLeft } from "@/components/icons";

/*
  Top bar for the Coach Console. Shows the coach context and an exit back to the
  athlete side of Varsity Mode (Home). The crimson "H" mark mirrors the coach
  mockup's brand block.
*/
export default function CoachTopBar() {
  return (
    <div className="relative z-10 flex flex-shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-contrast">
          H
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold text-text">Coach Console</span>
          <span className="mt-0.5 text-[10px] tracking-[0.1em] text-muted">Harvard Rowing</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeModeToggle />
        <Link
          href="/varsity/home"
          aria-label="Back to athlete view"
          className="flex h-8 items-center gap-1 rounded-full border border-border bg-surface px-3 text-[11px] font-medium text-muted"
        >
          <IconArrowLeft size={14} />
          Athlete view
        </Link>
      </div>
    </div>
  );
}

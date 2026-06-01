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
    <div className="relative z-10 flex flex-shrink-0 items-center justify-between bg-primary px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-contrast text-sm font-semibold text-primary">
          H
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold text-primary-contrast">Coach Console</span>
          <span className="mt-0.5 text-[10px] tracking-[0.1em] text-primary-contrast/75">Harvard Rowing</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeModeToggle className="!border-primary-contrast/30 !bg-primary-contrast/10 !text-primary-contrast" />
        <Link
          href="/varsity/home"
          aria-label="Back to athlete view"
          className="flex h-8 items-center gap-1 rounded-full border border-primary-contrast/30 bg-primary-contrast/10 px-3 text-[11px] font-medium text-primary-contrast"
        >
          <IconArrowLeft size={14} />
          Athlete view
        </Link>
      </div>
    </div>
  );
}

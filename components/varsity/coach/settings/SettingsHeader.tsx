"use client";

/*
  The top of every page behind the console's Settings menu: a back arrow on the
  left and the page's name — the same header the app's own Settings wears
  (owner, 2026-09-18: "there is no button back" on Training settings). Back
  always goes to the Settings menu, not browser history, so a page opened from
  a link still has somewhere to go.
*/
import Link from "next/link";
import { IconArrowLeft } from "@/components/icons";

export default function SettingsHeader({ title, back = "/varsity/coach/settings" }: { title: string; back?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-screen-sm items-center gap-3 border-b border-border px-3.5 py-3">
      <Link href={back} aria-label="Back" className="tap44 -ml-1 flex h-8 w-8 items-center justify-center text-text">
        <IconArrowLeft size={20} />
      </Link>
      <h1 className="flex-1 text-base font-medium text-text">{title}</h1>
    </div>
  );
}

"use client";

/*
  The title bar of the console's Settings — round 2's look (owner, 2026-09-30:
  "like WhatsApp or Instagram"): a white bar across the screen, the page's name,
  and the save line on the right. The pages behind the menu get a back arrow on
  the left (owner, 2026-09-18: "there is no button back" on Training settings);
  the menu itself passes `back={null}` — it is where the arrows lead.

  Back always goes to the Settings menu, not browser history, so a page opened
  from a link still has somewhere to go. Unlike the app's own Settings this sits
  inside the console (its top bar and tabs stay), so on a laptop the title lines
  up with the column under it rather than with the screen's edge.
*/
import Link from "next/link";
import { IconArrowLeft } from "@/components/icons";
import type { ProfileSaveState } from "@/components/profile/useProfileData";

export default function SettingsHeader({
  title,
  back = "/varsity/coach/settings",
  saveState = "idle",
}: {
  title: string;
  back?: string | null;
  saveState?: ProfileSaveState;
}) {
  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto flex min-h-[52px] w-full max-w-screen-sm items-center gap-3 px-3.5 py-3">
        {back && (
          <Link href={back} aria-label="Back" className="tap44 press-icon text-text">
            <IconArrowLeft size={20} />
          </Link>
        )}
        <h1 className="flex-1 text-base font-medium text-text">{title}</h1>
        {saveState !== "idle" && (
          <span className={`text-[11px] ${saveState === "error" ? "text-danger" : "text-muted"}`}>
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Couldn’t save"}
          </span>
        )}
      </div>
    </div>
  );
}

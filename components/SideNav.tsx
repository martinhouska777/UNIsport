"use client";

/*
  LAPTOP NAVIGATION — the student app.
  ------------------------------------------------------------------
  From the `lg` breakpoint up the bottom tabs become a left sidebar and
  BottomNav hides itself. The frame is the shared SideRail (the same one
  Varsity Mode and the Coach Console use), so all three look alike.

  The tab list, icons and unread badge all come from BottomNav — one source of
  truth, so a new tab appears in both navigations at once.
*/
import { usePathname } from "next/navigation";
import { tabs, useUnreadCount } from "@/components/BottomNav";
import { ThemeModeToggle } from "@/components/ThemeMode";
import SideRail from "@/components/SideRail";
import Wordmark from "@/components/landing/Wordmark";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";

export default function SideNav() {
  const pathname = usePathname();
  const unread = useUnreadCount();
  const { universityKey } = useAppState();
  // The school name is DATA, like the theme — never written into a component.
  const university = getUniversity(universityKey)?.name ?? "";

  return (
    <SideRail
      header={
        /* Wordmark — the app has no header on desktop, so this anchors the page.
           The same drawn mark the landing wears, in Zone 2's own tokens. */
        <div>
          <Wordmark className="text-[19px]" toneClassName="text-text" accentClassName="text-primary" />
        </div>
      }
      items={tabs.map((tab) => ({
        href: tab.href,
        label: tab.label,
        icon: tab.icon,
        active: pathname === tab.href,
        /* Same anchor name BottomNav uses — see lib/tour.ts. */
        tour: `tab-${tab.href}`,
        badge: tab.href === "/messages" ? unread : undefined,
      }))}
      footer={
        <>
          <span className="truncate text-[11px] uppercase tracking-[0.1em] text-muted">
            {university}
          </span>
          <ThemeModeToggle />
        </>
      }
    />
  );
}

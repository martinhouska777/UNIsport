"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { getUnreadTotal, UNREAD_REFRESH_EVENT } from "@/lib/supabase/messages";
import { useMembership } from "@/components/varsity/useMembership";
import { VARSITY_HOME } from "@/lib/varsity/theme";
import useDoubleTap from "@/components/useDoubleTap";

type Tab = {
  href: string;
  label: string;
  icon: ReactNode;
  /** The same drawing, solid, for the tab you are on (Strava's way). */
  iconActive: ReactNode;
  /* The inner pages that belong to this tab, so it stays lit on them: a gym's
     own page is still Gyms, a person's profile is reached from Match, and
     Leaderboards and Memories open from the Profile tab. */
  owns?: string[];
};

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Shared with SideNav (the laptop-width version of this nav) so the tab list
// and its icons live in exactly one place.
export const tabs: Tab[] = [
  {
    href: "/gyms",
    label: "Gyms",
    icon: (
      <svg {...iconProps}>
        <rect x="2" y="9.5" width="3" height="5" rx="1" />
        <rect x="5" y="6.5" width="3.5" height="11" rx="1" />
        <rect x="15.5" y="6.5" width="3.5" height="11" rx="1" />
        <rect x="19" y="9.5" width="3" height="5" rx="1" />
        <path d="M8.5 12h7" />
      </svg>
    ),
    iconActive: (
      <svg {...iconProps}>
        <rect x="2" y="9.5" width="3" height="5" rx="1" fill="currentColor" />
        <rect x="5" y="6.5" width="3.5" height="11" rx="1" fill="currentColor" />
        <rect x="15.5" y="6.5" width="3.5" height="11" rx="1" fill="currentColor" />
        <rect x="19" y="9.5" width="3" height="5" rx="1" fill="currentColor" />
        <path d="M8.5 12h7" />
      </svg>
    ),
  },
  {
    href: "/match",
    label: "Match",
    owns: ["/people"],
    /* TWO PEOPLE, Strava's drawing (owner, 2026-10-18: "match will be the 2
       people from strava"). It was a heart. */
    icon: (
      <svg {...iconProps}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19a6 6 0 0 1 12 0" />
        <path d="M16 6a3 3 0 0 1 0 6M21 19a6 6 0 0 0-5-5.9" />
      </svg>
    ),
    iconActive: (
      <svg {...iconProps}>
        <circle cx="9" cy="8" r="3" fill="currentColor" />
        <path d="M3 19a6 6 0 0 1 12 0z" fill="currentColor" />
        <path d="M16 6a3 3 0 0 1 0 6M21 19a6 6 0 0 0-5-5.9" />
      </svg>
    ),
  },
  {
    href: "/messages",
    label: "Messages",
    icon: (
      <svg {...iconProps}>
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 21 12z" />
      </svg>
    ),
    iconActive: (
      <svg {...iconProps}>
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 21 12z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    owns: ["/leaderboards", "/memories"],
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    ),
    iconActive: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="3.5" fill="currentColor" />
        <path d="M5 20a7 7 0 0 1 14 0z" fill="currentColor" />
      </svg>
    ),
  },
];

/** Is this tab the one the page belongs to? Its own route, anything under it, or a page it owns. */
export function tabActive(tab: Tab, pathname: string): boolean {
  const under = (href: string) => pathname === href || pathname.startsWith(href + "/");
  return under(tab.href) || (tab.owns ?? []).some(under);
}

/*
  Keeps the Messages badge live: polls, refetches when the route changes, and
  listens for the in-app signal fired right after a thread is marked read.
  Shared with SideNav.
*/
export function useUnreadCount() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      getUnreadTotal()
        .then((n) => active && setUnread(n))
        .catch(() => {});
    refresh();
    const timer = setInterval(refresh, 10000);
    window.addEventListener(UNREAD_REFRESH_EVENT, refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener(UNREAD_REFRESH_EVENT, refresh);
    };
  }, [pathname]);

  return unread;
}

// Phone / tablet navigation. On laptop widths SideNav takes over, so this hides.
export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const unread = useUnreadCount();

  /* TWO TAPS ON PROFILE = VARSITY MODE, for an approved squad member — the
     same place two taps on the name in the Profile's top bar go. Anyone else
     gets a plain tab: nothing here may hint that other accounts have a mode
     this one doesn't. */
  const { isMember } = useMembership();
  const goVarsity = useCallback(() => router.push(VARSITY_HOME), [router]);
  const profileDoubleTap = useDoubleTap(isMember ? goVarsity : null);

  return (
    /* A floating capsule, Instagram-style: the bar is a pill held off the
       screen's edges (and above the iPhone home indicator). The tab you are on
       just turns red, its icon solid, the way Strava does it (owner,
       2026-10-18: "make it just turn red not like we have but the strava
       type"); it used to sit in a smaller pink pill. */
    <nav className="sticky bottom-0 z-10 bg-background px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-1.5 lg:hidden">
      <ul className="mx-auto flex max-w-sm items-stretch gap-1 rounded-full border border-border bg-surface p-1.5 shadow-overlay">
        {tabs.map((tab) => {
          const active = tabActive(tab, pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                onClick={tab.href === "/profile" ? profileDoubleTap : undefined}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center rounded-full py-1.5 text-[10px] font-semibold transition-[color,transform] duration-150 active:scale-90 ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                {/*
                  The tap target is the whole quarter-width cell, but the tour
                  rings THIS — the icon and its label. Anchoring the link
                  itself drew a ring a quarter of the screen wide around a
                  24px icon, and hung it off the left edge on the first tab.
                  SideNav carries the same anchor name on its own item (there
                  the whole row is the visible thing), and only one of the two
                  navs is ever on screen. See lib/tour.ts.
                */}
                <span data-tour={`tab-${tab.href}`} className="flex flex-col items-center gap-1">
                  <span className="relative">
                    {active ? tab.iconActive : tab.icon}
                    {tab.href === "/messages" && unread > 0 && (
                      <span
                        aria-label={`${unread} unread messages`}
                        className="absolute -right-2 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border border-surface bg-primary-live px-1 text-[11px] font-semibold leading-none text-primary-contrast"
                      >
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </span>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

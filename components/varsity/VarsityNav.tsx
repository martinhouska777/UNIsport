"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconUser, IconCalendar, IconPlus } from "@/components/icons";
import { useMembership } from "@/components/varsity/useMembership";

/*
  Varsity Mode’s own bottom navigation (separate from the normal app’s
  BottomNav). Center tab is an elevated crimson "Log" button — the floating +
  from the mockups. Active tab is crimson; the rest are muted. Colors are all
  theme tokens.
*/
type Tab = { href: string; label: string; icon: ReactNode };

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconHome = (
  <svg {...iconProps}>
    <path d="M4 11l8-7 8 7" />
    <path d="M6 10v9h12v-9" />
  </svg>
);

const IconTeam = (
  <svg {...iconProps}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 19a6 6 0 0 1 12 0" />
    <path d="M16 6a3 3 0 0 1 0 6M21 19a6 6 0 0 0-5-5.9" />
  </svg>
);

const IconFeed = (
  <svg {...iconProps}>
    <rect x="3.5" y="4" width="17" height="16" rx="3" />
    <path d="M7 9h6M7 13h10M7 16.5h7" />
  </svg>
);

const leftTabs: Tab[] = [
  { href: "/varsity/home", label: "Home", icon: IconHome },
  { href: "/varsity/calendar", label: "Calendar", icon: <IconCalendar size={22} /> },
];

/*
  Feed sits right beside the [+], because that is the order the two things
  happen in: you log a session, you are asked whether it goes on the feed, and
  this is where it lands. Six tabs is one more than a phone nav wants — the
  owner's call, with "then I want to squash it somehow" already said out loud:
  Feed and Team are both "the squad" and are the natural pair to merge later.
*/
const rightTabs: Tab[] = [
  { href: "/varsity/feed", label: "Feed", icon: IconFeed },
  { href: "/varsity/team", label: "Team", icon: IconTeam },
  { href: "/varsity/profile", label: "Profile", icon: <IconUser size={22} /> },
];

function NavItem({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors ${
        active ? "text-primary" : "text-muted"
      }`}
    >
      {tab.icon}
      {tab.label}
    </Link>
  );
}

export default function VarsityNav() {
  const pathname = usePathname();
  const { membership } = useMembership();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  /*
    The coach has no Feed. Not a hidden one — none: db/varsity_posts.sql hands a
    coach an empty feed whatever they open, and a tab that always says "nothing
    here yet" would read as a broken screen instead of a deliberate rule.
  */
  const tabs =
    membership?.role === "coach" ? rightTabs.filter((t) => t.label !== "Feed") : rightTabs;

  return (
    <nav className="relative z-10 flex-shrink-0 border-t border-border bg-surface">
      <ul className="mx-auto flex max-w-screen-sm items-end px-2 pb-5 pt-2">
        {leftTabs.map((tab) => (
          <li key={tab.href} className="flex flex-1">
            <NavItem tab={tab} active={isActive(tab.href)} />
          </li>
        ))}

        {/* Center: elevated Log (+) button */}
        <li className="flex flex-1 justify-center">
          <Link
            href="/varsity/log"
            aria-label="Log a session"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary-live text-primary-contrast shadow-lg ring-4 ring-background"
          >
            <IconPlus size={26} />
          </Link>
        </li>

        {tabs.map((tab) => (
          <li key={tab.href} className="flex flex-1">
            <NavItem tab={tab} active={isActive(tab.href)} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

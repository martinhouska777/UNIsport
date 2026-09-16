"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import LogSheet from "@/components/varsity/log/LogSheet";
import { IconUser, IconCalendar, IconPlus } from "@/components/icons";

/*
  Varsity Mode's own 5-tab bottom navigation (separate from the normal app's
  BottomNav, but drawn as the same floating capsule). Center tab is the filled
  "Log" (+) button. Active tab is lit as a small pill; the rest are muted.
  Colors are all theme tokens.
*/
type Tab = { href: string; label: string; icon: ReactNode };

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

const leftTabs: Tab[] = [
  { href: "/varsity/home", label: "Home", icon: IconHome },
  { href: "/varsity/calendar", label: "Calendar", icon: <IconCalendar size={24} /> },
];

const rightTabs: Tab[] = [
  { href: "/varsity/team", label: "Team", icon: IconTeam },
  { href: "/varsity/profile", label: "Profile", icon: <IconUser size={24} /> },
];

/* Every tab in order — the laptop sidebar (VarsitySideNav) reads this, so a new
   tab appears in both navigations at once. */
export const varsityTabs: Tab[] = [...leftTabs, ...rightTabs];

function NavItem({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-1 rounded-full py-1.5 text-[10px] font-semibold transition-[color,background-color,transform] duration-150 active:scale-90 ${
        active ? "bg-primary-tint text-primary" : "text-muted"
      }`}
    >
      {tab.icon}
      {tab.label}
    </Link>
  );
}

export default function VarsityNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const [logOpen, setLogOpen] = useState(false);

  return (
    /*
      Phone and tablet only — from `lg` up VarsitySideNav takes over.
      The same floating capsule as the student app's BottomNav: a pill held off
      the screen's edges, the current tab lit as a smaller pill inside it. The
      Log (+) button sits INSIDE the capsule as a filled circle instead of
      floating above the bar.
    */
    <nav className="sticky bottom-0 z-10 flex-shrink-0 bg-background px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-1.5 lg:hidden">
      <ul className="mx-auto flex max-w-sm items-stretch gap-1 rounded-full border border-border bg-surface p-1.5 shadow-overlay">
        {leftTabs.map((tab) => (
          <li key={tab.href} className="flex flex-1 flex-col">
            <NavItem tab={tab} active={isActive(tab.href)} />
          </li>
        ))}

        {/* Center: the Log (+) button, a filled circle inside the capsule */}
        <li className="flex flex-1 items-center justify-center">
          {/* Opens the log as a three-quarter sheet over this page (LogSheet),
              not a page of its own (owner, 2026-09-16). */}
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            aria-label="Log a session"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-live text-primary-contrast shadow-md transition-transform duration-150 active:scale-90"
          >
            <IconPlus size={26} />
          </button>
        </li>

        {rightTabs.map((tab) => (
          <li key={tab.href} className="flex flex-1 flex-col">
            <NavItem tab={tab} active={isActive(tab.href)} />
          </li>
        ))}
      </ul>
      {logOpen && <LogSheet onClose={() => setLogOpen(false)} />}
    </nav>
  );
}

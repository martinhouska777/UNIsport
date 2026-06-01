"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconCalendar, IconAnchor, IconClipboard } from "@/components/icons";

/*
  Coach Console bottom nav: Plan · Lineup · Notes. Separate from the athlete
  5-tab nav. Active tab is crimson.
*/
type Tab = { href: string; label: string; icon: ReactNode };

const tabs: Tab[] = [
  { href: "/varsity/coach/plan", label: "Plan", icon: <IconCalendar size={22} /> },
  { href: "/varsity/coach/lineup", label: "Lineup", icon: <IconAnchor size={22} /> },
  { href: "/varsity/coach/notes", label: "Notes", icon: <IconClipboard size={22} /> },
];

export default function CoachNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="relative z-10 flex-shrink-0 border-t border-border bg-surface">
      <ul className="mx-auto flex max-w-screen-sm items-stretch px-2 pb-5 pt-2">
        {tabs.map((tab) => (
          <li key={tab.href} className="flex-1">
            <Link
              href={tab.href}
              aria-current={isActive(tab.href) ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors ${
                isActive(tab.href) ? "text-primary" : "text-muted"
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

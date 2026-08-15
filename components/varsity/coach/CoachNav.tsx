"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconCalendar, IconAnchor, IconClipboard, IconUser } from "@/components/icons";
import { can, type VarsityRole } from "@/lib/varsity/membership";

/*
  Coach Console bottom nav. Which tabs exist depends on the role, and that rule
  lives in the tab DATA below (`allowed`), not in the markup:
    coach   — Plan · Lineup · Notes · Team
    captain — Team only (a captain handles people, never training)
  Active tab is crimson. The server enforces the same split, so a captain who
  types a plan URL still can't save anything.
*/
type Tab = { href: string; label: string; icon: ReactNode; allowed: (r: VarsityRole) => boolean };

const tabs: Tab[] = [
  { href: "/varsity/coach/plan", label: "Plan", icon: <IconCalendar size={22} />, allowed: can.buildPlan },
  { href: "/varsity/coach/lineup", label: "Lineup", icon: <IconAnchor size={22} />, allowed: can.buildLineup },
  { href: "/varsity/coach/notes", label: "Notes", icon: <IconClipboard size={22} />, allowed: can.writeNotes },
  { href: "/varsity/coach/team", label: "Team", icon: <IconUser size={22} />, allowed: can.invite },
];

export default function CoachNav({ role }: { role: VarsityRole }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const visible = tabs.filter((t) => t.allowed(role));

  return (
    <nav className="relative z-10 flex-shrink-0 border-t border-border bg-surface">
      <ul className="mx-auto flex max-w-screen-sm items-stretch px-2 pb-5 pt-2">
        {visible.map((tab) => (
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

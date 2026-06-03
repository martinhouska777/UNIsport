"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getUnreadTotal, UNREAD_REFRESH_EVENT } from "@/lib/supabase/messages";

type Tab = {
  href: string;
  label: string;
  icon: ReactNode;
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

const tabs: Tab[] = [
  {
    href: "/gyms",
    label: "Gyms",
    icon: (
      <svg {...iconProps}>
        <path d="M6.5 6.5l11 11" />
        <path d="M21 21l-1-1" />
        <path d="M3 3l1 1" />
        <rect x="2" y="9" width="4" height="6" rx="1" />
        <rect x="18" y="9" width="4" height="6" rx="1" />
        <path d="M6 12h12" />
      </svg>
    ),
  },
  {
    href: "/match",
    label: "Match",
    icon: (
      <svg {...iconProps}>
        <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z" />
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
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  // Keep the Messages badge live: poll, refetch when the route changes, and
  // listen for the in-app signal fired right after a thread is marked read.
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

  return (
    <nav className="sticky bottom-0 z-10 border-t border-border bg-surface">
      <ul className="mx-auto flex max-w-screen-sm items-stretch">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                <span className="relative">
                  {tab.icon}
                  {tab.href === "/messages" && unread > 0 && (
                    <span
                      aria-label={`${unread} unread messages`}
                      className="absolute -right-2 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border border-surface bg-danger px-1 text-[9px] font-semibold leading-none text-primary-contrast"
                    >
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

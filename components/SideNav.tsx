"use client";

/*
  LAPTOP NAVIGATION.
  ------------------------------------------------------------------
  The app is phone-first: a 640px column with tabs along the bottom. On a big
  screen that column floats in an empty page and the tab bar sits miles from
  where a mouse is, so from the `lg` breakpoint up the same tabs become a
  left sidebar instead and BottomNav hides itself.

  The tab list, icons and unread badge all come from BottomNav — one source of
  truth, so a new tab appears in both navigations at once. All colors are
  theme tokens (rule 1), which is why this works in every university theme and
  in both light and dark mode without knowing anything about either.
*/
import Link from "next/link";
import { usePathname } from "next/navigation";
import { tabs, useUnreadCount } from "@/components/BottomNav";
import { ThemeModeToggle } from "@/components/ThemeMode";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";

export default function SideNav() {
  const pathname = usePathname();
  const unread = useUnreadCount();
  const { universityKey } = useAppState();
  // The school name is DATA, like the theme — never written into a component.
  const university = getUniversity(universityKey)?.name ?? "";

  return (
    <nav className="hidden w-56 flex-shrink-0 flex-col border-r border-border bg-surface lg:flex">
      {/* Wordmark — the app has no header on desktop, so this anchors the page. */}
      <div className="px-5 py-5 text-[15px] font-semibold tracking-tight text-text">
        UNI<span className="text-primary">sport</span>
      </div>

      <ul className="flex flex-1 flex-col gap-0.5 px-2.5">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                /* Same anchor name BottomNav uses — see lib/tour.ts. */
                data-tour={`tab-${tab.href}`}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-primary-tint text-primary"
                    : "text-muted hover:bg-surface-2 hover:text-text"
                }`}
              >
                <span className="relative flex-shrink-0">
                  {tab.icon}
                  {tab.href === "/messages" && unread > 0 && (
                    <span
                      aria-label={`${unread} unread messages`}
                      className="absolute -right-2 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border border-surface bg-danger px-1 text-[11px] font-semibold leading-none text-primary-contrast"
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

      <div className="flex items-center justify-between gap-2 px-5 py-4">
        <span className="truncate text-[11px] uppercase tracking-[0.1em] text-muted">
          {university}
        </span>
        <ThemeModeToggle />
      </div>
    </nav>
  );
}

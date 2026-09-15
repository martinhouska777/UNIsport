"use client";

/*
  THE LAPTOP SIDE RAIL — one frame for every mode.
  ------------------------------------------------------------------
  The app is phone-first: a column with tabs along the bottom. From the `lg`
  breakpoint up those tabs become a left sidebar instead, and each mode hides
  its phone chrome (top bar, tab bar) with `lg:hidden`.

  The student app, Varsity Mode and the Coach Console each fill this same frame
  — a header, their tabs, an optional action, a footer — so the three can never
  drift apart on a big screen again. Only the CONTENT differs per mode; width,
  surface, spacing and the active-tab look live here once. All colours are
  theme tokens (rule 1), so it works in every school theme, light and dark.

  `tour` carries the same `data-tour` anchor the phone nav uses: only one of the
  two is ever on screen, and the tour lights up whichever has a size
  (components/tour/TourOverlay.tsx).
*/
import Link from "next/link";
import type { ReactNode } from "react";

export type RailItem = {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  tour?: string;
  /** A red count on the icon (unread messages). Nothing shows at 0. */
  badge?: number;
};

export default function SideRail({
  header,
  action,
  items,
  footer,
}: {
  header: ReactNode;
  /** A primary button above the tabs — Varsity's Log session. */
  action?: ReactNode;
  items: RailItem[];
  footer: ReactNode;
}) {
  return (
    <nav className="hidden w-56 flex-shrink-0 flex-col border-r border-border bg-surface lg:flex">
      {/* Fixed height so the tabs start at the same line in every mode, whatever
          the header holds (a wordmark, a crest, a squad initial). */}
      <div className="flex h-16 flex-shrink-0 items-center px-5">{header}</div>

      {action && <div className="px-2.5 pb-3">{action}</div>}

      <ul className="flex flex-1 flex-col gap-0.5 px-2.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              data-tour={item.tour}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                item.active
                  ? "bg-primary-tint text-primary"
                  : "text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              <span className="relative flex-shrink-0">
                {item.icon}
                {!!item.badge && item.badge > 0 && (
                  <span
                    aria-label={`${item.badge} unread messages`}
                    className="absolute -right-2 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border border-surface bg-danger px-1 text-[11px] font-semibold leading-none text-primary-contrast"
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex min-h-16 items-center justify-between gap-2 px-5 py-4">{footer}</div>
    </nav>
  );
}

/* The round 32px icon link the rail footers share with the phone top bars. */
export const railIconCls =
  "tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted hover:text-text";

/* The small labelled pill ("Exit", "Athlete view"). */
export const railPillCls =
  "flex h-8 flex-shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-3 text-[11px] font-medium text-muted hover:text-text";

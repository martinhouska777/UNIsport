"use client";

/*
  COACH CONSOLE on a laptop. From `lg` up CoachTopBar and CoachNav hide and the
  console gets the shared SideRail — the same sidebar as the student app and
  Varsity Mode:
    header  the squad initial + "Coach Console" and the squad name
    tabs    the role's tabs (from CoachNav — one list, one rule)
    footer  squad settings, Athlete view (light/dark lives in Settings)

  The tab and settings links carry the same `data-tour` anchors as the phone
  chrome, so the console tour works at either size.
*/
import Link from "next/link";
import { usePathname } from "next/navigation";
import SideRail, { railIconCls, railPillCls } from "@/components/SideRail";
import { coachTabs, coachTabActive } from "@/components/varsity/coach/CoachNav";
import { roleLabel, type VarsityRole } from "@/lib/varsity/membership";
import { IconArrowLeft, IconSettings } from "@/components/icons";

export default function CoachSideNav({ role, teamName }: { role: VarsityRole; teamName: string }) {
  const pathname = usePathname();

  return (
    <SideRail
      header={
        <div className="flex min-w-0 items-center gap-2.5">
          {/* The squad's initial, from its name — never a typed letter (rule 2). */}
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-contrast">
            {teamName.trim().charAt(0).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-sm font-semibold text-text">{roleLabel[role]} Console</span>
            <span className="mt-0.5 truncate pb-px text-[11px] leading-tight tracking-[0.1em] text-muted">{teamName}</span>
          </div>
        </div>
      }
      items={coachTabs
        .filter((t) => t.allowed(role))
        .map((tab) => ({
          href: tab.href,
          label: tab.label,
          icon: tab.icon,
          active: coachTabActive(tab, pathname),
          tour: `coach-tab-${tab.href}`,
        }))}
      footer={
        <>
          <div className="flex items-center gap-2">
            <Link
              href="/varsity/coach/settings"
              aria-label="Squad settings"
              data-tour="coach-settings"
              className={railIconCls}
            >
              <IconSettings size={16} />
            </Link>
          </div>
          <Link href="/varsity/home" aria-label="Back to athlete view" className={railPillCls}>
            <IconArrowLeft size={14} />
            Athlete view
          </Link>
        </>
      }
    />
  );
}

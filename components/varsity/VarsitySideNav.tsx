"use client";

/*
  VARSITY MODE on a laptop. The phone's top bar and 5-tab bottom nav hide from
  `lg` up and everything they held moves into the shared SideRail — the same
  sidebar the student app has, so switching modes on a big screen no longer
  swaps one layout for a completely different one:
    header  the crest + "Varsity Mode", which opens the mode switcher
    action  Log session (the phone's round + button)
    tabs    Home · Calendar · Team · Profile (from VarsityNav — one list)
    footer  edit profile (on Profile only), settings, light/dark, Exit
*/
import Link from "next/link";
import { usePathname } from "next/navigation";
import SideRail, { railIconCls, railPillCls } from "@/components/SideRail";
import VarsityCrest from "@/components/varsity/VarsityCrest";
import ModeSwitcherSheet from "@/components/ModeSwitcherSheet";
import { ThemeModeToggle } from "@/components/ThemeMode";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";
import { varsityTabs } from "@/components/varsity/VarsityNav";
import { useVarsityModeTap } from "@/components/varsity/VarsityTopBar";
import {
  IconArrowLeft,
  IconChevronDown,
  IconPencil,
  IconPlus,
  IconSettings,
} from "@/components/icons";

export default function VarsitySideNav() {
  const pathname = usePathname();
  const { studentReady, universityKey } = useAppState();
  const { handleModeTap, switchingMode, closeSwitcher } = useVarsityModeTap();
  // The school's everyday name is DATA (lib/themes.ts), never typed here.
  const school = getUniversity(universityKey)?.shortName ?? "";
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <SideRail
        header={
          <button
            type="button"
            onClick={handleModeTap}
            aria-label="Switch mode"
            className="flex min-w-0 items-center gap-2 text-left"
          >
            <VarsityCrest size={36} />
            <div className="flex min-w-0 flex-col leading-none">
              <span className="truncate text-[8px] font-semibold tracking-[0.18em] text-accent">
                VARSITY MODE
              </span>
              <span className="mt-0.5 truncate text-[11px] tracking-[0.08em] text-muted">
                {school} Rowing
              </span>
            </div>
            <IconChevronDown size={13} className="flex-shrink-0 text-muted" />
          </button>
        }
        action={
          <Link
            href="/varsity/log"
            className="flex items-center justify-center gap-2 rounded-xl bg-primary-live py-2.5 text-[13px] font-semibold text-primary-contrast transition-[filter] hover:brightness-110"
          >
            <IconPlus size={16} />
            Log session
          </Link>
        }
        items={varsityTabs.map((tab) => ({
          href: tab.href,
          label: tab.label,
          icon: tab.icon,
          active: isActive(tab.href),
        }))}
        footer={
          <>
            <div className="flex items-center gap-2">
              {/* Same as the phone bar: the pencil only while on your profile. */}
              {pathname === "/varsity/profile" && (
                <Link href="/varsity/profile?edit=1" aria-label="Edit profile" className={railIconCls}>
                  <IconPencil size={15} />
                </Link>
              )}
              <Link href="/settings" aria-label="Settings" className={railIconCls}>
                <IconSettings size={16} />
              </Link>
              <ThemeModeToggle />
            </div>
            {studentReady && (
              <Link href="/profile" aria-label="Exit Varsity Mode" className={railPillCls}>
                <IconArrowLeft size={14} />
                Exit
              </Link>
            )}
          </>
        }
      />
      {switchingMode && <ModeSwitcherSheet current="varsity" onClose={closeSwitcher} />}
    </>
  );
}

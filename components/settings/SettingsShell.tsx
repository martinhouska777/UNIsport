"use client";

/*
  THE PIECES EVERY SETTINGS PAGE IS BUILT FROM.

  THE LOOK (owner, 2026-09-30: "like WhatsApp or Instagram has — practical,
  simple and nice looking"): who you are in a card at the top, then the rows in
  GROUPS — one white card per group, rows inside it split by a hairline that
  starts after the icon, a plain line icon on the left, the current answer in
  grey on the right. It used to be every row its own floating card with a gap,
  which read as a stack of buttons rather than a list of settings.

  Settings is a front page of short groups, and the big ones — Training,
  Notifications, Design, the rowing profile — open a page of their own; small
  ones open IN PLACE (DropdownRow). Every page shares this header and body.

  The school theme and the signed-in gate sit one level up, in
  app/settings/layout.tsx, so moving between these pages never re-paints.
*/
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import type { ProfileSaveState } from "@/components/profile/useProfileData";
import { useMembership } from "@/components/varsity/useMembership";
import Segmented from "@/components/ui/Segmented";
import InitialsAvatar from "@/components/ui/InitialsAvatar";
import { Toggle } from "@/components/onboarding/controls";
import { inVarsityMode } from "@/lib/varsity/mode";
import { IconArrowLeft, IconChevronDown, IconChevronRight } from "@/components/icons";

/*
  WHICH SETTINGS — one per mode (owner, 2026-09-30). Varsity Mode's gear opens
  the squad's settings, the student app's gear the student's. The mode is the
  one this tab is in (lib/varsity/mode.ts); somebody on a squad with no student
  side is always in Varsity. Null while the membership is still unknown, so a
  page never shows one set and then swaps to the other.
*/
export function useSettingsMode(): "student" | "varsity" | null {
  const { studentReady } = useAppState();
  const { membership, loading } = useMembership();
  const [varsityTab] = useState(inVarsityMode);
  if (loading) return null;
  const inSquad = membership?.status === "approved";
  return inSquad && (varsityTab || !studentReady) ? "varsity" : "student";
}

/*
  The top bar: back arrow, title, and the save line on the right. The arrow
  goes BACK rather than to a fixed page, so the phone's history stays one
  straight line. A page opened on its own (a pasted link, a reload with no
  history) has nothing to go back to, so it falls back to `fallback`.
*/
export function SettingsHeader({
  title,
  saveState = "idle",
  fallback = "/settings",
}: {
  title: string;
  saveState?: ProfileSaveState;
  fallback?: string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-3.5 py-3">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
        aria-label="Back"
        className="tap44 press-icon text-text"
      >
        <IconArrowLeft size={20} />
      </button>
      <h1 className="flex-1 text-base font-medium text-text">{title}</h1>
      {saveState !== "idle" && (
        <span className={`text-[11px] ${saveState === "error" ? "text-danger" : "text-muted"}`}>
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Couldn’t save"}
        </span>
      )}
    </div>
  );
}

/* The scrolling column under the header: the groups, evenly spaced. */
export function SettingsBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-screen-sm flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 px-3.5 pb-10 pt-4">{children}</div>
    </div>
  );
}

/* WHO YOU ARE, at the top — the WhatsApp card: photo, name, one line under
   it. Tapping it opens the profile it belongs to. */
export function ProfileCard({
  name,
  photo,
  subline,
  href,
}: {
  name: string;
  photo: string | null;
  subline: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 shadow-card active:bg-surface-2"
    >
      <span className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a user upload, sized here
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <InitialsAvatar name={name} size={56} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-semibold text-text">{name || "Your profile"}</span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">{subline}</span>
      </span>
      <span className="text-muted">
        <IconChevronRight size={18} />
      </span>
    </Link>
  );
}

/*
  A GROUP: an optional label, then one card holding the rows. The hairline
  between two rows sits on each row's `.row-line` (the part right of the icon),
  so it starts where the text starts — and the group draws it on every row but
  the first.
*/
export function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section>
      {title && (
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          {title}
        </h2>
      )}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card [&>*+*_.row-line]:border-t">
        {children}
      </div>
    </section>
  );
}

/* The inside of every row: the icon in its own column, then everything else
   on the line that carries the divider. Exported for rows that are not one
   button — a person with their own buttons on the right, say. */
export function RowFrame({
  icon,
  wide,
  children,
}: {
  icon?: React.ReactNode;
  /** a 32px photo instead of a line icon: a wider column, so it doesn't touch the name */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      {icon && (
        <span className={`flex flex-shrink-0 items-center pl-4 text-text ${wide ? "w-[60px]" : "w-12"}`}>
          {icon}
        </span>
      )}
      <span
        className={`row-line flex min-h-[52px] min-w-0 flex-1 items-center gap-3 border-border py-2.5 pr-4 ${
          icon ? "" : "pl-4"
        }`}
      >
        {children}
      </span>
    </>
  );
}

const rowClass = "flex w-full items-stretch text-left transition-colors active:bg-surface-2";

/* One tappable row: icon, label, the current answer, chevron. `alert` is for a
   count somebody has to act on (people waiting to join the squad). */
export function Row({
  icon,
  label,
  detail,
  alert,
  onClick,
  href,
}: {
  icon?: React.ReactNode;
  label: string;
  detail?: string;
  alert?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <RowFrame icon={icon}>
      <span className="flex-1 text-[15px] text-text">{label}</span>
      {detail && (
        <span className={`min-w-0 truncate text-[13px] ${alert ? "font-semibold text-warn" : "text-muted"}`}>
          {detail}
        </span>
      )}
      <span className="flex-shrink-0 text-muted">
        <IconChevronRight size={16} />
      </span>
    </RowFrame>
  );
  return href ? (
    <Link href={href} className={rowClass}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={rowClass}>
      {inner}
    </button>
  );
}

/* A row that drops open where it is, its lines under the header's. */
export function DropdownRow({
  icon,
  label,
  detail,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  detail?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={rowClass}>
        <RowFrame icon={icon}>
          <span className="flex-1 text-[15px] text-text">{label}</span>
          {detail && <span className="min-w-0 truncate text-[13px] text-muted">{detail}</span>}
          <span
            className={`flex-shrink-0 text-muted transition-transform duration-150 motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          >
            <IconChevronDown size={16} />
          </span>
        </RowFrame>
      </button>
      {open && <div className={`[&_.row-line]:border-t ${icon ? "pl-12" : ""}`}>{children}</div>}
    </div>
  );
}

/* A row with a switch on the right. */
export function ToggleRow({
  icon,
  label,
  on,
  onChange,
}: {
  icon?: React.ReactNode;
  label: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex w-full items-stretch">
      <RowFrame icon={icon}>
        <span className="min-w-0 flex-1 text-[15px] text-text">{label}</span>
        <Toggle on={on} onChange={onChange} ariaLabel={label} />
      </RowFrame>
    </div>
  );
}

/* A row with a few choices as segmented pills beside the label. */
export function ChoiceRow<K extends string>({
  icon,
  label,
  options,
  value,
  onPick,
}: {
  icon?: React.ReactNode;
  label: string;
  options: { key: K; label: string; ariaLabel?: string }[];
  value: K;
  onPick: (key: K) => void;
}) {
  return (
    <div className="flex w-full items-stretch">
      <RowFrame icon={icon}>
        <span className="min-w-0 flex-1 text-[15px] text-text">{label}</span>
        <Segmented ariaLabel={label} options={options} value={value} onChange={onPick} />
      </RowFrame>
    </div>
  );
}

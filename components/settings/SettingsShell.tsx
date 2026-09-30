"use client";

/*
  THE PIECES EVERY SETTINGS PAGE IS BUILT FROM.

  Settings is a front page of short rows, and the bigger groups — Training,
  Notifications, Design, Units — each open a page of their own (owner,
  2026-09-30: "a thing you click and it gets you into a new thing, so it
  doesn't take that much space"). They all share this header, this scrolling
  body and these rows, so a page opened from the list looks like the list.

  The school theme and the signed-in gate sit one level up, in
  app/settings/layout.tsx, so moving between these pages never re-paints.
*/
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProfileSaveState } from "@/components/profile/useProfileData";
import Segmented from "@/components/ui/Segmented";
import { Toggle } from "@/components/onboarding/controls";
import { IconArrowLeft, IconChevronRight } from "@/components/icons";

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

/* The scrolling column under the header. */
export function SettingsBody({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-screen-sm flex-1 overflow-y-auto">{children}</div>;
}

/* A group of rows, with the section label used across the app. The label is
   optional: the rows that open pages read as one list without one. */
export function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border px-3.5 py-4">
      {title && (
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          {title}
        </h2>
      )}
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

/* One tappable row: icon, label, optional detail, chevron. */
export function Row({
  icon,
  label,
  detail,
  onClick,
  href,
}: {
  icon?: React.ReactNode;
  label: string;
  detail?: string;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      {icon && <span className="text-muted">{icon}</span>}
      <span className="flex-1 text-sm text-text">{label}</span>
      {detail && <span className="truncate text-xs text-muted">{detail}</span>}
      <span className="text-muted">
        <IconChevronRight size={16} />
      </span>
    </>
  );
  const className =
    "flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left";
  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

/* A row with a switch on the right. */
export function ToggleRow({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
      <div className="min-w-0 text-sm text-text">{label}</div>
      <Toggle on={on} onChange={onChange} ariaLabel={label} />
    </div>
  );
}

/* A row with a few choices as segmented pills beside the label. */
export function ChoiceRow<K extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: { key: K; label: string; ariaLabel?: string }[];
  value: K;
  onPick: (key: K) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5">
      <span className="flex-1 text-sm text-text">{label}</span>
      <Segmented ariaLabel={label} options={options} value={value} onChange={onPick} />
    </div>
  );
}

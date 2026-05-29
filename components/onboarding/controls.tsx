"use client";

import type { ReactNode } from "react";

/*
  Shared onboarding controls. All colors come from theme variables:
  - selected pill   = crimson tint (primary)
  - gold pill       = gold tint (accent)
  - surfaces/border = surface-2 / border tokens
*/

export function Pill({
  label,
  selected,
  onClick,
  variant = "crimson",
}: {
  label: ReactNode;
  selected: boolean;
  onClick: () => void;
  variant?: "crimson" | "gold";
}) {
  const selectedClass =
    variant === "gold"
      ? "border-accent bg-accent/15 text-accent"
      : "border-primary bg-primary/15 text-primary";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-3.5 py-2 text-[13px] transition-colors ${
        selected ? selectedClass : "border-border bg-surface-2 text-text"
      }`}
    >
      {label}
    </button>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-xs font-medium uppercase tracking-[0.04em] text-muted">
      {children}
    </div>
  );
}

export function Toggle({
  on,
  onChange,
  ariaLabel,
}: {
  on: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`relative h-[22px] w-[38px] flex-shrink-0 rounded-full transition-colors ${
        on ? "bg-primary" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-[3px] h-4 w-4 rounded-full bg-primary-contrast transition-all ${
          on ? "left-[19px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

export function Section({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.06em] text-accent">{title}</div>
      {help && <div className="mb-1 mt-0.5 text-[11px] text-muted">{help}</div>}
      <div>{children}</div>
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      // 16px text avoids mobile auto-zoom on focus.
      className="w-full rounded-[10px] border border-border bg-surface-2 px-3.5 py-3 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none"
    />
  );
}

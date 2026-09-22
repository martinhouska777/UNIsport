"use client";

import type { ReactNode } from "react";

/*
  Shared onboarding controls. All colors come from theme variables, and they
  are the SAME ones the app behind the flow uses (owner, 2026-09-22: the boxes
  should be white): a white `surface` card on the blue-grey `background`,
  lifted by `shadow-card`, hairline `border`.
  - selected pill   = crimson tint (primary)
  - gold pill       = gold tint (accent)
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
      ? "border-accent bg-accent-tint text-accent"
      : "border-primary bg-primary-tint text-primary";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      /* tap44: a pill is ~34px tall, under the 44px both Apple and Google ask
         for. The class grows only the invisible hit area (app/globals.css), so
         chips look exactly as before but survive a thumb at a squat rack. */
      className={`tap44 rounded-full border px-3.5 py-2 text-[13px] transition-colors ${
        selected ? selectedClass : "border-border bg-surface text-text"
      }`}
    >
      {label}
    </button>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
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
        on ? "bg-primary-live" : "bg-border"
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

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  /* A unit printed inside the right of the box — "km", "/km". It is the unit
     itself, not a hint about what to type, so the field stays empty until the
     person fills it in. */
  suffix?: string;
}) {
  const input = (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      // 16px text avoids mobile auto-zoom on focus.
      className={`w-full rounded-[10px] border border-border bg-surface py-3 pl-3.5 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none ${
        suffix ? "pr-12" : "pr-3.5"
      }`}
    />
  );
  if (!suffix) return input;
  return (
    <div className="relative">
      {input}
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted">
        {suffix}
      </span>
    </div>
  );
}

/*
  A NATIVE <select>, on purpose.

  The times used to be a row of pills you scrolled sideways through — thirty of
  them, so finding 7:30 meant dragging past everything before it. A native
  select is a wheel on iOS and a proper dropdown everywhere else: the control
  people already know for "one of a long list of numbers", and the one their
  own phone renders best.

  16px text so a phone doesn't zoom the page when it opens. Colors are theme
  tokens; the arrow is drawn here because a native one can't be recoloured.
*/
export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={`w-full appearance-none rounded-[10px] border border-border bg-surface px-3.5 py-3 pr-9 text-base focus:border-primary focus:outline-none ${
          value ? "text-text" : "text-muted"
        }`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </div>
  );
}

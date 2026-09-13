"use client";

import { IconEye, IconEyeOff } from "@/components/icons";

/*
  The "shown to others / hidden" control used in profile section headers — an
  open eye when other people can see the section, a struck-through eye when
  they can't. It used to spell it out ("Shown to others" / "Hidden"); the owner
  wanted just the eye.
  It does NOT hide the section from the owner — it only flips whether other
  people see this section on the public profile (enforced server-side too).
  Colors come from theme variables.
*/
export default function VisibilityToggle({
  visible,
  onChange,
}: {
  visible: boolean;
  onChange: (visible: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!visible)}
      aria-pressed={visible}
      aria-label={visible ? "Shown to others — tap to hide" : "Hidden from others — tap to show"}
      className={`tap44 flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
        visible
          ? "border-success-line bg-success-tint text-success"
          : "border-border bg-surface-2 text-muted"
      }`}
    >
      {visible ? <IconEye size={14} /> : <IconEyeOff size={14} />}
    </button>
  );
}

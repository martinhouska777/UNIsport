"use client";

import { IconEye } from "@/components/icons";

/*
  Small "shown to others / hidden" control used in profile section headers.
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
      className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium transition-colors ${
        visible
          ? "border-success/40 bg-success/10 text-success"
          : "border-border bg-surface-2 text-muted"
      }`}
    >
      <IconEye size={12} />
      {visible ? "Shown to others" : "Hidden"}
    </button>
  );
}

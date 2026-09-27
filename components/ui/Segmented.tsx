"use client";

/*
  THE SWITCH BETWEEN TWO (OR A FEW) VIEWS — one look for "which one is on".
  ---------------------------------------------------------------------------
  Direct / Community, People / Sessions, Week / Month, kg / lb, Split / Time.
  It used to be drawn five ways: a black pill here, solid crimson there, a pale
  crimson chip with a border, the old grey track, square corners in Varsity
  (launch audit, 2026-09-27). Now there is one: a white capsule with a
  hairline, and the chosen segment filled in the text colour — the Match and
  Messages switch the owner settled on (2026-09-15).

  The school colour is kept for the one main button on a screen, and its pale
  tint for picking several answers (interests, activities) — so "today",
  "chosen" and "press this" stop looking alike.

    size "md" — a full-width switch at the top of a screen (40px tall)
    size "sm" — a compact one inside a row or a card header (32px, 44px to tap)

  Colours are theme tokens only.
*/
export type SegmentedOption<K extends string> = { key: K; label: React.ReactNode; ariaLabel?: string };

export default function Segmented<K extends string>({
  options,
  value,
  onChange,
  size = "sm",
  full = false,
  ariaLabel,
  className = "",
}: {
  options: SegmentedOption<K>[];
  value: K;
  onChange: (key: K) => void;
  size?: "sm" | "md";
  /** Stretch across the row, each segment an equal share. */
  full?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const seg =
    size === "md"
      ? "min-h-10 px-4 py-2 text-[13px]"
      : "tap44 min-h-8 px-3 py-1 text-[12px]";
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`${full ? "flex" : "inline-flex"} flex-shrink-0 overflow-hidden rounded-full border border-border bg-surface ${className}`}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.key)}
            className={`${full ? "flex-1" : ""} rounded-full text-center font-semibold transition-colors ${seg} ${
              on ? "bg-text text-background" : "text-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

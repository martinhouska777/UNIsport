"use client";

/*
  ONE SHAPE FOR "PICK ONE OF THESE" — a button that says what is chosen, and a
  list that hangs off it. Three of them drive the statistics: the MEASURE, the
  WINDOW and the SHAPE the graph is drawn in — on the profile card and again on
  the full-screen graph. Only one may be open at a time, so the caller owns that.

  A panel rather than a row of chips: chips pushed the graph down the screen
  every time somebody looked at their options.
*/
import { IconChevronDown, IconCheck } from "@/components/icons";

export default function Dropdown({
  label,
  title,
  options,
  value,
  open,
  onOpen,
  onPick,
  align = "left",
}: {
  label: string;
  /** The measure reads as the card's title; the window as a quiet pill. */
  title?: boolean;
  options: { key: string; label: string }[];
  value: string;
  open: boolean;
  onOpen: (v: boolean) => void;
  onPick: (key: string) => void;
  align?: "left" | "right";
}) {
  return (
    /* The title takes what is left after the window pill, which never shrinks —
       "Metres rowed" must not become "Metres row…". */
    <div className={title ? "relative min-w-0 flex-1" : "relative flex-shrink-0"}>
      <button
        type="button"
        onClick={() => onOpen(!open)}
        aria-expanded={open}
        className={
          title
            ? "tap44 -ml-1 flex w-full items-center gap-1 rounded-lg px-1 py-0.5 text-left active:bg-surface-2"
            : `tap44 flex flex-shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                open
                  ? "border-primary bg-primary-tint text-primary"
                  : "border-border bg-surface-2 text-muted"
              }`
        }
      >
        <span className={title ? "truncate text-[15px] font-semibold text-text" : ""}>{label}</span>
        <span className="flex-shrink-0">
          <IconChevronDown size={title ? 15 : 12} />
        </span>
      </button>

      {open && (
        <>
          {/* Anywhere else puts it away. */}
          <button
            type="button"
            aria-label="Close this menu"
            onClick={() => onOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            className={`absolute ${align === "right" ? "right-0" : "left-0"} top-[calc(100%+7px)] z-20 w-44 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-lg`}
          >
            {options.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => {
                  onPick(o.key);
                  onOpen(false);
                }}
                aria-pressed={o.key === value}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] active:bg-surface ${
                  o.key === value ? "font-semibold text-text" : "text-muted"
                }`}
              >
                <span className="flex w-3.5 flex-shrink-0 justify-center">
                  {o.key === value && <IconCheck size={12} />}
                </span>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

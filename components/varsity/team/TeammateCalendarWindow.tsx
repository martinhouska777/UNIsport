"use client";

/*
  A TEAMMATE'S CALENDAR, IN A WINDOW OF ITS OWN.
  ---------------------------------------------------------------------------
  The teammate card on the Team tab used to draw a small month inside itself.
  The owner (2026-09-14) wanted a "Calendar" button there instead, opening the
  month full-screen and looking like your own Calendar tab — so this window
  simply hosts that screen (CalendarScreen with `teammate`), read-only.

  Portalled to <body> and re-wrapped in <ThemeProvider>, like the sheets and
  the full-screen statistics, so it covers the tab bar and keeps the Varsity
  theme. It sits on the same layer as the sheets; being mounted after the
  teammate card puts it on top of it, and a day sheet opened inside it lands
  on top of the window the same way. All colours are theme tokens (rule 1).
*/
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import CalendarScreen from "@/components/varsity/calendar/CalendarScreen";
import { IconX } from "@/components/icons";

export default function TeammateCalendarWindow({
  athleteId,
  name,
  onClose,
}: {
  athleteId: string;
  name: string;
  onClose: () => void;
}) {
  const vTheme = useVarsityTheme();

  return createPortal(
    <ThemeProvider tokens={vTheme.dark} light={vTheme.light}>
      <div className="fixed inset-0 z-[60] flex flex-col bg-background [animation:backdrop-in_0.18s_ease-out]">
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-border px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calendar"
            className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconX size={15} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold leading-tight text-text">{name}</div>
            <div className="mt-0.5 truncate text-[11px] text-muted">Calendar</div>
          </div>
        </div>
        <div className="min-h-0 flex-1 pb-[env(safe-area-inset-bottom)]">
          <CalendarScreen teammate={{ id: athleteId }} />
        </div>
      </div>
    </ThemeProvider>,
    document.body,
  );
}

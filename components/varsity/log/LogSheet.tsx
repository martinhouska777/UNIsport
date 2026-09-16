"use client";

/*
  THE LOG, AS A SHEET — what the red (+) in the bottom bar opens (owner,
  2026-09-16). The Log tab as a whole page was mostly empty screen under two
  session cards, so it now rises over whatever page you were on and stops at
  three quarters of the height. Same screen inside (LogScreen), same
  full-screen editor when you press Log; close with the X, the backdrop or
  Escape. /varsity/log still exists as a page for links that go there.

  Portalled to <body>, so it re-wraps itself in the Varsity theme (the same
  pattern as components/varsity/Sheet.tsx). All colours are theme tokens.
*/
import { useEffect } from "react";
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import LogScreen from "@/components/varsity/log/LogScreen";
import { IconX } from "@/components/icons";

export default function LogSheet({ onClose }: { onClose: () => void }) {
  const vTheme = useVarsityTheme();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <ThemeProvider tokens={vTheme.dark} light={vTheme.light}>
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
        />
        {/* No fill-mode on the slide, on purpose: once it ends the sheet has no
            transform, so the editor's `fixed inset-0` inside it still covers
            the whole screen. */}
        <div className="relative flex h-[75dvh] flex-col overflow-hidden rounded-t-3xl border-t border-border bg-background [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
          <div className="relative flex flex-shrink-0 justify-center pb-1 pt-2.5">
            <div className="h-1 w-9 rounded-full bg-border" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tap44 press-icon absolute right-3 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
            >
              <IconX size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <LogScreen />
          </div>
        </div>
      </div>
    </ThemeProvider>,
    document.body,
  );
}

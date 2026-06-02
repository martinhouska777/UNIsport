"use client";

/*
  Shared Varsity bottom sheet: slides up from the bottom with a title + close,
  closes on the X, the backdrop, or Escape. Portalled to <body>, so it re-wraps
  itself in <ThemeProvider> to keep the Varsity theme (same pattern as the log
  editor). Content is whatever the caller passes. All colors are theme tokens.
*/
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { varsityTheme, varsityLightTheme } from "@/lib/varsity/theme";
import { IconX } from "@/components/icons";

export default function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <ThemeProvider tokens={varsityTheme} light={varsityLightTheme}>
      <div className="fixed inset-0 z-[60] flex flex-col justify-end">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
        />
        <div className="relative max-h-[85%] overflow-y-auto rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
          <div className="flex justify-center pb-1.5 pt-2.5">
            <div className="h-1 w-9 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between border-b border-border px-4 pb-3">
            <span className="text-[15px] font-semibold text-text">{title}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
            >
              <IconX size={14} />
            </button>
          </div>
          <div className="px-4 pb-8 pt-4">{children}</div>
        </div>
      </div>
    </ThemeProvider>,
    document.body,
  );
}

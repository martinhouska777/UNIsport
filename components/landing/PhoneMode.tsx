"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

/*
  LIGHT / DARK PHONE SCREENS.

  Every phone on the landing — the two scroll stories, both closers, the
  coach's five — shows a capture of the real app. The app has two looks (it
  keys them off localStorage.uniThemeMode), so the landing shows either: the
  screens inside every phone flip together, and the drawn phone chrome (the
  status bar, the gesture bar) flips with them via the l-phone-* tokens,
  which [data-phone-mode="dark"] redefines in globals.css.

  Files: a light capture at /landing/<x>.webp has its dark twin at
  /landing/dark/<x>.webp — same name, one folder down (closers included:
  /landing/dark/closers/<x>.webp). shotSrc() is the only place that rule
  lives. Until the dark folder is re-shot from the app (capture-light.mjs
  --mode dark, which needs the owner's login), it holds provisional frames
  derived from the light ones — see scripts/landing/dark-placeholders.mjs.

  Default: the visitor's own preference (prefers-color-scheme), then whatever
  they last chose here (localStorage). Server-rendered light, resolved on
  the client — invisible, because the first phone is a screen below the fold.
  A tiny external store read through useSyncExternalStore: the server
  snapshot is "light", the client snapshot is the resolved mode, and React
  reconciles the two on hydration without a setState-in-effect.
*/

export type PhoneMode = "light" | "dark";
const KEY = "uniLandingPhoneMode";

let resolved: PhoneMode | null = null;
const listeners = new Set<() => void>();
function readMode(): PhoneMode {
  if (resolved) return resolved;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(KEY);
  } catch {}
  resolved =
    stored === "dark" || stored === "light"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  return resolved;
}
function writeMode(m: PhoneMode) {
  resolved = m;
  try {
    window.localStorage.setItem(KEY, m);
  } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const Ctx = createContext<{ mode: PhoneMode; setMode: (m: PhoneMode) => void }>({
  mode: "light",
  setMode: () => {},
});

export function usePhoneMode() {
  return useContext(Ctx);
}

/** The dark twin of a light capture path. */
export function shotSrc(path: string, mode: PhoneMode) {
  return mode === "dark" ? path.replace(/^\/landing\//, "/landing/dark/") : path;
}

export function PhoneModeProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(subscribe, readMode, () => "light" as PhoneMode);
  return (
    <Ctx.Provider value={{ mode, setMode: writeMode }}>
      <div data-phone-mode={mode} className="contents">
        {children}
      </div>
    </Ctx.Provider>
  );
}

function Sun() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function Moon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

/* The switch: a small pill pinned bottom-right, over every section, so it is
   at hand while a story is scrolling. Two buttons, the current one filled. */
export function PhoneModeToggle() {
  const { mode, setMode } = usePhoneMode();
  const btn = (m: PhoneMode, label: string, icon: ReactNode) => {
    const on = mode === m;
    return (
      <button
        type="button"
        aria-pressed={on}
        aria-label={`${label} phone screens`}
        title={`${label} phone screens`}
        onClick={() => setMode(m)}
        className={`flex h-8 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] tracking-wider uppercase transition-colors ${
          on ? "bg-l-text text-l-bg" : "text-l-text-2 hover:text-l-text"
        }`}
      >
        {icon}
        <span className="max-sm:sr-only">{label}</span>
      </button>
    );
  };
  return (
    <div
      role="group"
      aria-label="Phone screens"
      className="fixed right-4 bottom-4 z-[60] flex items-center gap-0.5 rounded-full border border-l-line bg-l-surface/90 p-1 shadow-2xl backdrop-blur print:hidden sm:right-6 sm:bottom-6"
    >
      {btn("light", "Light", <Sun />)}
      {btn("dark", "Dark", <Moon />)}
    </div>
  );
}

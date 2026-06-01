"use client";

/*
  LIGHT / DARK MODE (app-wide).
  ------------------------------------------------------------------
  A single global preference — "dark" (the default look) or "light" — kept in
  React context + localStorage. It does NOT hold any colors: each ThemeProvider
  is given a dark token set and an optional light variant, and picks one based
  on this mode. So flipping the mode re-skins every themed zone at once.

  useThemeMode() is tolerant: outside a provider it just reports "dark" and the
  toggles no-op, so ThemeProvider can read it safely anywhere.
*/
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { IconSun, IconMoon } from "@/components/icons";

export type ThemeMode = "light" | "dark";

type Ctx = { mode: ThemeMode; toggle: () => void; setMode: (m: ThemeMode) => void };

const ThemeModeContext = createContext<Ctx>({
  mode: "dark",
  toggle: () => {},
  setMode: () => {},
});

const STORAGE_KEY = "uniThemeMode";

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  // Load the saved preference once on the client (default stays "dark").
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // Intentional one-time sync from localStorage on mount (avoids a hydration
      // mismatch vs. reading it during render).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "light" || saved === "dark") setModeState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(
    () => setMode(mode === "dark" ? "light" : "dark"),
    [mode, setMode],
  );

  return (
    <ThemeModeContext.Provider value={{ mode, toggle, setMode }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): Ctx {
  return useContext(ThemeModeContext);
}

/* A round icon button that flips the mode. Shows the mode you'd switch TO. */
export function ThemeModeToggle({ className = "" }: { className?: string }) {
  const { mode, toggle } = useThemeMode();
  const toLight = mode === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={toLight ? "Switch to light mode" : "Switch to dark mode"}
      title={toLight ? "Light mode" : "Dark mode"}
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted ${className}`}
    >
      {toLight ? <IconSun size={16} /> : <IconMoon size={16} />}
    </button>
  );
}

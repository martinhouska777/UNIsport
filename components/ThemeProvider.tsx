"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import type { ThemeTokens } from "@/lib/themes";
import { useThemeMode } from "@/components/ThemeMode";

/*
  Applies a theme's colors at RUNTIME by writing them into CSS variables on a
  wrapper element. Everything inside inherits those variables, so all the
  `bg-primary` / `text-text` / etc. utilities re-color automatically.

  Pass `tokens` (the default/dark set) and optionally `light` (the light-mode
  variant). When the app-wide mode is "light" and a `light` set is given, it's
  used; otherwise `tokens` is. Zones with no light variant (e.g. the neutral
  Zone-1 brand) just ignore the mode.
*/
function tokensToCssVars(t: ThemeTokens): CSSProperties {
  return {
    "--background": t.background,
    "--surface": t.surface,
    "--surface-2": t.surface2,
    "--border": t.border,
    "--text": t.text,
    "--text-2": t.text2,
    "--text-3": t.text3,
    "--muted": t.muted,
    "--primary": t.primary,
    "--primary-live": t.primaryLive,
    "--primary-contrast": t.primaryContrast,
    "--accent": t.accent,
    "--success": t.success,
    "--warn": t.warn,
    "--danger": t.danger,
    "--overlay-shadow": t.overlayShadow,
    "--card-shadow": t.cardShadow,
    "--ink": t.ink,
    "--ink-contrast": t.inkContrast,
    "--ink-lift": t.inkLift,
    /*
      The same four colours again, under -src names. A custom property may not
      be defined in terms of itself, so `.on-ink` (app/globals.css) cannot write
      `--primary: <something using --primary>`. It reads these instead.
    */
    "--primary-src": t.primary,
    "--success-src": t.success,
    "--warn-src": t.warn,
    "--danger-src": t.danger,
  } as CSSProperties;
}

export default function ThemeProvider({
  tokens,
  light,
  children,
  className,
  paintRoot = false,
}: {
  tokens: ThemeTokens;
  light?: ThemeTokens;
  children: ReactNode;
  className?: string;
  /*
    Copy this theme's background onto <html>. Set it on the provider that wraps a
    whole ROUTE, never on a sheet or overlay — nested providers would fight over
    the document and the last one mounted would win.

    Why it's needed: these tokens live on the wrapper div below, so <html> keeps
    the light :root defaults. Rubber-band scrolling on a dark screen exposed that
    as a white strip. Also sets color-scheme, so native scrollbars and form
    controls stop rendering light-on-dark.
  */
  paintRoot?: boolean;
}) {
  const { mode } = useThemeMode();
  const usingLight = !!light && mode === "light";
  const active = usingLight ? light : tokens;

  useEffect(() => {
    if (!paintRoot) return;
    const root = document.documentElement;
    const previousBackground = root.style.backgroundColor;
    const previousScheme = root.style.colorScheme;
    root.style.backgroundColor = active.background;
    root.style.colorScheme = usingLight ? "light" : "dark";
    // Restore on unmount so leaving a themed route doesn't strand its color on
    // the document (e.g. Zone 2 -> the Zone 1 landing).
    return () => {
      root.style.backgroundColor = previousBackground;
      root.style.colorScheme = previousScheme;
    };
  }, [paintRoot, active.background, usingLight]);

  /*
    `app-face` sets the app's typeface (Plus Jakarta Sans, see globals.css).
    It rides on the provider because every themed surface — routes AND the
    portalled sheets that re-wrap themselves in a provider — is exactly the set
    of screens that should wear it. Zone 1 (landing, login, join) has no
    provider and keeps its own faces.
  */
  return (
    <div style={tokensToCssVars(active)} className={className ? `app-face ${className}` : "app-face"}>
      {children}
    </div>
  );
}

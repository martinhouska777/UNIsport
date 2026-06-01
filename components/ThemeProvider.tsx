"use client";

import type { CSSProperties, ReactNode } from "react";
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
    "--muted": t.muted,
    "--primary": t.primary,
    "--primary-contrast": t.primaryContrast,
    "--accent": t.accent,
    "--success": t.success,
    "--warn": t.warn,
    "--danger": t.danger,
  } as CSSProperties;
}

export default function ThemeProvider({
  tokens,
  light,
  children,
  className,
}: {
  tokens: ThemeTokens;
  light?: ThemeTokens;
  children: ReactNode;
  className?: string;
}) {
  const { mode } = useThemeMode();
  const active = light && mode === "light" ? light : tokens;
  return (
    <div style={tokensToCssVars(active)} className={className}>
      {children}
    </div>
  );
}

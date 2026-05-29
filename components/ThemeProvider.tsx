import type { CSSProperties, ReactNode } from "react";
import type { ThemeTokens } from "@/lib/themes";

/*
  Applies a theme's colors at RUNTIME by writing them into CSS variables on a
  wrapper element. Everything inside inherits those variables, so all the
  `bg-primary` / `text-text` / etc. utilities re-color automatically.

  Because the values are written as inline CSS variables (not hardcoded into
  any component), swapping `tokens` is all it takes to re-skin the whole app.
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
  children,
  className,
}: {
  tokens: ThemeTokens;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div style={tokensToCssVars(tokens)} className={className}>
      {children}
    </div>
  );
}

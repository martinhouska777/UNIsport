"use client";

/*
  SETTINGS → DESIGN. Light or dark, picked from two little pictures of the app
  — the way a phone's own display settings show it — each drawn in the real
  school theme for that mode, so what you tap is what you get.

  The choice is the app-wide mode (components/ThemeMode.tsx): saved on this
  device, and every themed screen re-skins at once. Colours are theme tokens
  only; each picture wears its mode's token set through its own ThemeProvider.
*/
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import { useThemeMode, type ThemeMode } from "@/components/ThemeMode";
import { SettingsBody, SettingsHeader } from "@/components/settings/SettingsShell";
import { getUniversity, neutralTheme, type ThemeTokens } from "@/lib/themes";

/* A tiny screen: a top bar, two cards, the school-colour button. */
function MiniScreen() {
  return (
    <div className="flex h-36 flex-col gap-1.5 rounded-xl border border-border bg-background p-2">
      <div className="flex items-center gap-1.5 rounded-md bg-surface px-1.5 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        <span className="h-1.5 w-10 rounded-full bg-text" />
      </div>
      <div className="rounded-md bg-surface p-1.5 shadow-card">
        <div className="h-1.5 w-12 rounded-full bg-text" />
        <div className="mt-1 h-1.5 w-16 rounded-full bg-border" />
        <div className="mt-2 h-3.5 w-12 rounded-full bg-primary" />
      </div>
      <div className="rounded-md bg-surface p-1.5 shadow-card">
        <div className="h-1.5 w-10 rounded-full bg-text" />
        <div className="mt-1 h-1.5 w-14 rounded-full bg-border" />
      </div>
    </div>
  );
}

function ModeChoice({
  mode,
  label,
  tokens,
  chosen,
  onPick,
}: {
  mode: ThemeMode;
  label: string;
  tokens: ThemeTokens;
  chosen: boolean;
  onPick: (m: ThemeMode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(mode)}
      aria-pressed={chosen}
      className={`flex flex-col items-center gap-2.5 rounded-2xl border bg-surface p-3 shadow-card ${
        chosen ? "border-primary" : "border-border"
      }`}
    >
      {/* Only `tokens`, no `light`: the picture ignores the current mode. */}
      <ThemeProvider tokens={tokens} className="w-full">
        <MiniScreen />
      </ThemeProvider>
      <span className="flex items-center gap-2 text-sm text-text">
        <span
          className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border ${
            chosen ? "border-primary bg-primary" : "border-border"
          }`}
        >
          {chosen && <span className="h-1.5 w-1.5 rounded-full bg-primary-contrast" />}
        </span>
        {label}
      </span>
    </button>
  );
}

export default function DesignSettingsPage() {
  const { universityKey } = useAppState();
  const { mode, setMode } = useThemeMode();
  const uni = getUniversity(universityKey);
  const dark = uni?.theme ?? neutralTheme;
  const light = uni?.themeLight ?? dark;

  return (
    <>
      <SettingsHeader title="Design" />
      <SettingsBody>
        <div className="grid grid-cols-2 gap-2.5">
          <ModeChoice mode="light" label="Light" tokens={light} chosen={mode === "light"} onPick={setMode} />
          <ModeChoice mode="dark" label="Dark" tokens={dark} chosen={mode === "dark"} onPick={setMode} />
        </div>
      </SettingsBody>
    </>
  );
}

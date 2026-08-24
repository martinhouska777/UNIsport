"use client";

import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";
import { varsityThemeFor } from "@/lib/varsity/theme";

/*
  Varsity Mode's palette for the CURRENT university: the mode's own warm
  near-black chassis wearing this school's four brand hues (lib/varsity/
  theme.ts). One hook so every varsity ThemeProvider follows the Settings
  switcher the same way.
*/
export function useVarsityTheme() {
  const { universityKey } = useAppState();
  return varsityThemeFor(getUniversity(universityKey));
}

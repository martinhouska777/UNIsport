"use client";

import { createContext, useContext, type ReactNode } from "react";

/*
  PHONE SCREENS: LIGHT ONLY.

  Every phone on the landing — the two scroll stories, both closers, the
  coach's five — shows a capture of the real app. There was a Light / Dark
  switch pinned bottom-right that flipped them all to the app's dark look; the
  owner cut it (2026-09-15: "cut the dark version, just stay with light on the
  webpage"). A visitor who pressed Dark before sees light too — the old
  localStorage choice (uniLandingPhoneMode) is simply never read.

  The mode stays a context rather than vanishing from Shot.tsx and
  HeroPhones.tsx, so bringing dark back is this file alone: the dark twins
  still sit at /landing/dark/<x>.webp (shotSrc() is the rule) and the chrome
  tokens still live under [data-phone-mode="dark"] in globals.css. The switch
  itself is in git history (commit before this one).
*/

export type PhoneMode = "light" | "dark";

const Ctx = createContext<{ mode: PhoneMode; chosen: boolean }>({ mode: "light", chosen: false });

export function usePhoneMode() {
  return useContext(Ctx);
}

/** The dark twin of a light capture path. */
export function shotSrc(path: string, mode: PhoneMode) {
  return mode === "dark" ? path.replace(/^\/landing\//, "/landing/dark/") : path;
}

export function PhoneModeProvider({ children }: { children: ReactNode }) {
  return (
    <Ctx.Provider value={{ mode: "light", chosen: false }}>
      <div data-phone-mode="light" className="contents">
        {children}
      </div>
    </Ctx.Provider>
  );
}

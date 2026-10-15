"use client";

/*
  THE OPENS-ON SCREEN — the whole app for a student who has signed up and done
  onboarding before their school opens (lib/opening.ts).

  The school's crest and the day, and Log out so a shared phone isn't stuck on
  one account. At the opening moment it lets them in by itself
  (components/useDoor.ts).

  Sits OUTSIDE the (app) route group on purpose, like /varsity/waiting: that
  shell is what sends a closed account here.
*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import { useDoor } from "@/components/useDoor";
import ThemeProvider from "@/components/ThemeProvider";
import LoadingGate from "@/components/LoadingGate";
import UniversityCrest from "@/components/UniversityCrest";
import { getUniversity, neutralTheme } from "@/lib/themes";
import { openingDayLabel } from "@/lib/opening";

export default function OpeningPage() {
  const router = useRouter();
  const { ready, loggedIn, studentReady, universityKey, logout } = useAppState();
  const { checking, closed } = useDoor();

  useEffect(() => {
    if (!ready) return;
    if (!loggedIn) router.replace("/");
    else if (!studentReady) router.replace("/onboarding");
    else if (!checking && !closed) router.replace("/match");
  }, [ready, loggedIn, studentReady, checking, closed, router]);

  const uni = getUniversity(universityKey);
  const theme = uni?.theme ?? neutralTheme;
  const day = openingDayLabel(universityKey);

  if (!ready || !loggedIn || !studentReady || checking || !closed || !day) {
    return (
      <ThemeProvider tokens={theme} light={uni?.themeLight} paintRoot className="bg-background">
        <LoadingGate />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider
      tokens={theme}
      light={uni?.themeLight}
      paintRoot
      className="flex h-dvh flex-col overflow-y-auto bg-background"
    >
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <UniversityCrest size={72} />
        <h1 className="mt-6 text-[24px] font-semibold leading-tight text-text">
          UNIsport opens
          <span className="block">{day}.</span>
        </h1>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace("/");
          }}
          className="tap44 mt-8 text-[13px] text-muted"
        >
          Log out
        </button>
      </div>
    </ThemeProvider>
  );
}

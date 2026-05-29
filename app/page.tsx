"use client";

/*
  ZONE 1 (pre-login) landing. Neutral brand ONLY — no university colors.
  Holds the temporary "demo login" toggle that drops you into the themed app.
*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";

export default function Landing() {
  const { ready, loggedIn, onboarded, login } = useAppState();
  const router = useRouter();

  // After login: new users go through onboarding first, then into the app.
  useEffect(() => {
    if (ready && loggedIn) router.replace(onboarded ? "/gyms" : "/onboarding");
  }, [ready, loggedIn, onboarded, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-contrast">
          US
        </div>
        <h1 className="text-2xl font-semibold text-text">UNIsport</h1>
        <p className="mt-2 text-sm text-muted">
          Campus fitness — find gyms, partners, and sessions at your university.
        </p>

        <button
          onClick={() => {
            login();
            router.replace(onboarded ? "/gyms" : "/onboarding");
          }}
          className="mt-8 w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-contrast transition-opacity hover:opacity-90"
        >
          Enter app (demo login)
        </button>

        <p className="mt-3 text-xs text-muted">
          Temporary — real sign-in comes later.
        </p>
      </div>
    </div>
  );
}

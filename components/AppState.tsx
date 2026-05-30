"use client";

/*
  App-wide state. Login is REAL (Supabase session). "Has this account finished
  onboarding?" is now read from the DATABASE (the `profiles` table) rather than
  the browser — so a brand-new account onboards, and a returning account goes
  straight to the app, on any device.
*/
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import type { OnboardingProfile } from "@/lib/onboarding";

type AppState = {
  ready: boolean; // true once session + onboarding status are known
  loggedIn: boolean;
  onboarded: boolean;
  universityKey: string;
  logout: () => Promise<void>;
  saveOnboarding: (profile: OnboardingProfile) => Promise<void>;
  resetOnboarding: () => Promise<void>; // temporary dev helper to replay onboarding
};

const DEFAULT_UNIVERSITY = "harvard"; // later: from the user's profile row

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => (hasSupabaseEnv() ? createClient() : null));
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [onboarded, setOnboarded] = useState(false);

  // Read onboarding-complete flag for a user from the DB (resilient if the table
  // doesn't exist yet → treated as "not onboarded").
  const refreshOnboarded = async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle();
    setOnboarded(!error && !!data?.onboarding_completed);
  };

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (data.session) await refreshOnboarded(data.session.user.id);
      setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s) await refreshOnboarded(s.user.id);
      else setOnboarded(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setOnboarded(false);
  };

  const saveOnboarding = async (profile: OnboardingProfile) => {
    if (supabase && session) {
      const { error } = await supabase.from("profiles").upsert({
        id: session.user.id,
        data: profile,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });
      // eslint-disable-next-line no-console
      if (error) console.error("Saving profile failed:", error.message);
    }
    setOnboarded(true);
  };

  const resetOnboarding = async () => {
    if (supabase && session) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: false })
        .eq("id", session.user.id);
    }
    setOnboarded(false);
  };

  return (
    <AppStateContext.Provider
      value={{
        ready,
        loggedIn: !!session,
        onboarded,
        universityKey: DEFAULT_UNIVERSITY,
        logout,
        saveOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside <AppStateProvider>");
  return ctx;
}

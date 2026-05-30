"use client";

/*
  App-wide state. Login is now REAL (Supabase auth session); onboarding-complete
  and the active university are still local for now (moved to the DB in a later slice).
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

type AppState = {
  ready: boolean; // becomes true once we've checked the session
  loggedIn: boolean;
  onboarded: boolean;
  universityKey: string;
  logout: () => Promise<void>;
  completeOnboarding: () => void;
  resetOnboarding: () => void; // temporary dev helper to replay onboarding
};

const ONBOARDED_KEY = "unisport.demo.onboarded";
const DEFAULT_UNIVERSITY = "harvard"; // later: comes from the logged-in user's record

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  // One browser client for the app's lifetime (null if env isn't configured yet).
  const [supabase] = useState(() => (hasSupabaseEnv() ? createClient() : null));
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    setOnboarded(localStorage.getItem(ONBOARDED_KEY) === "true");
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
  };

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDED_KEY, "true");
    setOnboarded(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDED_KEY);
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
        completeOnboarding,
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

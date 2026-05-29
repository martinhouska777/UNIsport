"use client";

/*
  TEMPORARY fake auth + onboarding + "which university am I" state.
  Stand-in until real login (Supabase) is wired up later. It remembers, in the
  browser, whether the demo user is "logged in", whether they've finished
  onboarding, and which university theme to load in Zone 2.
*/
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type AppState = {
  ready: boolean; // becomes true after we've read from localStorage
  loggedIn: boolean;
  onboarded: boolean;
  universityKey: string;
  login: () => void;
  logout: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void; // temporary dev helper to replay onboarding
};

const LOGGED_IN_KEY = "unisport.demo.loggedIn";
const ONBOARDED_KEY = "unisport.demo.onboarded";
const DEFAULT_UNIVERSITY = "harvard"; // later: comes from the logged-in user's record

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    setLoggedIn(localStorage.getItem(LOGGED_IN_KEY) === "true");
    setOnboarded(localStorage.getItem(ONBOARDED_KEY) === "true");
    setReady(true);
  }, []);

  const login = () => {
    localStorage.setItem(LOGGED_IN_KEY, "true");
    setLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem(LOGGED_IN_KEY);
    setLoggedIn(false);
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
        loggedIn,
        onboarded,
        universityKey: DEFAULT_UNIVERSITY,
        login,
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

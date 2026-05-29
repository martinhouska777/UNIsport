"use client";

/*
  TEMPORARY fake auth + "which university am I" state.
  This is a stand-in until real login (Supabase) is wired up later.
  It just remembers, in the browser, whether the demo user is "logged in"
  and which university theme to load in Zone 2.
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
  universityKey: string;
  login: () => void;
  logout: () => void;
};

const STORAGE_KEY = "unisport.demo.loggedIn";
const DEFAULT_UNIVERSITY = "harvard"; // later: comes from the logged-in user's record

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(localStorage.getItem(STORAGE_KEY) === "true");
    setReady(true);
  }, []);

  const login = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLoggedIn(false);
  };

  return (
    <AppStateContext.Provider
      value={{
        ready,
        loggedIn,
        universityKey: DEFAULT_UNIVERSITY,
        login,
        logout,
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

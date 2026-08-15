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

/*
  One account, two capabilities. `studentReady` and `varsityReady` are
  INDEPENDENT: you can hold either, or both.
    • studentReady — finished the nine-step student onboarding → Gyms, Match,
      Messages. This is the flag the app has always had.
    • varsityReady — finished the short athlete setup (name + class year). A
      rower who arrives through a team invite gets this WITHOUT answering the
      student questions; the student side stays optional and is offered from the
      mode switcher whenever they want it.
  Neither says anything about being on a squad — that's membership, and it lives
  in the database (see lib/varsity/membership).
*/
type AppState = {
  ready: boolean; // true once session + both setup flags are known
  loggedIn: boolean;
  userId: string | null;
  email: string | null; // which account you're signed in as — shown on Profile
  studentReady: boolean;
  varsityReady: boolean;
  universityKey: string;
  logout: () => Promise<void>;
  saveOnboarding: (profile: OnboardingProfile) => Promise<void>;
  // The short varsity setup: writes name/class year onto the SAME profile row
  // and marks only the varsity flag, leaving the student side untouched.
  saveVarsitySetup: (basics: { name: string; classYear: string; sex: string }) => Promise<void>;
  resetOnboarding: () => Promise<void>; // temporary dev helper to replay onboarding
};

const DEFAULT_UNIVERSITY = "harvard"; // later: from the user's profile row

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => (hasSupabaseEnv() ? createClient() : null));
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [studentReady, setStudentReady] = useState(false);
  const [varsityReady, setVarsityReady] = useState(false);

  // Read both setup flags for a user from the DB (resilient if the table or the
  // column doesn't exist yet → treated as "set up neither side").
  const refreshOnboarded = async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed, varsity_setup_completed")
      .eq("id", userId)
      .maybeSingle();
    setStudentReady(!error && !!data?.onboarding_completed);
    setVarsityReady(!error && !!data?.varsity_setup_completed);
  };

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        if (data.session) await refreshOnboarded(data.session.user.id);
      } finally {
        // Always land on ready, even if the session or profile lookup fails —
        // otherwise the whole app sits on a loading state with no way out.
        if (active) setReady(true);
      }
    })();

    /*
      IMPORTANT: this callback must NOT be async and must NOT await any other
      Supabase call.

      supabase-js holds an internal auth lock for as long as this callback runs,
      and any Supabase call made inside it waits on that same lock — so awaiting
      the profiles query here deadlocks the client. The visible symptom is
      sign-in hanging on "Please wait…" forever with no error, because
      signInWithPassword() itself never resolves. Deferring with a 0ms timeout
      lets the lock release first.
      See https://supabase.com/docs/reference/javascript/auth-onauthstatechange
    */
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setStudentReady(false);
        setVarsityReady(false);
        setReady(true);
        return;
      }
      // Looking up onboarding status is async, so flip `ready` off while we do
      // it — otherwise the redirect acts on the stale default and sends
      // returning accounts back through onboarding.
      setReady(false);
      setTimeout(async () => {
        if (!active) return;
        try {
          await refreshOnboarded(s.user.id);
        } finally {
          if (active) setReady(true);
        }
      }, 0);
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
    setStudentReady(false);
    setVarsityReady(false);
  };

  const saveOnboarding = async (profile: OnboardingProfile) => {
    if (supabase && session) {
      // Finishing the student flow also satisfies the varsity side: it asks for
      // the same name and class year, so nobody is sent through both.
      const { error } = await supabase.from("profiles").upsert({
        id: session.user.id,
        data: profile,
        onboarding_completed: true,
        varsity_setup_completed: true,
        updated_at: new Date().toISOString(),
      });
      // eslint-disable-next-line no-console
      if (error) console.error("Saving profile failed:", error.message);
    }
    setStudentReady(true);
    setVarsityReady(true);
  };

  /*
    The short athlete setup. MERGES onto whatever `data` already holds rather
    than replacing it, so running this can never wipe a student profile, and
    deliberately leaves onboarding_completed alone — the student side stays
    optional until they choose it.
  */
  const saveVarsitySetup = async (basics: { name: string; classYear: string; sex: string }) => {
    if (supabase && session) {
      const { data: row } = await supabase
        .from("profiles")
        .select("data")
        .eq("id", session.user.id)
        .maybeSingle();
      const current = (row?.data as Record<string, unknown>) ?? {};
      const { error } = await supabase.from("profiles").upsert({
        id: session.user.id,
        data: { ...current, ...basics },
        varsity_setup_completed: true,
        updated_at: new Date().toISOString(),
      });
      // eslint-disable-next-line no-console
      if (error) console.error("Saving varsity setup failed:", error.message);
    }
    setVarsityReady(true);
  };

  const resetOnboarding = async () => {
    if (supabase && session) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: false })
        .eq("id", session.user.id);
    }
    setStudentReady(false);
  };

  return (
    <AppStateContext.Provider
      value={{
        ready,
        loggedIn: !!session,
        userId: session?.user.id ?? null,
        email: session?.user.email ?? null,
        studentReady,
        varsityReady,
        universityKey: DEFAULT_UNIVERSITY,
        logout,
        saveOnboarding,
        saveVarsitySetup,
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

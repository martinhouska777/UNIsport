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
import { getUniversity } from "@/lib/themes";
import { universityForEmail } from "@/lib/universityEmail";
import { readDemoSchool, rollDemoSchool } from "@/lib/demoSchool";
import type { VarsityAthleteProfile } from "@/lib/varsity/athleteProfile";
import { defaultUnits, type Units } from "@/lib/varsity/units";
import { clearMembershipCache } from "@/lib/varsity/membership";

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
  /*
    Which university this account is at. Worked out from the ADDRESS you signed
    in with — "@harvard.edu" is Harvard — so nobody is ever asked to pick a
    school, and nobody can pick the wrong one. See lib/universityEmail.ts.
  */
  universityKey: string;
  /*
    The DEMO university switcher (Settings). Overrides the address for as long
    as it is set, so the white-label promise can be SEEN on one account — flip
    to Yale and the theme, crest and gyms all follow. Kept in this browser only,
    and dropped on logout so the next person starts at their own school.
  */
  setUniversity: (key: string) => void;
  /*
    Roll the demo school (lib/demoSchool.ts). Called by the sign-in screen the
    moment a sign-in works, so an account whose address we don't recognise
    lands on a DIFFERENT university each time — the white-label promise, seen
    rather than described. Ignored entirely for a real university address.
  */
  rollUniversity: () => void;
  logout: () => Promise<void>;
  saveOnboarding: (profile: OnboardingProfile) => Promise<void>;
  /*
    The short varsity setup: writes name/class year onto the SAME profile row
    and marks only the varsity flag, leaving the student side untouched.

    `varsity` (rowing side, cox, height, weight) and `units` go into the SAME
    write on purpose. Each of those has its own save helper elsewhere, but all
    three read-modify-write the one `profiles.data` JSON — calling them
    separately here would race, and the last one to land would drop the others.
  */
  saveVarsitySetup: (basics: {
    name: string;
    classYear: string;
    sex: string;
    varsity?: Partial<VarsityAthleteProfile>;
    units?: Partial<Units>;
  }) => Promise<void>;
  resetOnboarding: () => Promise<void>; // temporary dev helper to replay onboarding
};

// The school for an address we don't recognise — an older account on a personal
// address, or a campus the app isn't live at yet. They still get a working app.
const DEFAULT_UNIVERSITY = "harvard";
const UNIVERSITY_STORAGE_KEY = "unisport.university"; // the demo switcher's choice

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => (hasSupabaseEnv() ? createClient() : null));
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [studentReady, setStudentReady] = useState(false);
  const [varsityReady, setVarsityReady] = useState(false);
  /*
    The two remembered schools, read after mount (localStorage) so the server
    and the first client render agree: `chosen` is the Settings switcher's
    pick, `demo` is the one rolled at the last sign-in. Held together in one
    piece of state so this stays a single read.
  */
  const [remembered, setRemembered] = useState<{ chosen: string | null; demo: string | null }>({
    chosen: null,
    demo: null,
  });

  useEffect(() => {
    const saved = localStorage.getItem(UNIVERSITY_STORAGE_KEY);
    setRemembered({
      chosen: saved && getUniversity(saved) ? saved : null,
      demo: readDemoSchool(),
    });
  }, []);

  const setUniversity = (key: string) => {
    if (!getUniversity(key)) return;
    setRemembered((current) => ({ ...current, chosen: key }));
    localStorage.setItem(UNIVERSITY_STORAGE_KEY, key);
  };

  const rollUniversity = () => {
    const next = rollDemoSchool();
    setRemembered((current) => ({ ...current, demo: next }));
  };

  /*
    WHICH SCHOOL — the signed-in address decides, every render.

    Nothing is stored for the real answer and nothing has to be: the address is
    on the account, so it follows you to any phone or browser you sign in on,
    and it can never drift out of date.

    The order matters. The Settings switcher wins, because it is someone asking
    out loud. The ADDRESS comes next, and beats the dice — a real Harvard
    student is never shown Yale. Only an address we don't recognise reaches the
    demo roll, and only if that has never run do we fall back to the default.
  */
  const universityKey =
    remembered.chosen ??
    universityForEmail(session?.user.email)?.key ??
    remembered.demo ??
    DEFAULT_UNIVERSITY;

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
    // Drop the demo switcher's choice: the next person to sign in on this
    // browser should land at THEIR school, not at whatever was being demoed.
    // The rolled demo school stays — it is what stops the dice repeating.
    setRemembered((current) => ({ ...current, chosen: null }));
    try {
      localStorage.removeItem(UNIVERSITY_STORAGE_KEY);
    } catch {
      /* storage unavailable — the override simply outlives this session */
    }
    setStudentReady(false);
    setVarsityReady(false);
    // The squad answer is remembered per account (lib/varsity/membership); drop
    // it so the next person to sign in on this browser is asked afresh.
    clearMembershipCache();
  };

  const saveOnboarding = async (profile: OnboardingProfile) => {
    if (supabase && session) {
      // Finishing the student flow also satisfies the varsity side: it asks for
      // the same name and class year, so nobody is sent through both.
      const { error } = await supabase.from("profiles").upsert({
        id: session.user.id,
        // The school rides along with the profile so the DATABASE knows it too
        // — matching only ever offers you partners at your own university, and
        // it reads this field (db/matching.sql).
        data: { ...profile, university: universityKey },
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
  const saveVarsitySetup = async (basics: {
    name: string;
    classYear: string;
    sex: string;
    varsity?: Partial<VarsityAthleteProfile>;
    units?: Partial<Units>;
  }) => {
    if (supabase && session) {
      const { name, classYear, sex, varsity, units } = basics;
      const { data: row } = await supabase
        .from("profiles")
        .select("data")
        .eq("id", session.user.id)
        .maybeSingle();
      const current = (row?.data as Record<string, unknown>) ?? {};
      const { error } = await supabase.from("profiles").upsert({
        id: session.user.id,
        data: {
          ...current,
          university: universityKey, // same reason as in saveOnboarding above
          name,
          classYear,
          sex,
          // Both are sub-keys, so they merge onto whatever is already there
          // rather than replacing it — someone re-running setup keeps their PRs.
          varsity: { ...((current.varsity as object) ?? {}), ...(varsity ?? {}) },
          units: { ...defaultUnits, ...((current.units as object) ?? {}), ...(units ?? {}) },
        },
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
        universityKey,
        setUniversity,
        rollUniversity,
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

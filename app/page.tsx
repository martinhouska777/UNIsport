"use client";

/*
  ZONE 1 (pre-login) landing + auth. Neutral brand ONLY.
  Two intents: "Log in" (existing accounts) and "Sign up" (new accounts).
  Email + password (the familiar flow) plus Google. After auth, the app routes
  new accounts (no profile yet) to onboarding and returning ones to the app.
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

type Mode = "login" | "signup";

// Credentials of the last successful login, kept ONLY in this browser (never in
// source). Powers the one-click "Continue as …" button so you don't retype them.
const REMEMBER_KEY = "unisport.lastLogin";
type Remembered = { email: string; password: string };

function readRemembered(): Remembered | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    return raw ? (JSON.parse(raw) as Remembered) : null;
  } catch {
    return null;
  }
}

export default function Landing() {
  const { ready, loggedIn, onboarded } = useAppState();
  const router = useRouter();

  const [supabase] = useState(() => (hasSupabaseEnv() ? createClient() : null));
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmSent, setConfirmSent] = useState(false); // only if email-confirm is ON in Supabase
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remembered, setRemembered] = useState<Remembered | null>(null);

  useEffect(() => {
    if (ready && loggedIn) router.replace(onboarded ? "/gyms" : "/onboarding");
  }, [ready, loggedIn, onboarded, router]);

  // Load any remembered login so we can offer the one-click button.
  useEffect(() => {
    setRemembered(readRemembered());
  }, []);

  // Show a clear message if a Google sign-in bounced back with an error.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("auth_error")) {
      setError("That sign-in didn't work. Please try again (or use email + password).");
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        if (/already registered|already exists|user already/i.test(error.message)) {
          setError("An account with that email already exists — switch to “Log in”.");
        } else {
          setError(error.message);
        }
        return;
      }
      // Supabase hides "this email already has an account" (to stop people probing
      // who's registered): it returns success with NO session and an EMPTY
      // identities list. Detect that and point them to Log in — otherwise they'd
      // get stuck on a "check your email" screen for a mail that never arrives
      // (this project has email auto-confirm ON, so no confirmation mail is sent).
      const alreadyRegistered =
        !data.session && !!data.user && (data.user.identities?.length ?? 0) === 0;
      if (alreadyRegistered) {
        setError("An account with that email already exists — switch to “Log in”.");
        return;
      }

      // A real new account with no session means email confirmation is ON in
      // Supabase → a confirmation link was just sent.
      if (!data.session) setConfirmSent(true);
      // Otherwise a session exists (confirmation OFF) → the redirect effect handles it.
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        if (/invalid login credentials/i.test(error.message)) {
          setError("Wrong email or password. New here? Switch to “Sign up”.");
        } else if (/email not confirmed/i.test(error.message)) {
          setError("Please confirm your email first — check your inbox for the link.");
        } else {
          setError(error.message);
        }
        return;
      }
      // Success → remember these credentials in this browser only, then the
      // redirect effect handles routing.
      try {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, password }));
      } catch {
        /* storage unavailable (e.g. private mode) — quick login just won't appear */
      }
    }
  };

  // One-click sign-in using the credentials remembered from a previous login.
  const quickLogin = async () => {
    if (!supabase || !remembered) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword(remembered);
    setLoading(false);
    if (error) {
      // Stale (e.g. password changed) — drop it and fall back to the form.
      try {
        localStorage.removeItem(REMEMBER_KEY);
      } catch {}
      setRemembered(null);
      setError("Saved login didn't work anymore — please log in again.");
    }
    // Success → the redirect effect handles routing.
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setConfirmSent(false);
  };

  const isSignup = mode === "signup";

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

        {!hasSupabaseEnv() ? (
          <p className="mt-8 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
            Sign-in isn&apos;t configured in this environment yet.
          </p>
        ) : confirmSent ? (
          <div className="mt-8 rounded-xl border border-border bg-surface-2 px-4 py-5">
            <p className="text-sm text-text">Confirm your email</p>
            <p className="mt-1 text-xs text-muted">
              We sent a confirmation link to <span className="text-text">{email}</span>. Open it to
              activate your account, then come back and log in.
            </p>
            <button onClick={() => switchMode("login")} className="mt-4 text-xs font-medium text-primary">
              Back to log in
            </button>
          </div>
        ) : (
          <div className="mt-7">
            {/* One-click sign-in remembered from a previous login on this device. */}
            {remembered && (
              <div className="mb-4">
                <button
                  onClick={quickLogin}
                  disabled={loading}
                  className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-contrast transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Please wait…" : `Continue as ${remembered.email}`}
                </button>
                <div className="my-3 flex items-center gap-3 text-[11px] text-muted">
                  <span className="h-px flex-1 bg-border" />
                  or use a different account
                  <span className="h-px flex-1 bg-border" />
                </div>
              </div>
            )}

            {/* Log in / Sign up toggle */}
            <div className="mb-4 flex rounded-full border border-border bg-surface-2 p-1 text-sm font-medium">
              <button
                onClick={() => switchMode("login")}
                className={`flex-1 rounded-full py-2 transition-colors ${
                  !isSignup ? "bg-primary text-primary-contrast" : "text-muted"
                }`}
              >
                Log in
              </button>
              <button
                onClick={() => switchMode("signup")}
                className={`flex-1 rounded-full py-2 transition-colors ${
                  isSignup ? "bg-primary text-primary-contrast" : "text-muted"
                }`}
              >
                Sign up
              </button>
            </div>

            <p className="mb-3 text-xs text-muted">
              {isSignup ? "New here? Create your account." : "Welcome back — log in to your account."}
            </p>

            <form onSubmit={submit} className="flex flex-col gap-2.5">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email"
                className="w-full rounded-full border border-border bg-surface-2 px-5 py-3 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none"
              />
              <input
                type="password"
                required
                minLength={6}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? "Choose a password (6+ characters)" : "Password"}
                aria-label="Password"
                className="w-full rounded-full border border-border bg-surface-2 px-5 py-3 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-contrast transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Please wait…" : isSignup ? "Create account" : "Log in"}
              </button>
            </form>

            <div className="my-3 flex items-center gap-3 text-[11px] text-muted">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <button
              onClick={signInWithGoogle}
              className="w-full rounded-full border border-border bg-surface-2 px-5 py-3 text-sm font-medium text-text"
            >
              Continue with Google
            </button>

            {error && <p className="mt-3 text-xs text-danger">{error}</p>}
          </div>
        )}

        <p className="mt-4 text-xs text-muted">
          {isSignup
            ? "Your password is stored securely — we never see it."
            : "Use the email and password you signed up with."}
        </p>
      </div>
    </div>
  );
}

"use client";

/*
  Student sign-in (Zone 1). Reached from the landing's "Get started" CTAs.
  Real Supabase auth: email + password (the familiar flow) plus Google. After
  auth, new accounts (no profile yet) go to onboarding, returning ones to the app.
  Styled in the landing's dark product brand via the `l-*` tokens.
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { instrumentSerif } from "@/components/landing/fonts";
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

export default function LoginPage() {
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

      // A real new account with no session: accounts are auto-confirmed at the
      // database level (db/auth_autoconfirm.sql), so the account is usable right
      // away — log them straight in. Only if that genuinely fails do we fall
      // back to the "check your email" screen.
      if (!data.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) setConfirmSent(true);
        // success → the redirect effect handles routing
      }
      // Otherwise a session already exists → the redirect effect handles it.
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
    <div
      className={`${instrumentSerif.variable} flex min-h-dvh flex-col items-center justify-center bg-l-bg px-6 text-center font-sans text-l-text`}
    >
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-block font-display text-2xl italic tracking-tight text-l-text"
        >
          UNI<span className="text-l-accent">sport</span>
        </Link>

        <h1 className="font-display text-3xl text-l-text">Welcome</h1>
        <p className="mt-2 text-sm text-l-text-2">
          Find gyms, partners, and sessions at your university.
        </p>

        {!hasSupabaseEnv() ? (
          <p className="mt-8 rounded-xl border border-l-border bg-l-surface px-4 py-3 text-sm text-l-text-2">
            Sign-in isn&apos;t configured in this environment yet.
          </p>
        ) : confirmSent ? (
          <div className="mt-8 rounded-xl border border-l-border bg-l-surface px-4 py-5">
            <p className="text-sm text-l-text">Confirm your email</p>
            <p className="mt-1 text-xs text-l-text-2">
              We sent a confirmation link to <span className="text-l-text">{email}</span>. Open it to
              activate your account, then come back and log in.
            </p>
            <button onClick={() => switchMode("login")} className="mt-4 text-xs font-medium text-l-accent">
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
                  className="w-full rounded-full bg-l-accent px-5 py-3 text-sm font-semibold text-l-text transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Please wait…" : `Continue as ${remembered.email}`}
                </button>
                <div className="my-3 flex items-center gap-3 text-[11px] text-l-text-2">
                  <span className="h-px flex-1 bg-l-border" />
                  or use a different account
                  <span className="h-px flex-1 bg-l-border" />
                </div>
              </div>
            )}

            {/* Log in / Sign up toggle */}
            <div className="mb-4 flex rounded-full border border-l-border bg-l-surface p-1 text-sm font-medium">
              <button
                onClick={() => switchMode("login")}
                className={`flex-1 rounded-full py-2 transition-colors ${
                  !isSignup ? "bg-l-accent text-l-text" : "text-l-text-2"
                }`}
              >
                Log in
              </button>
              <button
                onClick={() => switchMode("signup")}
                className={`flex-1 rounded-full py-2 transition-colors ${
                  isSignup ? "bg-l-accent text-l-text" : "text-l-text-2"
                }`}
              >
                Sign up
              </button>
            </div>

            <p className="mb-3 text-xs text-l-text-2">
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
                className="w-full rounded-full border border-l-border bg-l-surface px-5 py-3 text-base text-l-text placeholder:text-l-text-3 focus:border-l-accent focus:outline-none"
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
                className="w-full rounded-full border border-l-border bg-l-surface px-5 py-3 text-base text-l-text placeholder:text-l-text-3 focus:border-l-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-l-accent px-5 py-3 text-sm font-semibold text-l-text transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Please wait…" : isSignup ? "Create account" : "Log in"}
              </button>
            </form>

            <div className="my-3 flex items-center gap-3 text-[11px] text-l-text-2">
              <span className="h-px flex-1 bg-l-border" />
              or
              <span className="h-px flex-1 bg-l-border" />
            </div>

            <button
              onClick={signInWithGoogle}
              className="w-full rounded-full border border-l-border bg-l-surface px-5 py-3 text-sm font-medium text-l-text"
            >
              Continue with Google
            </button>

            {error && <p className="mt-3 text-xs text-l-danger">{error}</p>}
          </div>
        )}

        <p className="mt-4 text-xs text-l-text-2">
          Varsity athlete?{" "}
          <Link href="/join" className="font-medium text-l-varsity">
            Join your team →
          </Link>
        </p>
      </div>
    </div>
  );
}

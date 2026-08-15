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

// The EMAIL of the last successful login, kept only in this browser so the form
// can prefill it. Never the password: anything in localStorage is readable by
// any script running on the page, so a single injected script would hand over
// real passwords — and people reuse them. Supabase already keeps you signed in
// on its own, so there is nothing to gain by storing it.
const REMEMBER_KEY = "unisport.lastLogin";

function readRememberedEmail(): string | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { email?: string; password?: string };
    if (!saved?.email) return null;
    // Earlier builds also stored the password here. Scrub it the moment we see
    // it, so browsers that already have one stop carrying it around.
    if (saved.password !== undefined) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: saved.email }));
    }
    return saved.email;
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

  useEffect(() => {
    if (!ready || !loggedIn) return;
    /*
      An invite link sends people here as /login?next=/join/<code> so they land
      back on the invite once they're signed in. Read straight off the URL
      rather than with useSearchParams(), which would force this whole page
      into a Suspense boundary. Only same-site paths are honoured, so the
      parameter can't be used to bounce someone to another website.
    */
    const next = new URLSearchParams(window.location.search).get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    if (!onboarded) router.replace("/onboarding");
    else router.replace(safeNext ?? "/gyms");
  }, [ready, loggedIn, onboarded, router]);

  // Prefill the email from the last sign-in on this device (password never is).
  useEffect(() => {
    const saved = readRememberedEmail();
    if (saved) setEmail((current) => current || saved);
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
      // Success → remember the email (only) so this device prefills it next
      // time, then the redirect effect handles routing.
      try {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email }));
      } catch {
        /* storage unavailable (e.g. private mode) — the prefill just won't appear */
      }
    }
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

"use client";

/*
  ZONE 1 (pre-login) landing + real sign-in. Neutral brand ONLY — no university colors.
  Magic-link email (passwordless) + Google. Replaces the old demo login.
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

export default function Landing() {
  const { ready, loggedIn, onboarded } = useAppState();
  const router = useRouter();

  const [supabase] = useState(() => (hasSupabaseEnv() ? createClient() : null));
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in → new users onboard first, returning users go to the app.
  useEffect(() => {
    if (ready && loggedIn) router.replace(onboarded ? "/gyms" : "/onboarding");
  }, [ready, loggedIn, onboarded, router]);

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
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
        ) : sent ? (
          <div className="mt-8 rounded-xl border border-border bg-surface-2 px-4 py-5">
            <p className="text-sm text-text">Check your email</p>
            <p className="mt-1 text-xs text-muted">
              We sent a sign-in link to <span className="text-text">{email}</span>. Open it on this
              device to continue.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-xs font-medium text-primary"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="mt-8">
            <form onSubmit={sendMagicLink} className="flex flex-col gap-2.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email"
                className="w-full rounded-full border border-border bg-surface-2 px-5 py-3 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-contrast transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send magic link"}
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
          We&apos;ll email you a one-time sign-in link. No password needed.
        </p>
      </div>
    </div>
  );
}

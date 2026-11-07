"use client";

/*
  YOUR UNIVERSITY EMAIL, after Sign in with Apple (lib/universityEmail.ts
  needsSchoolAddress). Apple almost never hands over the .edu address, so the
  account is asked for it here: the address, then the 6-digit code Supabase
  sends to it (the "Change email address" email, APPLE-SIGN-IN.md). The
  code makes the university address the account's own, and from then on the
  account is the same as one made with email and password: same school, same
  .edu rule, Apple still signs it in.

  Zone 1, in the sign-in page's look (app/login). Nothing else in the app is
  open to the account until this is done (components/AppState.tsx).
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { instrumentSerif } from "@/components/landing/fonts";
import Wordmark from "@/components/landing/Wordmark";
import { useAppState } from "@/components/AppState";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { CODE_LENGTH, RESEND_SECONDS, codeError } from "@/lib/emailCode";
import { isUniversityEmail, UNIVERSITY_EMAIL_MESSAGE } from "@/lib/universityEmail";

const FIELD =
  "w-full rounded-full border border-l-line bg-l-surface px-5 py-3 text-base text-l-text placeholder:text-l-placeholder focus:border-(--color-l-accent) focus:outline-none";
const PRIMARY =
  "w-full rounded-full bg-l-accent px-5 py-3 text-sm font-semibold text-l-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60";

/* Same-site paths only, the rule the sign-in page uses for its own `next`. */
function readNext(): string | null {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !/[@\\]/.test(next) ? next : null;
}

export default function VerifySchoolPage() {
  const { ready, loggedIn, needsSchoolEmail, logout } = useAppState();
  const router = useRouter();
  const [supabase] = useState(() => (hasSupabaseEnv() ? createClient() : null));
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState(false); // the address already has its own account
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Not signed in: the sign-in. Already on a university address: onwards.
  useEffect(() => {
    if (!ready) return;
    if (!loggedIn) router.replace("/login");
    else if (!needsSchoolEmail) router.replace(readNext() ?? "/onboarding");
  }, [ready, loggedIn, needsSchoolEmail, router]);

  const send = async () => {
    if (!supabase) return;
    setError(null);
    setTaken(false);
    const address = email.trim().toLowerCase();
    if (!isUniversityEmail(address)) {
      setError(UNIVERSITY_EMAIL_MESSAGE);
      return;
    }
    setLoading(true);
    const next = readNext();
    const { error } = await supabase.auth.updateUser(
      { email: address },
      // The email can carry a link as well as the code; the link lands here too.
      { emailRedirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}` },
    );
    setLoading(false);
    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        setTaken(true);
        setError("This email already has an account. Log in with it.");
      } else {
        setError(error.message);
      }
      return;
    }
    setCode("");
    setStep("code");
    setResendIn(RESEND_SECONDS);
  };

  const confirm = async () => {
    if (!supabase) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: "email_change",
    });
    if (error) {
      setLoading(false);
      setError(codeError(error.message));
      return;
    }
    // The new address has to be on the session before the gate lets go.
    const { data } = await supabase.auth.refreshSession();
    setLoading(false);
    if (!isUniversityEmail(data.user?.email ?? "")) {
      setError("Couldn’t confirm the address. Send a new code and try again.");
      return;
    }
    router.replace(readNext() ?? "/onboarding");
  };

  // "Log in with it": out of the Apple account, into the one that owns the address.
  const toLogin = async () => {
    await logout().catch(() => {});
    router.replace("/login");
  };

  return (
    <div
      className={`${instrumentSerif.variable} flex min-h-dvh flex-col items-center justify-center bg-l-bg px-6 text-center font-sans text-l-text`}
    >
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-block">
          <Wordmark className="text-5xl" />
        </Link>

        <h1 className="font-display text-3xl text-l-text">
          {step === "email" ? "Your university email" : "Check your email"}
        </h1>

        {step === "email" ? (
          <div className="mt-7">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="flex flex-col gap-2.5"
            >
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                aria-label="University email"
                className={FIELD}
              />
              <button type="submit" disabled={loading} className={PRIMARY}>
                {loading ? "Please wait…" : "Send code"}
              </button>
            </form>
            {error && <p className="mt-3 text-xs text-l-danger">{error}</p>}
            {taken && (
              <button type="button" onClick={toLogin} className="tap44 mt-2 text-xs font-medium text-l-accent">
                Log in
              </button>
            )}
          </div>
        ) : (
          <div className="mt-7">
            <p className="mb-4 text-sm text-l-text-2">
              Code sent to <span className="text-l-text">{email.trim().toLowerCase()}</span>
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void confirm();
              }}
              className="flex flex-col gap-2.5"
            >
              <input
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern={`\\d{${CODE_LENGTH}}`}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
                placeholder={`${CODE_LENGTH}-digit code`}
                aria-label="Code from the email"
                className="w-full rounded-full border border-l-line bg-l-surface px-5 py-3 text-center text-xl font-semibold tracking-[0.3em] text-l-text placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-l-placeholder focus:border-(--color-l-accent) focus:outline-none"
              />
              <button type="submit" disabled={loading} className={PRIMARY}>
                {loading ? "Please wait…" : "Confirm"}
              </button>
            </form>
            {error && <p className="mt-3 text-xs text-l-danger">{error}</p>}
            <div className="mt-4 flex items-center justify-center gap-6 text-xs font-medium">
              <button
                type="button"
                onClick={() => void send()}
                disabled={resendIn > 0 || loading}
                className="tap44 text-l-accent disabled:text-l-text-2"
              >
                {resendIn > 0 ? `Send a new code (${resendIn}s)` : "Send a new code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError(null);
                }}
                className="tap44 text-l-text-2"
              >
                Back
              </button>
            </div>
          </div>
        )}

        <button type="button" onClick={toLogin} className="tap44 mt-8 text-xs font-medium text-l-text-2">
          Log out
        </button>
      </div>
    </div>
  );
}

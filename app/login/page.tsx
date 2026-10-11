"use client";

/*
  Student sign-in (Zone 1). Reached from the landing's "Get started" CTAs.
  Real Supabase auth: email + password (the familiar flow) plus Google. After
  auth, new accounts (no profile yet) go to onboarding, returning ones to the app.
  Styled in the landing's dark product brand via the `l-*` tokens — except on
  the way to a team invite (`?next=/join/<code>`), where it wears the team's
  door instead (components/join/TeamDoor.tsx).
*/
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { instrumentSerif } from "@/components/landing/fonts";
import Wordmark from "@/components/landing/Wordmark";
import { useAppState } from "@/components/AppState";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { VARSITY_HOME } from "@/lib/varsity/theme";
import { LIVE_UNIVERSITY } from "@/lib/themes";
import { markSignIn, clearSignIn } from "@/lib/loginIntro";
import {
  NEXT_AFTER_SIGN_IN_COOKIE,
  NEXT_AFTER_SIGN_IN_MAX_AGE,
  isInvitePath,
} from "@/lib/signInNext";
import TeamDoor, { TeamMark } from "@/components/join/TeamDoor";
import {
  isUniversityEmail,
  universityForEmail,
  UNIVERSITY_EMAIL_MESSAGE,
} from "@/lib/universityEmail";

type Mode = "login" | "signup";

/*
  Which screen of the sign-in is showing. "form" is the usual email + password;
  the others are the codes the app emails (a code, not a link: a phone's mail
  app opens links in another browser than the installed app, and university
  mail scanners can use up a one-time link before the student ever taps it):
    verify — the code that confirms a NEW account's address
    forgot — which address to send a password-reset code to
    reset  — that code, plus the new password
*/
type Step = "form" | "verify" | "forgot" | "reset";

// Mirrors two Supabase dashboard settings (Authentication → Sign In / Providers
// → Email): "Email OTP Length" and the SMTP "minimum interval per user".
const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

const FIELD =
  "w-full rounded-full border border-l-line bg-l-surface px-5 py-3 text-base text-l-text placeholder:text-l-placeholder focus:border-(--color-l-accent) focus:outline-none";
const PRIMARY =
  "w-full rounded-full bg-l-accent px-5 py-3 text-sm font-semibold text-l-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60";

/** What to say when Supabase turns a code down. */
function codeError(message: string): string {
  return /expired|invalid/i.test(message)
    ? "That code is wrong or has expired. Check it, or send a new one."
    : message;
}

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

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ready, loggedIn, studentReady, varsityReady, rollUniversity } = useAppState();
  const router = useRouter();

  /*
    Read on the SERVER as well (Next hands the page the query), so the first
    paint is already the right one: the team's door for an invite rather than
    a blue UNIsport page that turns crimson a moment later, and Sign up already
    picked for "Get started" rather than Log in flipping over.
  */
  const query = use(searchParams);
  const team = isInvitePath(typeof query.next === "string" ? query.next : null);

  const [supabase] = useState(() => (hasSupabaseEnv() ? createClient() : null));
  const [mode, setMode] = useState<Mode>(query.mode === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resendIn, setResendIn] = useState(0); // seconds until "Send a new code" works again
  /*
    A reset code SIGNS THE PERSON IN the moment it is accepted, before the new
    password is saved. Without this the redirect below would carry them into
    the app at that instant and the new password would never be set.
  */
  const [settingPassword, setSettingPassword] = useState(false);
  // The reset code is spent once accepted: if saving the password then fails
  // (too short, same as the old one), the retry must not send the code again.
  const [codeAccepted, setCodeAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (!ready || !loggedIn || settingPassword) return;
    /*
      An invite link sends people here as /login?next=/join/<code> so they land
      back on the invite once they're signed in. Read straight off the URL
      rather than with useSearchParams(), which would force this whole page
      into a Suspense boundary. Only same-site paths are honoured, so the
      parameter can't be used to bounce someone to another website.
    */
    const next = new URLSearchParams(window.location.search).get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    /*
      Where someone lands depends on which side of the app they have set up.
      A `next` always wins — it means they were part-way through something
      (almost always an invite link), and that page knows what to do with an
      account that isn't set up yet. Otherwise: the student app if they have it,
      Varsity Mode if that's the only side they did, and the student onboarding
      only for someone who has neither.
    */
    if (safeNext) router.replace(safeNext);
    else if (studentReady) router.replace("/match");
    else if (varsityReady) router.replace(VARSITY_HOME);
    else router.replace("/onboarding");
  }, [ready, loggedIn, studentReady, varsityReady, router, settingPassword]);

  /*
    "Get started with .edu" is a promise to a NEW student, so every button that
    says it arrives as /login?mode=signup and the page opens on Sign up (the
    `mode` state above). Until 2026-09-10 it opened on Log in for everyone —
    "Welcome back — log in to your account." to a person who has never been
    here (website review). The bar's "Log in" link still comes in plain and
    gets the log-in form.
  */

  // Prefill the email from the last sign-in on this device (password never is).
  useEffect(() => {
    const saved = readRememberedEmail();
    if (saved) setEmail((current) => current || saved);
  }, []);

  // Show a clear message if a Google sign-in bounced back with an error.
  // "university" is not a failure — the sign-in worked and was then refused
  // because the address isn't a university one, so it needs its own wording.
  useEffect(() => {
    const why = new URLSearchParams(window.location.search).get("auth_error");
    if (!why) return;
    setError(
      why === "university"
        ? UNIVERSITY_EMAIL_MESSAGE
        : "That sign-in didn't work. Please try again (or use email + password).",
    );
  }, []);

  /*
    What every successful sign-in sets off, wherever it came from: leave the
    note that makes the welcome animation play on the first screen inside, and
    roll the demo school — which only shows for an address we don't recognise,
    and is ignored the moment someone signs in with a real university one.
  */
  const onSignedIn = () => {
    markSignIn();
    rollUniversity();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      /*
        The hero button says "Get started with .edu" and the FAQ says students
        sign up with their university email — so a new account has to be one.
        Checked on SIGN UP only: an address that already has an account keeps
        working whatever it is (lib/universityEmail.ts explains why).
      */
      if (!isUniversityEmail(email)) {
        setLoading(false);
        setError(UNIVERSITY_EMAIL_MESSAGE);
        return;
      }
      /*
        With "Confirm email" on in Supabase this creates the account WITHOUT a
        session and emails a code ({{ .Token }} in the "Confirm signup"
        template), which the verify step below takes. emailRedirectTo is only
        for a template that still carries a link: it comes back through
        /auth/callback instead of Supabase's default page.
      */
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
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
      // wait on the code screen for a mail that never arrives.
      const alreadyRegistered =
        !data.session && !!data.user && (data.user.identities?.length ?? 0) === 0;
      if (alreadyRegistered) {
        setError("An account with that email already exists — switch to “Log in”.");
        return;
      }

      if (data.session) {
        // "Confirm email" is off in Supabase: the account works straight away.
        onSignedIn();
      } else {
        openCodeStep("verify");
      }
      // A session → the redirect effect handles routing.
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        if (/invalid login credentials/i.test(error.message)) {
          setError("Wrong email or password. New here? Switch to “Sign up”.");
        } else if (/email not confirmed/i.test(error.message)) {
          /*
            Signed up but never typed the code (closed the app, lost the
            mail): send a fresh one and take them to the code box, rather
            than a dead end.
          */
          await supabase.auth.resend({ type: "signup", email });
          openCodeStep("verify");
        } else {
          setError(error.message);
        }
        return;
      }
      // Success → the first screen on the other side greets them with their
      // university (components/SchoolIntro.tsx), then remember the email (only)
      // so this device prefills it next time; the redirect effect does the rest.
      onSignedIn();
      rememberEmail();
    }
  };

  const rememberEmail = () => {
    try {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email }));
    } catch {
      /* storage unavailable (e.g. private mode) — the prefill just won't appear */
    }
  };

  // A code has just been emailed: show its box, empty, with "Send a new code"
  // resting for as long as Supabase would refuse another one anyway.
  const openCodeStep = (next: "verify" | "reset") => {
    setStep(next);
    setCode("");
    setNewPassword("");
    setCodeAccepted(false);
    setError(null);
    setResendIn(RESEND_SECONDS);
  };

  const resendCode = async () => {
    if (!supabase || resendIn > 0) return;
    setError(null);
    const { error } =
      step === "verify"
        ? await supabase.auth.resend({ type: "signup", email })
        : await supabase.auth.resetPasswordForEmail(email);
    if (error) setError(error.message);
    else setResendIn(RESEND_SECONDS);
  };

  // The sign-up code. Accepting it confirms the address AND signs them in, so
  // the redirect effect then carries them on (to onboarding, or to `?next=`).
  const verifySignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
    setLoading(false);
    if (error) {
      setError(codeError(error.message));
      return;
    }
    onSignedIn();
    rememberEmail();
  };

  const sendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    // Answers the same whether or not the address has an account (Supabase
    // won't say who is registered), so the code step always follows.
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    openCodeStep("reset");
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    setSettingPassword(true);
    if (!codeAccepted) {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
      if (error) {
        setLoading(false);
        setSettingPassword(false);
        setError(codeError(error.message));
        return;
      }
      setCodeAccepted(true);
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      // Signed in by the code but the password wasn't taken: stay here so
      // they can choose another one.
      setError(error.message);
      return;
    }
    onSignedIn();
    rememberEmail();
    setSettingPassword(false); // → the redirect effect takes them in
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setError(null);
    /*
      Left BEFORE the call, not after: signInWithOAuth navigates away from this
      page, so anything after it may never run. Taken back if the call refuses
      to start, which is the only way we are still here to do it.
    */
    onSignedIn();
    /*
      Came from an invite (?next=/join/<code>)? Google's round trip would drop
      it and land a new rower in the student onboarding, so leave it for
      /auth/callback in a short cookie (lib/signInNext.ts says why not the URL).
    */
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      document.cookie = `${NEXT_AFTER_SIGN_IN_COOKIE}=${encodeURIComponent(next)}; Max-Age=${NEXT_AFTER_SIGN_IN_MAX_AGE}; Path=/; SameSite=Lax`;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      clearSignIn();
      document.cookie = `${NEXT_AFTER_SIGN_IN_COOKIE}=; Max-Age=0; Path=/`;
      setError(error.message);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setStep("form");
  };

  // Back out of a code screen. Past an accepted reset code they are already
  // signed in, so letting go of the hold carries them into the app.
  const backToForm = () => {
    setStep("form");
    setError(null);
    setSettingPassword(false);
  };

  const isSignup = mode === "signup";

  /*
    The school the typed address belongs to, if we know it. Shown as a quiet
    line of TEXT and nothing more: this screen is still Zone 1, where no
    university colour is allowed (rule 2). The colours arrive on the other side
    of the sign-in, where they belong.

    While the app is pinned to one school (LIVE_UNIVERSITY in lib/themes.ts)
    this only confirms THAT school. A yale.edu address would otherwise be told
    "✓ Yale University" and then land in a Harvard app — a promise the sign-in
    cannot keep.
  */
  const typedSchool = universityForEmail(email);
  const school =
    LIVE_UNIVERSITY && typedSchool?.key !== LIVE_UNIVERSITY ? undefined : typedSchool;

  const page = (
    <div
      className={`${instrumentSerif.variable} flex min-h-dvh flex-col items-center justify-center bg-l-bg px-6 text-center font-sans text-l-text`}
    >
      <div className="w-full max-w-sm">
        {/* On a team's door the product name steps down and the team's mark
            sits under it, the same as on the invite this came from. */}
        <Link
          href="/"
          className="mb-8 inline-block"
        >
          <Wordmark
            className={team ? "text-2xl" : "text-5xl"}
            accentClassName={team ? "text-l-varsity" : undefined}
          />
        </Link>
        {team && <TeamMark />}

        {/* The heading says which door this is — and nothing under it (owner,
            2026-09-19: the "university email… which campus" line is cut). */}
        <h1 className="font-display text-3xl text-l-text">
          {step === "verify"
            ? "Check your email"
            : step !== "form"
              ? "Reset your password"
              : isSignup
                ? "Create your account"
                : "Welcome back"}
        </h1>

        {!hasSupabaseEnv() ? (
          <p className="mt-8 rounded-xl border border-l-line bg-l-surface px-4 py-3 text-sm text-l-text-2">
            Sign-in isn&apos;t configured in this environment yet.
          </p>
        ) : step === "forgot" ? (
          <div className="mt-7">
            <form onSubmit={sendResetCode} className="flex flex-col gap-2.5">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                aria-label="Email"
                className={FIELD}
              />
              <button type="submit" disabled={loading} className={PRIMARY}>
                {loading ? "Please wait…" : "Send code"}
              </button>
            </form>
            {error && <p className="mt-3 text-xs text-l-danger">{error}</p>}
            <button
              type="button"
              onClick={backToForm}
              className="tap44 mt-4 text-xs font-medium text-l-text-2"
            >
              Back
            </button>
          </div>
        ) : step !== "form" ? (
          <div className="mt-7">
            <p className="mb-4 text-sm text-l-text-2">
              Code sent to <span className="text-l-text">{email}</span>
            </p>
            <form
              onSubmit={step === "verify" ? verifySignUp : resetPassword}
              className="flex flex-col gap-2.5"
            >
              {/* Spent once accepted — a failed new password only asks for
                  another password. */}
              {!codeAccepted && (
                <input
                  required
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern={`\\d{${CODE_LENGTH}}`}
                  value={code}
                  // Digits only, so a code pasted as "123 456" still fits.
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
                  placeholder={`${CODE_LENGTH}-digit code`}
                  aria-label="Code from the email"
                  className="w-full rounded-full border border-l-line bg-l-surface px-5 py-3 text-center text-xl font-semibold tracking-[0.3em] text-l-text placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-l-placeholder focus:border-(--color-l-accent) focus:outline-none"
                />
              )}
              {step === "reset" && (
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (6+ characters)"
                  aria-label="New password"
                  className={FIELD}
                />
              )}
              <button type="submit" disabled={loading} className={PRIMARY}>
                {loading ? "Please wait…" : step === "verify" ? "Confirm" : "Set new password"}
              </button>
            </form>
            {error && <p className="mt-3 text-xs text-l-danger">{error}</p>}
            <div className="mt-4 flex items-center justify-center gap-6 text-xs font-medium">
              {!codeAccepted && (
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={resendIn > 0}
                  className="tap44 text-l-accent disabled:text-l-text-2"
                >
                  {resendIn > 0 ? `Send a new code (${resendIn}s)` : "Send a new code"}
                </button>
              )}
              <button type="button" onClick={backToForm} className="tap44 text-l-text-2">
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-7">
            {/* Log in / Sign up toggle. DARK ink on the blue, here and on the
                submit button below: the page's white text on l-accent measured
                2.75:1 (website review, 2026-09-10) — the same light-on-blue the
                landing's own primary button gave up on 2026-08-18 for the same
                reason. l-bg on l-accent is 7.2:1. */}
            <div className="mb-4 flex rounded-full border border-l-line bg-l-surface p-1 text-sm font-medium">
              <button
                onClick={() => switchMode("login")}
                className={`tap44 flex-1 rounded-full py-2 transition-colors ${
                  !isSignup ? "bg-l-accent text-l-accent-ink" : "text-l-text-2"
                }`}
              >
                Log in
              </button>
              <button
                onClick={() => switchMode("signup")}
                className={`tap44 flex-1 rounded-full py-2 transition-colors ${
                  isSignup ? "bg-l-accent text-l-accent-ink" : "text-l-text-2"
                }`}
              >
                Sign up
              </button>
            </div>


            <form onSubmit={submit} className="flex flex-col gap-2.5">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                aria-label="Email"
                className={FIELD}
              />
              {/* Recognised the address → say so, so nobody wonders whether
                  the app knows where they study. */}
              {school && (
                <p className="-mb-0.5 px-5 text-left text-[11px] text-l-text-2">
                  <span className="text-l-success">✓</span> {school.name}
                </p>
              )}
              <input
                type="password"
                required
                minLength={6}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? "Choose a password (6+ characters)" : "Password"}
                aria-label="Password"
                className={FIELD}
              />
              {!isSignup && (
                <button
                  type="button"
                  onClick={() => {
                    setStep("forgot");
                    setError(null);
                  }}
                  className="tap44 -mt-0.5 self-end px-5 text-xs font-medium text-l-text-2"
                >
                  Forgot password?
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className={PRIMARY}
              >
                {loading ? "Please wait…" : isSignup ? "Create account" : "Log in"}
              </button>
            </form>

            <div className="my-3 flex items-center gap-3 text-[11px] text-l-text-2">
              <span className="h-px flex-1 bg-l-line" />
              or
              <span className="h-px flex-1 bg-l-line" />
            </div>

            <button
              onClick={signInWithGoogle}
              className="w-full rounded-full border border-l-line bg-l-surface px-5 py-3 text-sm font-medium text-l-text"
            >
              Continue with Google
            </button>

            {error && <p className="mt-3 text-xs text-l-danger">{error}</p>}
          </div>
        )}

        {/* Already on the way to a team — no need to point at the team door. */}
        {!team && step === "form" && (
          <p className="mt-4 text-xs text-l-text-2">
            Varsity athlete?{" "}
            <Link href="/join" className="tap44 inline-block font-medium text-l-varsity">
              Join your team →
            </Link>
          </p>
        )}
      </div>
    </div>
  );

  return team ? <TeamDoor>{page}</TeamDoor> : page;
}

"use client";

/*
  WAITLIST (Zone 1) — where the Instagram bio link points.

  One screen, two fields, and a done state. It is deliberately NOT the landing
  page: somebody arriving from a 15-second video has already been sold, and a
  scrolling marketing page between them and the box is where they are lost.

  A school address is then checked with the 6-digit code sign-up sends
  (owner, 2026-10-15). Accepting it makes their UNIsport account, with no
  password yet: they finish the account a week before opening, and wait
  behind the door (app/opening) until the morning it opens. Any other address
  is written down without a code, as before.

  The copy and the rules are in lib/waitlist.ts; the row it writes is
  db/waitlist.sql; the follow link at the end reads the same socials list the
  Contact section draws from, so it exists only while the account does.

  Zone 1 styling (`l-*` tokens): a stranger lands here having never signed in,
  so neutral brand only — no university colours.
*/
import { useEffect, useState } from "react";
import Link from "next/link";
import JoinShell from "@/components/join/JoinShell";
import { getsCode, looksLikeEmail, waitlist } from "@/lib/waitlist";
import { contact } from "@/lib/landingCopy";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { CODE_LENGTH, RESEND_SECONDS, codeError } from "@/lib/emailCode";

const instagram = contact.socials.find((s) => s.icon === "instagram" && s.href);

export default function WaitlistPage() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "code" | "confirming" | "done">("idle");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0); // seconds until "Send a new code" works again
  const [supabase] = useState(() => (hasSupabaseEnv() ? createClient() : null));
  const [error, setError] = useState<string | null>(null);
  // Whether the message is about the email box, which then shows it too.
  const [emailBad, setEmailBad] = useState(false);
  // Which link they came through, read off ?from= after mount for the same
  // reason as /join: the URL only exists in the browser, and useSearchParams
  // would force a Suspense boundary around the whole screen.
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setSource(new URLSearchParams(window.location.search).get("from"));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  /* The code. A new address gets the "Confirm sign up" email and an account
     with no password; an address that already has an account gets the
     "Magic link" email. Either way the code below accepts it (type "email"). */
  async function sendCode(): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    if (error) {
      console.error("waitlist code:", error.message);
      setError(waitlist.errorSend);
      return false;
    }
    setResendIn(RESEND_SECONDS);
    return true;
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || state === "confirming") return;
    if (code.length < CODE_LENGTH) {
      setError(codeError("invalid"));
      return;
    }
    setState("confirming");
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
    if (error) {
      setError(codeError(error.message));
      setState("code");
      return;
    }
    setState("done");
  }

  async function resend() {
    if (resendIn > 0) return;
    setError(null);
    await sendCode();
  }

  function back() {
    setState("idle");
    setCode("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    /* The same two checks the server makes, answered here first, so an empty
       or half-typed box gets its own message without a round trip. */
    if (!email.trim()) {
      setError(waitlist.errorEmpty);
      setEmailBad(true);
      return;
    }
    if (!looksLikeEmail(email)) {
      setError(waitlist.errorEmail);
      setEmailBad(true);
      return;
    }
    setState("sending");
    setError(null);
    setEmailBad(false);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, source }),
      });
      if (res.ok) {
        if (supabase && getsCode(email)) {
          if (await sendCode()) {
            setCode("");
            setState("code");
          } else {
            setState("idle");
          }
          return;
        }
        setState("done");
        return;
      }
      const body = await res.json().catch(() => ({}));
      const bad = body?.error === "bad_email";
      setError(bad ? waitlist.errorEmail : waitlist.errorGeneric);
      setEmailBad(bad);
      setState("idle");
    } catch {
      setError(waitlist.errorGeneric);
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <JoinShell accent="brand" markClassName="text-5xl">
        <h1 className="font-display text-3xl text-l-text">{waitlist.doneHeadline}</h1>
        <p className="mt-3 text-sm leading-relaxed text-l-text-2">{waitlist.doneBody}</p>
        {instagram && (
          <a
            href={instagram.href!}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-block w-full rounded-full border border-l-line px-5 py-3 text-sm font-medium text-l-text"
          >
            {waitlist.doneFollow}, {instagram.handle}
          </a>
        )}
      </JoinShell>
    );
  }

  if (state === "code" || state === "confirming") {
    return (
      <JoinShell accent="brand" markClassName="text-5xl">
        <h1 className="font-display text-3xl text-l-text">{waitlist.codeHeadline}</h1>
        <p className="mt-3 text-sm text-l-text-2">
          {waitlist.codeSentTo} <span className="text-l-text">{email.trim()}</span>
        </p>
        <form onSubmit={confirm} noValidate className="mt-7 text-left">
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            // Digits only, so a code pasted as "123 456" still fits.
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
            placeholder={`${CODE_LENGTH}-digit code`}
            aria-label="Code from the email"
            aria-describedby={error ? "waitlist-error" : undefined}
            className="w-full rounded-xl border border-l-line bg-l-surface px-4 py-3 text-center text-xl font-semibold tracking-[0.3em] text-l-text placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-l-placeholder focus:border-(--color-l-accent-soft) focus:outline-none"
          />
          <button
            type="submit"
            disabled={state === "confirming"}
            className="mt-4 w-full rounded-full bg-l-accent px-5 py-3 text-sm font-semibold text-l-bg disabled:opacity-40"
          >
            {state === "confirming" ? waitlist.confirming : waitlist.confirm}
          </button>
          {error && (
            <p id="waitlist-error" role="alert" className="mt-3 text-center text-xs text-l-danger">
              {error}
            </p>
          )}
        </form>
        <div className="mt-4 flex items-center justify-center gap-6 text-xs font-medium">
          <button
            type="button"
            onClick={resend}
            disabled={resendIn > 0}
            className="tap44 text-l-accent disabled:text-l-text-2"
          >
            {resendIn > 0 ? `${waitlist.resend} (${resendIn}s)` : waitlist.resend}
          </button>
          <button type="button" onClick={back} className="tap44 text-l-text-2">
            {waitlist.back}
          </button>
        </div>
      </JoinShell>
    );
  }

  return (
    <JoinShell accent="brand" markClassName="text-5xl">
      <h1 className="font-display text-3xl text-l-text">{waitlist.headline}</h1>
      <p className="mt-3 text-sm leading-relaxed text-balance text-l-text-2">{waitlist.body}</p>

      {/* noValidate: type="email" is here for the phone keyboard, but the
          browser's own validation bubble would speak before our one message
          could, in its own wording. One voice. */}
      <form onSubmit={submit} noValidate className="mt-7 text-left">
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder={waitlist.firstNameLabel}
          aria-label={waitlist.firstNameLabel}
          autoComplete="given-name"
          /* text-base keeps phones from zooming the whole page on focus */
          className="w-full rounded-xl border border-l-line bg-l-surface px-4 py-3 text-base text-l-text placeholder:text-l-placeholder focus:border-(--color-l-accent-soft) focus:outline-none"
        />
        <input
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            // The red edge was about what was typed before; it goes as they fix it.
            if (emailBad) setEmailBad(false);
          }}
          placeholder={waitlist.emailPlaceholder}
          aria-label={waitlist.emailLabel}
          aria-invalid={emailBad || undefined}
          aria-describedby={error ? "waitlist-error" : undefined}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={`mt-3 w-full rounded-xl border bg-l-surface px-4 py-3 text-base text-l-text placeholder:text-l-placeholder focus:outline-none ${
            emailBad ? "border-(--color-l-danger)" : "border-l-line focus:border-(--color-l-accent-soft)"
          }`}
        />
        <button
          type="submit"
          /* Never disabled on an empty box: a pale, dead primary button is the
             first thing somebody off Instagram sees. It answers instead. */
          disabled={state === "sending"}
          className="mt-4 w-full rounded-full bg-l-accent px-5 py-3 text-sm font-semibold text-l-bg disabled:opacity-40"
        >
          {state === "sending" ? waitlist.submitting : waitlist.submit}
        </button>
        {/* The login screen's treatment (launch audit 2026-09-27, item 43):
            the danger colour, and the box it is about in the same red. */}
        {error && (
          <p id="waitlist-error" role="alert" className="mt-3 text-center text-xs text-l-danger">
            {error}
          </p>
        )}
        <p className="mt-2 text-center">
          <Link
            href={waitlist.privacyHref}
            className="tap44 inline-flex items-center text-xs text-l-text-2 underline-offset-4 hover:text-l-text hover:underline"
          >
            {waitlist.privacy}
          </Link>
        </p>
      </form>
    </JoinShell>
  );
}

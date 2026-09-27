"use client";

/*
  WAITLIST (Zone 1) — where the Instagram bio link points.

  One screen, two fields, and a done state. It is deliberately NOT the landing
  page: somebody arriving from a 15-second video has already been sold, and a
  scrolling marketing page between them and the box is where they are lost.

  The copy and the rules are in lib/waitlist.ts; the row it writes is
  db/waitlist.sql; the follow link at the end reads the same socials list the
  Contact section draws from, so it exists only while the account does.

  Zone 1 styling (`l-*` tokens): a stranger lands here having never signed in,
  so neutral brand only — no university colours.
*/
import { useEffect, useState } from "react";
import Link from "next/link";
import JoinShell from "@/components/join/JoinShell";
import { looksLikeEmail, waitlist } from "@/lib/waitlist";
import { contact } from "@/lib/landingCopy";

const instagram = contact.socials.find((s) => s.icon === "instagram" && s.href);

export default function WaitlistPage() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
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
            {waitlist.doneFollow} — {instagram.handle}
          </a>
        )}
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

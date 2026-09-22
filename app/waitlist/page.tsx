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
import JoinShell from "@/components/join/JoinShell";
import { waitlist } from "@/lib/waitlist";
import { contact } from "@/lib/landingCopy";

const instagram = contact.socials.find((s) => s.icon === "instagram" && s.href);

export default function WaitlistPage() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
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
    setState("sending");
    setError(null);
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
      setError(body?.error === "bad_email" ? waitlist.errorEmail : waitlist.errorGeneric);
      setState("idle");
    } catch {
      setError(waitlist.errorGeneric);
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <JoinShell badge={waitlist.badge} accent="brand">
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
    <JoinShell badge={waitlist.badge} accent="brand">
      <h1 className="font-display text-3xl text-l-text">{waitlist.headline}</h1>
      <p className="mt-3 text-sm leading-relaxed text-l-text-2">{waitlist.body}</p>

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
          className="w-full rounded-xl border border-l-line bg-l-surface px-4 py-3 text-base text-l-text placeholder:text-l-text-3 focus:border-(--color-l-accent-soft) focus:outline-none"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={waitlist.emailPlaceholder}
          aria-label={waitlist.emailLabel}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="mt-3 w-full rounded-xl border border-l-line bg-l-surface px-4 py-3 text-base text-l-text placeholder:text-l-text-3 focus:border-(--color-l-accent-soft) focus:outline-none"
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
        {error && (
          <p role="alert" className="mt-3 text-center text-xs text-l-text-2">
            {error}
          </p>
        )}
      </form>
    </JoinShell>
  );
}

"use client";

/*
  THE LAST RESORT. When a client component throws and nothing else catches it,
  React unmounts the whole tree — and without this file the visitor is left
  looking at an empty page. On a dark theme that is a black screen, which is
  exactly what the app was reported as doing on a phone: no message, no way
  back, nothing to tell anyone what went wrong.

  It cannot use the app's theme tokens or fonts: global-error replaces the root
  layout, so it renders its own <html> and <body> and every colour here has to
  be a literal. This is the one place in the app where that is true, and it is
  why rule 1 does not reach it — there is no stylesheet at this point to read a
  variable from.

  The digest is Next's own id for the error, and it is the one thing that makes
  a screenshot of this useful.
*/
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 32,
          textAlign: "center",
          background: "#0b0b0c",
          color: "#f4f4f5",
          font: "500 14px/1.6 system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 600 }}>Something broke.</div>
        <p style={{ margin: 0, maxWidth: 320, color: "#a1a1aa" }}>
          The app hit an error it couldn&apos;t recover from. Reloading usually fixes
          it. If it keeps happening, a screenshot of this screen tells us exactly
          what went wrong.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "#f4f4f5",
              color: "#0b0b0c",
              font: "600 13px system-ui, sans-serif",
            }}
          >
            Try again
          </button>
          {/* A real page load, not <Link>: the router is part of what just
              broke, so a client-side navigation is the last thing to trust. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid #3f3f46",
              color: "#f4f4f5",
              textDecoration: "none",
              font: "600 13px system-ui, sans-serif",
            }}
          >
            Back to start
          </a>
        </div>
        {/* Small, grey, and the only part worth photographing. */}
        <code style={{ fontSize: 11, color: "#71717a", wordBreak: "break-word", maxWidth: 320 }}>
          {error.digest ? `ref ${error.digest} · ` : ""}
          {error.message}
        </code>
      </body>
    </html>
  );
}

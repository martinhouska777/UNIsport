/*
  WHY A SAVE FAILED — read off the error, never guessed.
  ---------------------------------------------------------------------------
  A failed write used to say whatever the screen assumed: the race board told a
  coach at the dock "only a coach can write times" when the real problem was
  one bar of signal (audit, 2026-09-27). The Supabase client already says which
  it was, so this only reads it:

    • offline   — the request never reached the server. supabase-js answers a
                  fetch that threw with status 0, and the browser itself may
                  know it is offline.
    • signedOut — the server did not accept the session (401, or PostgREST's
                  JWT errors, PGRST30x).
    • denied    — the server refused this write for this account: row-level
                  security (42501) or a 403.
    • failed    — anything else. Said as "Not saved" and nothing more, because
                  nothing more is known.
*/
export type SaveFailure = "offline" | "signedOut" | "denied" | "failed";

type ErrorLike = { code?: string | null; message?: string | null } | null | undefined;

export function saveFailureOf(error: ErrorLike, status?: number | null): SaveFailure {
  if (status === 0) return "offline";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  const code = error?.code ?? "";
  if (status === 401 || /^PGRST30\d$/.test(code)) return "signedOut";
  if (status === 403 || code === "42501") return "denied";
  return "failed";
}

/*
  The words after "Not saved", or null for nothing. `denied` is the caller's,
  because only the screen knows who IS allowed ("only a coach can write
  times"). Kept to a few words: this is an error the person can act on, not a
  caption.
*/
export function saveFailureDetail(kind: SaveFailure, denied = "not allowed"): string | null {
  switch (kind) {
    case "offline":
      return "no connection";
    case "signedOut":
      return "signed out — sign in again";
    case "denied":
      return denied;
    default:
      return null;
  }
}

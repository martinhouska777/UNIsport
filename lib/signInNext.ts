/*
  WHERE TO GO AFTER A GOOGLE SIGN-IN — carried in a short cookie.

  The sign-in page reads `?next=` (an invite link sends people there as
  /login?next=/join/<code>) and honours it after an email + password sign-in.
  Google is a round trip through another website, and the return address it
  is given is the bare /auth/callback: putting `?next=` on it would have to
  match Supabase's list of allowed return addresses exactly, and a miss there
  breaks every Google sign-in, not just invites. So the page leaves the path
  in this cookie just before leaving, and /auth/callback reads it, uses it,
  and deletes it. Ten minutes is plenty for a Google sign-in and short enough
  that a sign-in abandoned today can't steer one tomorrow.

  The callback applies the same same-site-path rule to it as to `?next=`.
*/
export const NEXT_AFTER_SIGN_IN_COOKIE = "unisport_next";
export const NEXT_AFTER_SIGN_IN_MAX_AGE = 600; // seconds

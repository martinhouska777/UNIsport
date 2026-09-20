-- ---------------------------------------------------------------------------
-- push_forget IS THE SERVER'S JOB, NOT A USER'S                   2026-09-20
-- ---------------------------------------------------------------------------
-- Run this once in the Supabase SQL editor.
--
-- WHY. `push_forget(text[])` deletes push subscriptions by endpoint, with no
-- check that they belong to the caller — it cannot have one, because the whole
-- point is that the SENDER of a notification cleans up the RECIPIENT's dead
-- phone. It was granted to `authenticated`, so any signed-in user could call it
-- directly with someone else's endpoints and silently switch off that person's
-- notifications. They would get no warning and no way to work out why their
-- notifications had stopped.
--
-- WHAT CHANGED IN THE APP (already deployed). app/api/push/notify no longer
-- calls this function. It does the same delete with the SERVICE-ROLE key, on
-- endpoints the push service itself just reported as dead (404/410). A person
-- removing their OWN device never used this function: that goes through
-- row-level security on push_subscriptions and is untouched.
--
-- SO THIS SCRIPT only takes the door away. Nothing in the app calls it any
-- more; the function is left in place (rather than dropped) so an older
-- deployment still mid-rollout degrades to "the tidy-up didn't happen", which
-- costs one wasted send, instead of erroring.
-- ---------------------------------------------------------------------------

revoke execute on function public.push_forget(text[]) from authenticated, anon, public;
grant  execute on function public.push_forget(text[]) to service_role;

-- ---------------------------------------------------------------------------
-- CHECK AFTERWARDS
--   1. Signed in as an ordinary user, calling it must fail:
--        POST {url}/rest/v1/rpc/push_forget  {"endpoints":["x"]}
--      -> 401 / "permission denied for function push_forget"
--   2. Notifications must still work end to end: send yourself a DM from a
--      second account and check the phone buzzes. (The tidy-up only runs when
--      a device is already dead, so there is nothing visible to test there.)
-- ---------------------------------------------------------------------------

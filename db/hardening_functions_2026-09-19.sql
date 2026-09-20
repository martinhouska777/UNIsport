-- ---------------------------------------------------------------------------
-- LOCK THE DATABASE FUNCTIONS TO SIGNED-IN USERS                 2026-09-19
-- ---------------------------------------------------------------------------
-- NOT APPLIED YET. Run it in the Supabase SQL editor (see the memory note
-- "Running SQL in the Supabase editor") once the owner has said yes.
--
-- WHY. Postgres grants EXECUTE on every new function to PUBLIC, and the `anon`
-- role (the public key baked into the app, no login) inherits that. Every file
-- in db/ says "grant execute … to authenticated" but none of them takes the
-- default away, so the grant added nothing. Checked live on 2026-09-19 with
-- only the anon key and no session:
--
--   leaderboard_people   → 50 rows: user id, name, house, class year, points
--   leaderboard_groups   → 18 rows
--   channel_list         → every community channel with its LAST MESSAGE text
--   get_team_roster      → 126 rows: every onboarded person's id and name
--
-- Table reads are fine (row-level security answers []), the SECURITY DEFINER
-- functions were the hole: they run as their owner and skip RLS by design.
--
-- WHAT IT DOES. Every function in `public` becomes callable by signed-in users
-- and the server key only; the one function a signed-out visitor genuinely
-- needs (the invite page shows the team's name before sign-in) is handed back
-- to anon; and the default is changed so a function added next month starts
-- locked too.
--
-- WHAT IT DOES NOT TOUCH. Table and storage policies. Triggers (EXECUTE is not
-- checked when a trigger fires). Anything a signed-in user could already do.
-- ---------------------------------------------------------------------------

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
end $$;

-- The invite screen (/join/<code>) resolves the code to a team name BEFORE the
-- visitor signs in — db/varsity_teams.sql granted this one to anon on purpose.
grant execute on function public.varsity_invite_preview(text) to anon;

-- Functions created from now on start locked as well.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public grant execute on functions to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- CHECK AFTERWARDS (no login, anon key only) — all three must now answer 401:
--   POST {url}/rest/v1/rpc/leaderboard_people   {"board":"campus","period":"month"}
--   POST {url}/rest/v1/rpc/channel_list         {}
--   POST {url}/rest/v1/rpc/get_team_roster      {}
-- and this one must still answer 200 with a team name for a real code:
--   POST {url}/rest/v1/rpc/varsity_invite_preview {"code":"…"}
-- Then sign in and open Leaderboards, Messages › Community, and the coach's
-- Team tab: all three must still load.
-- ---------------------------------------------------------------------------
